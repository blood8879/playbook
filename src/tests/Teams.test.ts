/**
 * @ai_context
 * Teams.test.ts
 * 이 테스트 파일은 팀 생성, 검색 등 팀 관련 기능을 Jest를 이용하여 테스트합니다.
 * 실제 Supabase 인스턴스를 사용하므로, 환경변수(SUPABASE_URL, SUPABASE_ANON_KEY)가 필요합니다.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

describe("Teams Tests", () => {
  let authUser: any = null;
  let createdTeamId: string | null = null;

  beforeAll(async () => {
    // 로그인
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "password123",
    });
    if (error) {
      console.error("Login error:", error);
    }
    authUser = data?.user;
  });

  it("should create a new team via RPC function (create_team_with_member)", async () => {
    expect(authUser).not.toBeNull();

    const teamName = `TestTeam-${Date.now()}`;
    const { data, error } = await supabase.rpc("create_team_with_member", {
      team_name: teamName,
      team_description: "테스트용 팀입니다.",
      team_emblem_url: "",
      team_city: "서울",
      team_gu: "강남구",
      team_leader_id: authUser?.id,
      member_user_id: authUser?.id,
    });

    if (error) {
      console.error(error);
    }
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.name).toBe(teamName);
    createdTeamId = data?.id;
  });

  it("should search teams by name", async () => {
    expect(createdTeamId).not.toBeNull();

    const { data: results, error } = await supabase
      .from("teams")
      .select("*")
      .ilike("name", "%TestTeam%");
    expect(error).toBeNull();
    expect(Array.isArray(results)).toBe(true);
    if (results && results.length) {
      // 최소 한 건 이상 검색됨
      expect(results.some((t) => t.id === createdTeamId)).toBe(true);
    }
  });

  it("should list team members from the newly created team", async () => {
    if (!createdTeamId) return;

    const { data: teamMembers, error } = await supabase
      .from("team_members")
      .select("*, profiles(email, name)")
      .eq("team_id", createdTeamId);

    expect(error).toBeNull();
    expect(Array.isArray(teamMembers)).toBe(true);
    if (teamMembers && teamMembers.length > 0) {
      expect(teamMembers[0]?.profiles?.email).toBe("test@example.com");
    }
  });

  afterAll(async () => {
    // 생성된 팀 삭제
    if (createdTeamId) {
      // 팀 멤버 먼저 삭제
      const { error: memberError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", createdTeamId);

      if (memberError) {
        console.error("팀 멤버 삭제 중 오류 발생:", memberError);
      }

      // 팀 삭제
      const { error: teamError } = await supabase
        .from("teams")
        .delete()
        .eq("id", createdTeamId);

      if (teamError) {
        console.error("팀 삭제 중 오류 발생:", teamError);
      }
    }

    // 로그아웃
    await supabase.auth.signOut();
  });
});
