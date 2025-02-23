import { createClient } from "@supabase/supabase-js";

describe("Matches Tests", () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );

  let authUser: any = null;
  let createdTeamId: string | null = null;
  let secondTeamId: string | null = null;
  let createdMatchId: string | null = null;

  // 랜덤 이메일
  const email = `test@example.com`;
  const password = "password123";
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000); // +1시간

  beforeAll(async () => {
    // 회원가입 후 로그인
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_name: "MatchesTestUser",
        },
      },
    });
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    authUser = loginData.user;

    // 팀 생성
    const { data: newTeam, error: createError } = await supabase.rpc(
      "create_team_with_member",
      {
        team_name: "MatchesTestTeam",
        team_description: "Testing matches",
        team_emblem_url: null,
        team_city: "서울",
        team_gu: "강남구",
        team_leader_id: authUser.id,
        member_user_id: authUser.id,
      }
    );
    if (createError) throw createError;
    createdTeamId = newTeam.id;

    // 두 번째 팀 생성 (상대 팀)
    const { data: newSecondTeam, error: secondError } = await supabase.rpc(
      "create_team_with_member",
      {
        team_name: "MatchesOppTeam",
        team_description: "Opponent Team",
        team_emblem_url: null,
        team_city: "서울",
        team_gu: "관악구",
        team_leader_id: authUser.id,
        member_user_id: authUser.id,
      }
    );
    if (secondError) throw secondError;
    secondTeamId = newSecondTeam.id;
  });

  afterAll(async () => {
    // 매치 데이터 삭제는 이미 테스트에서 수행됨

    // 첫 번째 팀 삭제
    if (createdTeamId) {
      // 팀 멤버 먼저 삭제
      const { error: memberError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", createdTeamId);

      if (memberError) {
        console.error("첫 번째 팀 멤버 삭제 중 오류 발생:", memberError);
      }

      // 팀 삭제
      const { error: teamError } = await supabase
        .from("teams")
        .delete()
        .eq("id", createdTeamId);

      if (teamError) {
        console.error("첫 번째 팀 삭제 중 오류 발생:", teamError);
      }
    }

    // 두 번째 팀(상대팀) 삭제
    if (secondTeamId) {
      // 팀 멤버 먼저 삭제
      const { error: memberError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", secondTeamId);

      if (memberError) {
        console.error("두 번째 팀 멤버 삭제 중 오류 발생:", memberError);
      }

      // 팀 삭제
      const { error: teamError } = await supabase
        .from("teams")
        .delete()
        .eq("id", secondTeamId);

      if (teamError) {
        console.error("두 번째 팀 삭제 중 오류 발생:", teamError);
      }
    }

    // 테스트 유저 로그아웃
    await supabase.auth.signOut();
  });

  it("should create a match (is_tbd=true)", async () => {
    if (!createdTeamId) throw new Error("Team not created.");

    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_id: createdTeamId,
        match_date: now.toISOString(),
        registration_deadline: deadline.toISOString(),
        is_tbd: true, // 상대 팀 미정
        venue: "Test Venue TBD",
        description: "A test match with is_tbd=true",
        competition_type: "friendly",
        game_type: "11vs11",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    createdMatchId = data.id;
  });

  it("should update the match to set a real opponent", async () => {
    if (!createdMatchId) {
      throw new Error("경기가 생성되지 않았습니다.");
    }
    if (!secondTeamId) {
      throw new Error("상대팀이 생성되지 않았습니다.");
    }

    // is_tbd=false 이면 opponent_team_id를 지정해야 체크조건 충족
    const { data: updatedMatch, error: updateError } = await supabase
      .from("matches")
      .update({
        is_tbd: false,
        opponent_team_id: secondTeamId,
        venue: "Updated Venue",
      })
      .eq("id", createdMatchId)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updatedMatch).toBeTruthy();
    expect(updatedMatch.is_tbd).toBe(false);
    expect(updatedMatch.opponent_team_id).toBe(secondTeamId);
  });

  it("should delete the match", async () => {
    if (!createdMatchId) {
      throw new Error("경기가 생성되지 않았습니다.");
    }

    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("id", createdMatchId);

    expect(deleteError).toBeNull();

    // 실제로 삭제됐는지 확인
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .eq("id", createdMatchId)
      .single();
    expect(matchData).toBeNull();
  });
});
