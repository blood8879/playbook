/**
 * @ai_context
 * Auth.test.ts
 * 이 테스트 파일은 인증(회원가입, 로그인)을 Jest를 이용하여 테스트합니다.
 * 실제 Supabase 인스턴스에 연결하므로, 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)가 필요합니다.
 * test@example.com / password123 사용.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

describe("Auth Tests", () => {
  const testEmail = "test@example.com";
  const testPassword = "password123";
  let userId: string | null = null;

  beforeAll(async () => {
    // 기존 세션이 있을 수 있으므로 초기화
    await supabase.auth.signOut();
  });

  it("should sign up (if user not already present)", async () => {
    // 이미 가입되어 있으면 에러가 날 수 있으니, 에러를 무시하거나 테스트 조건을 확인합니다.
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: "http://localhost:3000",
      },
    });

    if (error) {
      // 만약 이미 있는 유저거나 다른 오류이면, 여기서 그냥 통과 처리
      expect(error?.message ?? "").toMatch(
        /(signup requires|Duplicate|already registered)/
      );
    } else {
      // 새로 가입된 경우
      expect(data?.user?.email).toBe(testEmail);
    }
  });

  it("should sign in with existing user", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    expect(error).toBeNull();
    expect(data?.user?.email).toBe(testEmail);
    userId = data?.user?.id ?? null;
  });

  it("should get user session", async () => {
    const { data, error } = await supabase.auth.getSession();
    expect(error).toBeNull();
    expect(data?.session).toBeTruthy();
  });

  afterAll(async () => {
    // 테스트 후 로그아웃
    await supabase.auth.signOut();
  });
});
