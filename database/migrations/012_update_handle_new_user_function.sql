-- handle_new_user 함수를 업데이트하여 email, name, avatar_url 필드를 자동으로 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    user_name, 
    name, 
    email, 
    avatar_url
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'user_name', 
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'user_name', new.email),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles 테이블에 email 필드 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    COMMENT ON COLUMN profiles.email IS '사용자 이메일';
  END IF;
END $$;

-- profiles 테이블에 avatar_url 필드 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    COMMENT ON COLUMN profiles.avatar_url IS '사용자 프로필 이미지 URL';
  END IF;
END $$;

-- 기존 사용자의 email 필드 업데이트
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- 트리거가 이미 존재하는지 확인하고, 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$; 