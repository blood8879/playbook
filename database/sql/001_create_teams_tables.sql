------------------------------------------------------------------------------
-- 1) 이전 스키마 정리: 테이블/타입 모두 삭제 (CASCADE)
------------------------------------------------------------------------------
DROP TABLE IF EXISTS team_invites CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TYPE IF EXISTS team_role CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;


------------------------------------------------------------------------------
-- 2) 테이블 및 enum 타입 재생성
------------------------------------------------------------------------------

-- 2-1) teams 테이블
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) not null
);

-- 2-2) enum 타입 생성
create type team_role as enum ('admin', 'member');
create type member_status as enum ('active', 'inactive', 'pending');

-- 2-3) team_members 테이블
create table team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) not null,
  user_id uuid references auth.users(id) not null,
  role team_role default 'member' not null,
  status member_status default 'pending' not null,
  joined_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- (A) 팀 멤버인지 확인하는 함수
create or replace function is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer -- 이 함수는 함수 소유자의 권한으로 실행 (RLS 무시)
stable           -- 같은 입력에 항상 같은 결과
as $$
  select exists (
    select 1
    from team_members
    where team_id = p_team_id
      and user_id = p_user_id
  );
$$;

-- profiles 테이블과의 foreign key 관계 설정
alter table team_members drop constraint team_members_user_id_fkey;
alter table team_members
  add constraint team_members_user_id_fkey
  foreign key (user_id)
  references profiles(id)
  on delete cascade;

-- 2-4) team_invites 테이블
create table team_invites (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) not null,
  email text not null,
  invited_by uuid references auth.users(id) not null,
  expires_at timestamp with time zone default (now() + interval '7 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, email)
);


alter table team_invites drop constraint team_invites_team_id_fkey;
alter table team_invites drop constraint team_invites_invited_by_fkey;
alter table team_invites
  add constraint team_invites_team_id_fkey
  foreign key (team_id)
  references teams(id)
  on delete cascade;

alter table team_invites
  add constraint team_invites_invited_by_fkey
  foreign key (invited_by)
  references profiles(id)
  on delete cascade;

------------------------------------------------------------------------------
-- 3) RLS(행 수준 보안) 활성화
------------------------------------------------------------------------------

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;

------------------------------------------------------------------------------
-- 4) RLS 정책 설정
------------------------------------------------------------------------------

-- (A) teams 테이블 기본 정책
drop policy if exists "Teams access control" on teams;

-- for select (조회)에만 적용, 
-- 팀 생성자 or 초대받은 이메일
drop policy if exists "Teams select access" on teams;
create policy "Teams select access"
  on teams
  for select
  using (
    teams.created_by = auth.uid()
    or
    exists (
      select 1
      from team_invites
      where team_invites.team_id = teams.id
        and team_invites.email = auth.email()
    )
    or
    is_team_member(teams.id, auth.uid())
  );

-- (B) team_members 테이블 정책
drop policy if exists "Team members basic access" on team_members;
create policy "Team members basic access"
  on team_members
  for select
  using (
    -- "이 사용자가 team_members.team_id에 속해 있다"면 TRUE
    is_team_member(team_members.team_id, auth.uid())
  );

-- 팀 관리자를 위한 별도 정책
create policy "Team members admin access"
  on team_members
  for all
  using (
    exists (
      select 1
      from teams
      where id = team_members.team_id
        and created_by = auth.uid()
    )
  );

-- (C) team_invites 테이블 기본 정책
drop policy if exists "Team invites access control" on team_invites;

-- 초대를 접근할 수 있는 사람:
-- 1) 초대를 만든 사람 (invited_by = auth.uid()) 
-- 2) 초대받은 사람 (email = auth.email())
create policy "Team invites access control"
  on team_invites
  for all
  using (
    team_invites.invited_by = auth.uid()
    or
    team_invites.email = auth.email()
  );

-- team_members 테이블의 INSERT 정책 수정
drop policy if exists "Team members insertion" on team_members;
create policy "Team members insertion"
  on team_members
  for insert
  with check (
    -- 자신의 레코드만 추가 가능
    user_id = auth.uid()
    and
    -- 초대를 받은 사용자인 경우
    exists (
      select 1
      from team_invites ti
      join profiles p on p.id = auth.uid()
      where ti.team_id = team_members.team_id
        and ti.email = p.email
    )
  );

------------------------------------------------------------------------------
-- 5) 팀 생성 시 자동으로 관리자 추가를 위한 함수 & 트리거
------------------------------------------------------------------------------

create or replace function public.handle_team_creation()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role, status)
  values (new.id, new.created_by, 'admin'::team_role, 'active'::member_status);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_team_created
  after insert on teams
  for each row
  execute function public.handle_team_creation();
