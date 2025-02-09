-- profiles 테이블 생성
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email varchar not null,
    username varchar,
    full_name varchar,
    avatar_url varchar,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint username_length check (char_length(username) >= 3)
);

-- RLS 정책 설정
alter table public.profiles enable row level security;

create policy "프로필은 본인만 수정 가능" on public.profiles
    for update using (auth.uid() = id);

create policy "프로필은 모두가 조회 가능" on public.profiles
    for select using (true);

create policy "프로필은 본인만 삭제 가능" on public.profiles
    for delete using (auth.uid() = id);

-- 자동으로 프로필 생성을 위한 함수
create function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, username, avatar_url)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$ language plpgsql security definer;

-- 트리거 생성
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 