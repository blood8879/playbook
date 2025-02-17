-- 기존 team_members 테이블이 있다면 삭제
DROP TABLE IF EXISTS public.team_members;

-- team_members 테이블 생성
CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- RLS 정책 설정
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX team_members_user_id_idx ON public.team_members(user_id);

-- 업데이트 트리거 함수를 생성 (업데이트 시 updated_at 값을 갱신)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성 (수정 전에 update_modified_column 함수를 실행)
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- RLS 정책 (모두 제거)
-- alter table team_members enable row level security;

-- create policy "팀 멤버는 자신의 팀의 멤버 목록을 볼 수 있다"
--   on team_members for select
--   using (
--     auth.uid() in (
--       select user_id from team_members
--       where team_id = team_members.team_id
--       and status = 'active'
--     )
--   );

-- create policy "팀 리더와 매니저만 멤버를 관리할 수 있다"
--   on team_members for all
--   using (
--     auth.uid() in (
--       select user_id from team_members
--       where team_id = team_members.team_id
--       and status = 'active'
--       and role in ('leader', 'manager')
--     )
--   );

-- 트리거 함수
create or replace function handle_team_member_updated()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- 트리거
create trigger team_members_updated
  before update on team_members
  for each row
  execute procedure handle_team_member_updated(); 

CREATE POLICY "Allow invitees to insert themselves into team"
ON public.team_members
FOR INSERT
TO public
-- 이 행을 읽을 수 있는지 결정 (INSERT의 경우, “이 사용자가 INSERT를 수행할 수 있느냐”)
USING (
  auth.uid() = user_id
)
-- with check: 삽입되는 행이 유효한지 판단 (여기서는 “row.user_id가 auth.uid() 인가?”)
WITH CHECK (
  auth.uid() = user_id
);

create trigger team_leader_check
before insert on team_members -- replace with your actual table name
for each row execute procedure check_team_leader();

CREATE OR REPLACE FUNCTION check_team_leader()
RETURNS TRIGGER AS $$
BEGIN
  -- 초대받은 유저면 바로 삽입 허용
  IF EXISTS (
    SELECT 1 
    FROM team_invitations
    WHERE invitee_id = NEW.user_id
      AND team_id   = NEW.team_id
      AND status    = 'pending'
  ) THEN
    RETURN NEW;
  END IF;

  -- 아니면, 기존 로직처럼 owner/admin인지 확인
  IF NOT EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = NEW.user_id
      AND team_id = NEW.team_id
      AND role IN ('owner','admin')
  ) THEN
    RAISE EXCEPTION 'User is not a team owner/admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
