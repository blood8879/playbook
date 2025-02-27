-- profiles 테이블에 name 필드 추가
ALTER TABLE profiles
ADD COLUMN name TEXT;

-- user_name 값을 name 필드로 복사
UPDATE profiles
SET name = user_name
WHERE name IS NULL AND user_name IS NOT NULL;

-- name 필드에 대한 설명 추가
COMMENT ON COLUMN profiles.name IS '사용자 이름';

-- 프로필 자동 생성 함수 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_name, name)
  VALUES (new.id, new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'user_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 