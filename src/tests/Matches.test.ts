"use strict";

/**
 * @ai_context
 * Testing matches flow
 */

import { createClient } from "@supabase/supabase-js";

describe("Matches Tests", () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  let authUser: any = null;
  let createdTeamId: string | null = null;
  let createdMatchId: string | null = null;

  const email = "test@example.com";
  const password = "password123";

  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000); // +1시간

  beforeAll(async () => {
    // 회원가입
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      throw signUpError;
    }

    // 회원가입 후 곧바로 로그인 시도 (세션 생성)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      throw signInError;
    }

    // 세션 확인
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("로그인 세션이 없습니다. 테스트용 사용자 생성 실패");
    }

    authUser = sessionData.session.user;
  });

  afterAll(async () => {
    // 테스트 종료 후 정리
    // 가입한 사용자 삭제 등 필요한 정리 로직을 넣을 수 있음
  });

  test("should create a team (via RPC) and store the team_id", async () => {
    // 실제 RPC call 내용은 생략 (별도 함수 create_team_with_member 사용)
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_team_with_member", {
      team_name: `TestTeam-${Date.now()}`,
      team_description: "A test team",
      team_emblem_url: null,
      team_city: "서울",
      team_gu: "강남구",
      team_leader_id: authUser.id,
      member_user_id: authUser.id,
    });

    if (rpcError) {
      throw rpcError;
    }

    expect(rpcData).toBeTruthy();
    createdTeamId = rpcData.id;
    expect(createdTeamId).toBeDefined();
  });

  test("should create a match", async () => {
    if (!createdTeamId) {
      throw new Error("팀이 생성되지 않았습니다.");
    }

    const { data: insertMatch, error: insertError } = await supabase
      .from("matches")
      .insert({
        team_id: createdTeamId,
        match_date: now.toISOString(),
        registration_deadline: deadline.toISOString(),
        venue: "TestVenue",
        description: "Test match",
        competition_type: "friendly",
        game_type: "11vs11",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    expect(insertMatch).toBeTruthy();
    createdMatchId = insertMatch.id;
    expect(createdMatchId).toBeDefined();
  });

  test("should update the match", async () => {
    if (!createdMatchId) {
      throw new Error("경기가 생성되지 않았습니다.");
    }

    const { data: updateMatch, error: updateError } = await supabase
      .from("matches")
      .update({ description: "Updated match description" })
      .eq("id", createdMatchId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    expect(updateMatch.description).toBe("Updated match description");
  });

  test("should delete the match", async () => {
    if (!createdMatchId) {
      throw new Error("경기가 생성되지 않았습니다.");
    }

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", createdMatchId);

    if (deleteError) {
      throw deleteError;
    }

    // 삭제 확인은 생략하거나 select check 등으로 확인 가능
  });
});