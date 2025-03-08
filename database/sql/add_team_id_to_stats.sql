-- match_goals 테이블에 team_id 열 추가
ALTER TABLE match_goals ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- match_assists 테이블에 team_id 열 추가
ALTER TABLE match_assists ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- match_mom 테이블에 team_id 열 추가
ALTER TABLE match_mom ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- 기존 데이터 업데이트를 위한 함수
-- match_goals 테이블 데이터 업데이트
CREATE OR REPLACE FUNCTION update_match_goals_team_id() RETURNS void AS $$
BEGIN
  UPDATE match_goals g
  SET team_id = (
    SELECT m.team_id
    FROM matches m
    WHERE m.id = g.match_id
  )
  WHERE g.team_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- match_assists 테이블 데이터 업데이트
CREATE OR REPLACE FUNCTION update_match_assists_team_id() RETURNS void AS $$
BEGIN
  UPDATE match_assists a
  SET team_id = (
    SELECT m.team_id
    FROM matches m
    WHERE m.id = a.match_id
  )
  WHERE a.team_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- match_mom 테이블 데이터 업데이트
CREATE OR REPLACE FUNCTION update_match_mom_team_id() RETURNS void AS $$
BEGIN
  UPDATE match_mom m
  SET team_id = (
    SELECT mt.team_id
    FROM matches mt
    WHERE mt.id = m.match_id
  )
  WHERE m.team_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 함수 실행
SELECT update_match_goals_team_id();
SELECT update_match_assists_team_id();
SELECT update_match_mom_team_id();

-- 함수 삭제 (필요한 경우에만)
DROP FUNCTION update_match_goals_team_id();
DROP FUNCTION update_match_assists_team_id();
DROP FUNCTION update_match_mom_team_id(); 