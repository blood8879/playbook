"use client";

import { supabase } from "@/lib/supabase/client";
import { ScheduleFormValues, StadiumFormValues } from "./lib/schema";
import { MatchFormValues } from "./lib/schemas";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

// 팀 데이터 가져오기
export async function fetchTeamData(userId: string, specificTeamId?: string) {
  try {
    // 특정 팀 ID가 있는 경우, 해당 팀이 사용자에게 연결되어 있는지 확인
    if (specificTeamId) {
      // 사용자가 해당 팀에 속해 있는지 확인
      const { data: teamMembership, error: membershipError } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", userId)
        .eq("team_id", specificTeamId)
        .maybeSingle();

      if (membershipError && membershipError.code !== "PGRST116")
        throw membershipError;

      // 팀에 속해 있지 않은 경우 오류 발생
      if (!teamMembership) {
        throw new Error("해당 팀에 속해 있지 않습니다.");
      }

      // 특정 팀 정보 가져오기
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", specificTeamId)
        .single();

      if (teamError) throw teamError;

      // 팀에 속한 경기장 정보 가져오기
      const { data: stadiums, error: stadiumsError } = await supabase
        .from("stadiums")
        .select("*")
        .eq("team_id", specificTeamId);

      if (stadiumsError) throw stadiumsError;

      // 사용자가 속한 모든 팀 정보 가져오기
      const { data: teamMembers, error: teamMemberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId);

      if (teamMemberError) throw teamMemberError;

      // 사용자가 속한 팀 목록 (팀 전환 UI에 사용)
      const { data: userTeams, error: userTeamsError } = await supabase
        .from("teams")
        .select("id, name")
        .in(
          "id",
          teamMembers.map((tm) => tm.team_id)
        );

      if (userTeamsError) throw userTeamsError;

      // 등록된 모든 팀 정보 가져오기 (현재 팀 제외)
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .neq("id", specificTeamId);

      if (teamsError) throw teamsError;

      // 클럽 정보 가져오기
      const { data: clubs, error: clubsError } = await supabase
        .from("teams")
        .select("*");

      if (clubsError) throw clubsError;

      return {
        team,
        stadiums: stadiums || [],
        opponentTeams: teams || [],
        clubs: clubs || [],
        userTeams: userTeams || [], // 사용자가 속한 모든 팀 목록 추가
      };
    }

    // 일반 사용 사례 (특정 팀 ID가 없는 경우)
    // 사용자가 속한 모든 팀 정보 가져오기 (single() 대신에 전체 목록을 가져옴)
    const { data: teamMembers, error: teamMemberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId);

    if (teamMemberError) throw teamMemberError;

    if (!teamMembers || teamMembers.length === 0) {
      throw new Error("팀 정보를 찾을 수 없습니다.");
    }

    // 사용자의 프로필 정보를 가져와서 대표 팀이 설정되어 있는지 확인
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("primary_team_id")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") throw profileError;

    // 기본 팀 ID 결정 (대표 팀이 설정되어 있으면 해당 팀, 아니면 첫 번째 팀)
    let primaryTeamId = profile?.primary_team_id;
    if (
      !primaryTeamId ||
      !teamMembers.some((tm) => tm.team_id === primaryTeamId)
    ) {
      primaryTeamId = teamMembers[0].team_id;
    }

    // 선택된 팀 정보 가져오기
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", primaryTeamId)
      .single();

    if (teamError) throw teamError;

    if (!team) {
      throw new Error("팀 정보를 찾을 수 없습니다.");
    }

    // 팀에 속한 경기장 정보 가져오기
    const { data: stadiums, error: stadiumsError } = await supabase
      .from("stadiums")
      .select("*")
      .eq("team_id", primaryTeamId);

    if (stadiumsError) throw stadiumsError;

    // 사용자가 속한 팀 목록 (팀 전환 UI에 사용)
    const { data: userTeams, error: userTeamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in(
        "id",
        teamMembers.map((tm) => tm.team_id)
      );

    if (userTeamsError) throw userTeamsError;

    // 등록된 모든 팀 정보 가져오기 (현재 팀 제외)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .neq("id", primaryTeamId);

    console.log("teams", teams);

    if (teamsError) throw teamsError;

    // 클럽 정보 가져오기
    const { data: clubs, error: clubsError } = await supabase
      .from("teams")
      .select("*");

    if (clubsError) throw clubsError;

    return {
      team,
      stadiums: stadiums || [],
      opponentTeams: teams || [],
      clubs: clubs || [],
      userTeams: userTeams || [], // 사용자가 속한 모든 팀 목록 추가
    };
  } catch (error) {
    console.error("팀 데이터 가져오기 오류:", error);
    throw error;
  }
}

// 상대팀 경기장 정보 가져오기
export async function fetchOpponentTeamStadiums(teamId: string) {
  try {
    const { data: stadiums, error } = await supabase
      .from("stadiums")
      .select("*")
      .eq("team_id", teamId);

    if (error) throw error;
    return stadiums || [];
  } catch (error) {
    console.error("상대팀 경기장 정보 가져오기 오류:", error);
    throw error;
  }
}

// 경기장 생성하기
export async function createStadium({
  teamId,
  name,
  address,
  description,
}: {
  teamId: string;
  name: string;
  address: string;
  description: string;
}) {
  try {
    const { data, error } = await supabase
      .from("stadiums")
      .insert([
        {
          team_id: teamId,
          name,
          address,
          description,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("경기장 생성 오류:", error);
    throw error;
  }
}

// Match 타입 정의
export type Match = {
  id: string;
  name: string;
  location: string;
  scheduled_at: string;
  home_team_id: string;
  guest_team_id: string | null;
  description?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";

  created_at: string;
  home_team_score?: number;
  guest_team_score?: number;
};

type CreateMatchData = Omit<
  Match,
  "id" | "created_at" | "home_team_score" | "guest_team_score"
>;

/**
 * 새 경기 생성 함수
 * @param matchData 경기 데이터
 * @returns 생성된 경기 객체
 */
export async function createMatch(matchData: MatchFormValues): Promise<any> {
  try {
    console.log("API 호출 데이터 전체:", JSON.stringify(matchData, null, 2));
    console.log("opponent_type (frontend only):", matchData.opponent_type);
    console.log("opponent_team_id:", matchData.opponent_team_id);
    console.log("opponent_guest_team_id:", matchData.opponent_guest_team_id);
    console.log(
      "opponent_guest_team_name:",
      matchData.opponent_guest_team_name
    );

    // 게스트 팀 처리
    let opponent_guest_team_id = null;

    if (matchData.opponent_type === "guest") {
      try {
        // 1. 기존 게스트팀 ID가 직접 제공되었는지 확인
        if (
          matchData.opponent_guest_team_id &&
          matchData.opponent_guest_team_id !== "none"
        ) {
          opponent_guest_team_id = matchData.opponent_guest_team_id;
          console.log("제공된 게스트팀 ID 사용:", opponent_guest_team_id);
        }
        // 2. 사용자가 입력한 이름으로 기존 게스트팀 확인
        else if (matchData.opponent_guest_team_name) {
          console.log(
            "게스트팀 이름으로 검색:",
            matchData.opponent_guest_team_name
          );
          const { data: existingTeam, error: searchError } = await supabase
            .from("guest_clubs")
            .select("id")
            .eq("team_id", matchData.team_id)
            .ilike("name", matchData.opponent_guest_team_name.trim())
            .maybeSingle();

          if (searchError && searchError.code !== "PGRST116") {
            console.error("게스트팀 검색 오류:", searchError);
          }

          // 게스트팀이 이미 존재하는 경우 해당 ID 사용
          if (existingTeam) {
            opponent_guest_team_id = existingTeam.id;
            console.log("기존 게스트팀 발견:", existingTeam);
          }
          // 3. 게스트팀이 없는 경우 새로 생성
          else {
            const { data: newTeam, error: insertError } = await supabase
              .from("guest_clubs")
              .insert({
                name: matchData.opponent_guest_team_name.trim(),
                description: matchData.opponent_guest_team_description || null,
                team_id: matchData.team_id,
              })
              .select()
              .single();

            if (insertError) {
              console.error("게스트팀 생성 오류:", insertError);
              // 중복 오류 사용자에게 노출
              if (insertError.code === "23505") {
                throw new Error(
                  "이미 등록된 게스트팀 이름입니다. 다른 이름을 사용해주세요."
                );
              }
              throw insertError;
            }

            opponent_guest_team_id = newTeam.id;
            console.log("새 게스트팀 생성 완료:", newTeam);
          }
        }
      } catch (error) {
        console.error("게스트팀 처리 오류:", error);
        throw error; // 상위 함수에 오류 전파
      }
    }

    // match_date와 match_time을 결합하여 하나의 timestamp로 변환
    const matchDate = new Date(matchData.match_date);
    const [hours, minutes] = matchData.match_time.split(":").map(Number);

    matchDate.setHours(hours, minutes, 0, 0);
    const matchDateTime = matchDate.toISOString();

    // 경기 생성
    // 타입 정의 업데이트: opponent_team_id와 opponent_guest_team_id 추가
    type MatchInsertData = {
      team_id: string;
      match_date: string;
      registration_deadline: string;
      is_home: boolean;
      venue: string;
      stadium_id: string | null;
      description: string | null;
      competition_type: string;
      game_type: string;
      opponent_team_id?: string | null;
      opponent_guest_team_id?: string | null;
      is_tbd?: boolean;
    };
    
    let insertData: MatchInsertData = {
      team_id: matchData.team_id,
      match_date: matchDateTime,
      registration_deadline: matchData.registration_deadline instanceof Date
        ? format(matchData.registration_deadline, "yyyy-MM-dd")
        : matchData.registration_deadline,
      is_home: matchData.match_type === "home",
      venue: matchData.venue || "",
      stadium_id: matchData.stadium_id === "none" ? null : matchData.stadium_id,
      description: matchData.description || null,
      competition_type: "friendly",
      game_type: "11vs11"
    };

    // 상대팀 유형에 따라 필드 업데이트
    if (matchData.opponent_type === "registered") {
      insertData = {
        ...insertData,
        opponent_team_id: matchData.opponent_team_id,
        opponent_guest_team_id: null,
        is_tbd: false
      };
    } else if (matchData.opponent_type === "guest") {
      insertData = {
        ...insertData,
        opponent_team_id: null,
        opponent_guest_team_id: opponent_guest_team_id,
        is_tbd: false
      };

      // 디버깅 로깅
      console.log("게스트팀 ID 확인:", opponent_guest_team_id);
      if (!opponent_guest_team_id) {
        throw new Error(
          "게스트팀 ID가 설정되지 않았습니다. 게스트팀을 다시 선택해주세요."
        );
      }
    } else {
      // tbd
      insertData = {
        ...insertData,
        opponent_team_id: null,
        opponent_guest_team_id: null,
        is_tbd: true
      };
    }

    console.log("최종 삽입 데이터:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("matches")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("경기 생성 오류:", error);
      throw new Error(`경기 생성 실패: ${error.message}`);
    }

    console.log("생성된 경기 정보:", data);

    // 우리 팀 소속 플레이어들 가져오기 (중요: status="active" 필터 추가)
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", matchData.team_id)
      .eq("status", "active"); // 오직 active 상태의 멤버만 선택

    console.log("팀 멤버 조회 결과:", teamMembers, "/ 오류:", teamMembersError);

    if (teamMembersError) {
      console.error("팀 멤버 조회 오류:", teamMembersError);
    } else if (teamMembers && teamMembers.length > 0) {
      // 우리 팀 플레이어들을 미정 상태로 등록
      const matchPlayers = teamMembers.map((member) => ({
        match_id: data.id,
        user_id: member.user_id,
        status: "maybe", // 미정 상태
        team_id: matchData.team_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log("참석 정보 등록 데이터:", matchPlayers.length);

      const { error: insertError } = await supabase
        .from("match_attendance")
        .insert(matchPlayers);

      if (insertError) {
        console.error("참석 정보 등록 오류:", insertError);
      }
    } else {
      console.warn(
        `팀 ID ${matchData.team_id}에 속한 유효한 플레이어가 없습니다.`
      );
    }

    // 등록된 상대팀인 경우, 상대팀 플레이어들도 등록
    if (
      matchData.opponent_type === "registered" &&
      matchData.opponent_team_id
    ) {
      const { data: opponentTeamMembers, error: opponentTeamMembersError } =
        await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", matchData.opponent_team_id)
          .eq("status", "active");

      if (opponentTeamMembersError) {
        console.error("상대팀 멤버 조회 오류:", opponentTeamMembersError);
      } else if (opponentTeamMembers && opponentTeamMembers.length > 0) {
        // 상대팀 플레이어들을 미정 상태로 등록
        const opponentMatchPlayers = opponentTeamMembers.map((member) => ({
          match_id: data.id,
          user_id: member.user_id,
          status: "maybe", // 미정 상태
          team_id: matchData.opponent_team_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: insertOpponentError } = await supabase
          .from("match_attendance")
          .insert(opponentMatchPlayers);

        if (insertOpponentError) {
          console.error("상대팀 참석 정보 등록 오류:", insertOpponentError);
        }
      }
    }

    return data;
  } catch (error) {
    console.error("경기 생성 오류:", error);
    throw error;
  }
}

/**
 * 모든 경기 목록 조회 함수
 * @returns 경기 목록 배열
 */
export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("경기 목록 조회 오류:", error);
    throw new Error(`경기 목록 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 특정 경기 정보 조회 함수
 * @param id 경기 ID
 * @returns 경기 객체
 */
export async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // 데이터가 없는 경우는 에러로 처리하지 않음
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("경기 정보 조회 오류:", error);
    throw new Error(`경기 정보 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 경기 정보 업데이트 함수
 * @param id 경기 ID
 * @param matchData 업데이트할 경기 데이터
 * @returns 업데이트된 경기 객체
 */
export async function updateMatch(
  id: string,
  matchData: Partial<Omit<Match, "id" | "created_at" | "created_by">>
): Promise<Match> {
  // guest_team_id가 빈 문자열일 경우 null로 처리
  const sanitizedData =
    matchData.guest_team_id === ""
      ? { ...matchData, guest_team_id: null }
      : matchData;

  const { data, error } = await supabase
    .from("matches")
    .update(sanitizedData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("경기 정보 업데이트 오류:", error);
    throw new Error(`경기 정보 업데이트 실패: ${error.message}`);
  }

  return data;
}

// 경기장 데이터 가져오기
export const fetchStadiums = async (teamId: string) => {
  const { data, error } = await supabase
    .from("stadiums")
    .select("*")
    .eq("team_id", teamId);

  if (error) {
    throw new Error(`경기장 정보를 가져오는데 실패했습니다: ${error.message}`);
  }

  return data;
};

// 생성된 경기 일정 저장하기
export const saveMatches = async (matches: any[], scheduleId: string) => {
  const { data, error } = await supabase.from("matches").insert(
    matches.map((match) => ({
      ...match,
      schedule_id: scheduleId,
    }))
  );

  if (error) {
    throw new Error(`경기 일정 저장에 실패했습니다: ${error.message}`);
  }

  return data;
};

// 스케줄 생성하기
export const createSchedule = async (values: ScheduleFormValues) => {
  const { data, error } = await supabase
    .from("schedules")
    .insert([
      {
        title: values.title,
        start_date: values.startDate.toISOString(),
        end_date: values.endDate.toISOString(),
        team_id: values.teamId,
        stadium_id: values.stadiumId,
        time_slots: values.timeSlots,
        frequency: values.frequency,
        description: values.description || "",
      },
    ])
    .select();

  if (error) {
    throw new Error(`스케줄 생성에 실패했습니다: ${error.message}`);
  }

  return data[0];
};
