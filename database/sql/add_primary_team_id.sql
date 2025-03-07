-- profiles 테이블에 primary_team_id 필드 추가
ALTER TABLE profiles
ADD COLUMN primary_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX idx_profiles_primary_team_id ON profiles(primary_team_id);

-- 주석 추가
COMMENT ON COLUMN profiles.primary_team_id IS '사용자의 대표 클럽 ID'; 