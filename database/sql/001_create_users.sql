-- profiles 테이블 생성
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  user_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint username_length check (char_length(user_name) >= 3)
);

-- RLS 정책 설정
alter table profiles enable row level security;

create policy "프로필은 본인만 수정 가능" on profiles
  for update using (auth.uid() = id);

create policy "프로필은 누구나 조회 가능" on profiles
  for select using (true);

create policy "프로필은 본인만 삭제 가능" on profiles
  for delete using (auth.uid() = id);

create policy "인증된 사용자는 프로필 생성 가능" on profiles
  for insert with check (auth.uid() = id);

-- 프로필 자동 생성을 위한 함수
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_name)
  values (new.id, new.raw_user_meta_data->>'user_name');
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 생성
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 