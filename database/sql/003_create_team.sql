-- 팀 테이블
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) not null
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

-- teams 테이블 정책
create policy "팀 생성은 인증된 사용자만 가능" on teams
  for insert to authenticated
  with check (true);

create policy "팀 조회는 팀 멤버만 가능" on teams
  for select using (
    exists (
      select 1 from team_members tm
      where tm.team_id = id
      and tm.user_id = auth.uid()
    )
  );

create policy "팀 수정은 owner/admin만 가능" on teams
  for update using (
    exists (
      select 1 from team_members tm
      where tm.team_id = id
      and tm.user_id = auth.uid()
      and tm.role in ('owner', 'admin')
    )
  );

create policy "팀 삭제는 owner만 가능" on teams
  for delete using (
    exists (
      select 1 from team_members tm
      where tm.team_id = id
      and tm.user_id = auth.uid()
      and tm.role = 'owner'
    )
  );

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
