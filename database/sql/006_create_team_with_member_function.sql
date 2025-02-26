-- <ai_context>
-- 새 함수 create_team_with_member()의 실제 시그니처가 RPC로 호출되는 형태와 맞도록 업데이트합니다.
-- </ai_context>

CREATE OR REPLACE FUNCTION create_team_with_member(
  team_name text,
  team_description text,
  team_emblem_url text,
  team_city text,
  team_gu text,
  team_leader_id uuid,
  member_user_id uuid
)
RETURNS teams
LANGUAGE plpgsql
AS $$
DECLARE
  new_team teams;
BEGIN
  -- teams 테이블 insert
  INSERT INTO teams (name, description, emblem_url, city, gu, leader_id)
  VALUES (team_name, team_description, team_emblem_url, team_city, team_gu, team_leader_id)
  RETURNING * INTO new_team;

  -- team_members 테이블 insert
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (new_team.id, member_user_id, 'owner');

  RETURN new_team;
END;
$$;