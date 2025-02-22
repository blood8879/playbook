-- 게스트 팀 테이블 생성
CREATE TABLE guest_clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, name)
);

-- 경기 테이블 생성
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  opponent_team_id UUID REFERENCES teams(id),
  opponent_guest_team_id UUID REFERENCES guest_clubs(id),
  is_tbd BOOLEAN DEFAULT false NOT NULL,
  venue TEXT NOT NULL,
  description TEXT,
  competition_type TEXT CHECK (competition_type IN ('friendly', 'league', 'cup')) NOT NULL,
  game_type TEXT CHECK (game_type IN ('5vs5', '6vs6', '11vs11')) NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  is_finished BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT opponent_team_check CHECK (
    (opponent_team_id IS NOT NULL AND opponent_guest_team_id IS NULL AND is_tbd = false) OR
    (opponent_team_id IS NULL AND opponent_guest_team_id IS NOT NULL AND is_tbd = false) OR
    (opponent_team_id IS NULL AND opponent_guest_team_id IS NULL AND is_tbd = true)
  )
);

-- RLS 정책 설정
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_clubs ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
CREATE POLICY "Matches are viewable by everyone" 
ON matches FOR SELECT 
USING (true);

CREATE POLICY "Guest clubs are viewable by team members" 
ON guest_clubs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = guest_clubs.team_id
    AND team_members.user_id = auth.uid()
  )
);

-- 팀 리더와 관리자만 생성/수정/삭제 가능
CREATE POLICY "Team leaders and admins can create matches" 
ON matches FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = matches.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Team leaders and admins can update matches" 
ON matches FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = matches.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Team leaders and admins can delete matches" 
ON matches FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = matches.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

-- 팀 리더와 관리자만 게스트 클럽 관리 가능
CREATE POLICY "Team leaders and admins can manage guest clubs"
ON guest_clubs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = guest_clubs.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.role IN ('owner', 'admin')
  )
);

-- 업데이트 트리거
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_guest_clubs_updated_at
  BEFORE UPDATE ON guest_clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 