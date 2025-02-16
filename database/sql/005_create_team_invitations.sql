create type invitation_status as enum ('pending', 'accepted', 'rejected', 'expired');

create table team_invitations (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade,
  inviter_id uuid references auth.users(id) on delete cascade,
  invitee_id uuid references auth.users(id) on delete cascade,
  status invitation_status not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '7 days') not null,
  unique(team_id, invitee_id, status)
);

-- RLS 정책
alter table team_invitations enable row level security;

-- 초대자(팀 리더/매니저)는 초대를 생성할 수 있다
create policy "팀 리더와 매니저는 초대를 생성할 수 있다"
  on team_invitations for insert
  with check (
    auth.uid() in (
      select user_id from team_members 
      where team_id = team_invitations.team_id 
      and status = 'active' 
      and role in ('leader', 'manager')
    )
  );

-- 초대받은 사람은 자신의 초대를 볼 수 있다
create policy "초대받은 사람은 자신의 초대를 볼 수 있다"
  on team_invitations for select
  using (
    auth.uid() = invitee_id
  );

-- 초대받은 사람은 자신의 초대 상태를 수정할 수 있다
create policy "초대받은 사람은 초대를 수락/거절할 수 있다"
  on team_invitations for update
  using (auth.uid() = invitee_id)
  with check (status in ('accepted', 'rejected'));

-- 팀 리더와 매니저는 팀의 모든 초대를 볼 수 있다
create policy "팀 리더와 매니저는 초대 목록을 볼 수 있다"
  on team_invitations for select
  using (
    auth.uid() in (
      select user_id from team_members 
      where team_id = team_invitations.team_id 
      and status = 'active' 
      and role in ('leader', 'manager')
    )
  );

-- 만료된 초대를 자동으로 처리하는 함수
create or replace function handle_expired_invitations()
returns trigger as $$
begin
  if new.status = 'pending' and new.expires_at < timezone('utc'::text, now()) then
    new.status = 'expired';
  end if;
  return new;
end;
$$ language plpgsql;

-- 만료 처리 트리거
create trigger check_invitation_expiry
  before insert or update on team_invitations
  for each row
  execute procedure handle_expired_invitations(); 