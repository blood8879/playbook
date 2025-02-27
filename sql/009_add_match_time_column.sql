-- matches 테이블에 match_time 컬럼 추가
ALTER TABLE matches
ADD COLUMN match_time VARCHAR(10);

-- 기존 데이터에 대한 기본값 설정 (선택 사항)
UPDATE matches
SET match_time = '14:00'
WHERE match_time IS NULL;

-- 설명 추가
COMMENT ON COLUMN matches.match_time IS '경기 시작 시간 (예: 14:00)'; 