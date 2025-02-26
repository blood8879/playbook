-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 프로필 자동 생성 함수 업데이트
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name_value TEXT;
  name_value TEXT;
BEGIN
  -- user_name 값 설정
  user_name_value := new.raw_user_meta_data->>'user_name';
  
  -- name 값 설정 (user_name이 없으면 이메일 사용)
  name_value := COALESCE(
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'user_name', 
    split_part(new.email, '@', 1)
  );
  
  -- 디버깅 로그
  RAISE NOTICE 'Creating profile for user: %, email: %, name: %', new.id, new.email, name_value;
  
  -- 프로필 생성
  INSERT INTO public.profiles (
    id, 
    user_name, 
    name, 
    email, 
    avatar_url
  )
  VALUES (
    new.id, 
    user_name_value, 
    name_value, 
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating profile: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 트리거 생성
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 사용자 중 프로필이 없는 사용자를 위한 프로필 생성
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.profiles (
        id, 
        user_name, 
        name, 
        email, 
        avatar_url
      )
      VALUES (
        user_record.id, 
        user_record.raw_user_meta_data->>'user_name', 
        COALESCE(
          user_record.raw_user_meta_data->>'name', 
          user_record.raw_user_meta_data->>'user_name', 
          split_part(user_record.email, '@', 1)
        ), 
        user_record.email,
        user_record.raw_user_meta_data->>'avatar_url'
      );
      RAISE NOTICE 'Created profile for existing user: %', user_record.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$; 