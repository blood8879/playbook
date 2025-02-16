-- 팀 테이블

create table teams (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  emblem_url text,
  city text not null,
  gu text not null,
  leader_id uuid references auth.users(id) not null,
  unique(name)
);

-- 팀 멤버 테이블 (팀원 관리용)
create table team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'admin', 'member')) default 'member' not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- RLS (Row Level Security) 정책 설정
alter table teams enable row level security;
alter table team_members enable row level security;

-- 누구나 조회 가능
create policy "Teams are viewable by everyone" on teams
  for select using (true);

-- 인증된 사용자만 생성 가능  
create policy "Authenticated users can create teams" on teams
  for insert with check (auth.role() = 'authenticated');

-- 팀 리더만 수정/삭제 가능
create policy "Team leaders can update their teams" on teams
  for update using (auth.uid() = leader_id);

create policy "Team leaders can delete their teams" on teams
  for delete using (auth.uid() = leader_id);

-- team_members 테이블 정책
create policy "팀 멤버 추가는 owner/admin만 가능" on team_members
  for insert to authenticated
  with check (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
    or 
    user_id = auth.uid() -- 자신을 팀에 추가하는 것은 허용
  );

create policy "팀 멤버 조회는 같은 팀 멤버만 가능" on team_members
  for select using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_members.team_id
      and tm.user_id = auth.uid()
    )
  );

create policy "팀 멤버 수정은 owner/admin만 가능" on team_members
  for update using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
  );

create policy "팀 멤버 삭제는 owner/admin만 가능" on team_members
  for delete using (
    exists (
      select 1 from team_members tm
      where tm.team_id = team_id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
    or 
    auth.uid() = user_id -- 자신을 팀에서 제거하는 것은 허용
  );

-- 업데이트 트리거 함수
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 업데이트 트리거 생성
create trigger update_teams_updated_at
  before update on teams
  for each row
  execute function update_updated_at();

create trigger update_team_members_updated_at
  before update on team_members
  for each row
  execute function update_updated_at();

-- team_members RLS를 우회해, 특정 user가 특정 team의 멤버인지 확인하는 함수
create or replace function is_active_member(team uuid, "user" uuid)
returns boolean
security definer
as $$
  select exists(
    select 1 
    from team_members
    where team_id = team
      and user_id = "user"
      and status = 'active'
  );
$$ language sql stable;

-- 함수에 대해서는 PUBLIC이 실행할 권한을 부여
grant execute on function is_active_member(uuid, uuid) to public;