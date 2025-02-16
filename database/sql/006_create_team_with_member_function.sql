-- 새 함수 생성
create or replace function create_team_with_member(
  team_name text,
  team_description text,
  team_emblem_url text,
  team_city text,
  team_gu text,
  team_leader_id uuid,
  member_user_id uuid
)
returns teams
language plpgsql
as $$
declare
  new_team teams;
begin
  -- teams 테이블에 insert
  insert into teams (name, description, emblem_url, city, gu, leader_id)
  values (team_name, team_description, team_emblem_url, team_city, team_gu, team_leader_id)
  returning * into new_team;

  -- team_members 테이블에 insert (RLS 정책 우회)
  insert into team_members (team_id, user_id, role, status)
  values (new_team.id, member_user_id, 'leader', 'active');

  return new_team;
end;
$$; 