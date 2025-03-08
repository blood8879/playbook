-- match_attendance 테이블에 team_id 열 추가
ALTER TABLE match_attendance ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- 기존 데이터 업데이트를 위한 함수
CREATE OR REPLACE FUNCTION update_match_attendance_team_id() RETURNS void AS $$
BEGIN
  UPDATE match_attendance a
  SET team_id = (
    SELECT m.team_id
    FROM matches m
    WHERE m.id = a.match_id
  )
  WHERE a.team_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 함수 실행
SELECT update_match_attendance_team_id();

-- 함수 삭제 (필요한 경우에만)
DROP FUNCTION update_match_attendance_team_id(); 