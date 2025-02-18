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

-- 포지션 ENUM 타입 생성
CREATE TYPE player_position AS ENUM (
  'GK', 'DL', 'DC', 'DR', 
  'DMC', 'ML', 'MC', 'MR', 
  'AML', 'AMC', 'AMR', 'ST'
);

CREATE TABLE team_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID 
    REFERENCES auth.users(id) 
    NOT NULL,
  team_id UUID 
    REFERENCES teams(id) 
    NOT NULL,
  preferred_positions player_position[] NOT NULL,
  preferred_number INTEGER CHECK (preferred_number BETWEEN 1 AND 99),
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE 
    DEFAULT TIMEZONE('utc'::text, NOW()) 
    NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE 
    DEFAULT TIMEZONE('utc'::text, NOW()) 
    NOT NULL,
  UNIQUE(user_id, team_id, status)
);

ALTER TABLE team_members
  ADD COLUMN positions player_position[] NOT NULL DEFAULT '{}',
  ADD COLUMN number INTEGER 
    CHECK (number BETWEEN 1 AND 99),
  ADD CONSTRAINT unique_team_number 
    UNIQUE(team_id, number);

ALTER TABLE team_join_requests 
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own join requests"
ON team_join_requests
FOR SELECT
TO authenticated
USING (
  -- (A) 본인(user_id)인 경우
  auth.uid() = user_id
  OR
  -- (B) 팀의 leader/manager 인 경우
  EXISTS (
    SELECT 1 
    FROM team_members
    WHERE team_members.team_id = team_join_requests.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Users can create join requests"
ON team_join_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- 사용자(user_id)가 현재 로그인된 유저(auth.uid())와 동일해야 INSERT 가능
  auth.uid() = user_id
);

CREATE POLICY "Team leaders and managers can update join requests"
ON team_join_requests
FOR UPDATE
TO authenticated
USING (
  -- (A) '행을 찾아서' 업데이트할 수 있는 조건
  EXISTS (
    SELECT 1 
    FROM team_members
    WHERE team_members.team_id = team_join_requests.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('leader', 'manager')
  )
)
WITH CHECK (
  -- (B) '실제 UPDATE 반영' 조건
  EXISTS (
    SELECT 1 
    FROM team_members
    WHERE team_members.team_id = team_join_requests.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'manager')
  )
);
