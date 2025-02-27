-- matches 테이블에 is_home 필드 추가
ALTER TABLE matches ADD COLUMN is_home BOOLEAN DEFAULT true;

-- 기존 데이터에 대해 is_home 값을 true로 설정 (기본적으로 모든 경기를 홈 경기로 간주)
UPDATE matches SET is_home = true WHERE is_home IS NULL;

-- is_home 필드에 NOT NULL 제약 조건 추가
ALTER TABLE matches ALTER COLUMN is_home SET NOT NULL;

-- 설명 주석
COMMENT ON COLUMN matches.is_home IS '경기가 홈 경기인지 여부. true면 홈 경기, false면 원정 경기'; 