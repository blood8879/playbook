-- stadiums 테이블 생성
CREATE TABLE IF NOT EXISTS stadiums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 정책 설정
ALTER TABLE stadiums ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
CREATE POLICY "Stadiums are viewable by everyone" 
ON stadiums FOR SELECT 
USING (true);

-- 팀 리더와 관리자만 생성/수정/삭제 가능
CREATE POLICY "Team leaders and admins can manage stadiums"
ON stadiums
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = stadiums.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

-- 업데이트 트리거
CREATE TRIGGER update_stadiums_updated_at
  BEFORE UPDATE ON stadiums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- matches 테이블에 stadium_id 컬럼 추가
ALTER TABLE matches
ADD COLUMN stadium_id UUID REFERENCES stadiums(id);

-- 설명 추가
COMMENT ON COLUMN matches.stadium_id IS '경기장 ID (stadiums 테이블 참조)'; 