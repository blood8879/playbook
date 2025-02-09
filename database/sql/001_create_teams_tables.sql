-- teams 테이블
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) not null
);

-- team_members 테이블
create type team_role as enum ('admin', 'member');
create type member_status as enum ('active', 'inactive', 'pending');

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

-- profiles 테이블과의 foreign key 관계 설정
alter table team_members
  add constraint team_members_user_id_fkey
  foreign key (user_id)
  references profiles(id)
  on delete cascade;

-- team_invites 테이블
create table team_invites (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) not null,
  email text not null,
  invited_by uuid references auth.users(id) not null,
  expires_at timestamp with time zone default (now() + interval '7 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, email)
);

-- team_invites 테이블의 foreign key 관계 설정
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

-- RLS 정책 설정
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_invites enable row level security;

-- teams 테이블의 기본 정책
drop policy if exists "Teams access control" on teams;
create policy "Teams access control"
  on teams for all
  using (auth.uid() = created_by);

-- team_members 테이블의 기본 정책
drop policy if exists "Team members basic access" on team_members;
create policy "Team members basic access"
  on team_members for all
  using (
    user_id = auth.uid()
    or
    exists (
      select 1 from teams
      where id = team_members.team_id
      and created_by = auth.uid()
    )
  );

-- team_invites 테이블의 기본 정책
drop policy if exists "Team invites access control" on team_invites;
create policy "Team invites access control"
  on team_invites for all
  using (
    exists (
      select 1 from teams
      where id = team_invites.team_id
      and created_by = auth.uid()
    )
  );

-- 팀 생성 시 자동으로 관리자 추가를 위한 함수
create or replace function public.handle_team_creation()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role, status)
  values (new.id, new.created_by, 'admin'::team_role, 'active'::member_status);
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 생성
drop trigger if exists on_team_created on teams;
create trigger on_team_created
  after insert on teams
  for each row
  execute function handle_team_creation(); 