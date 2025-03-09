"use client";

import { supabase } from "@/lib/supabase/client";
import { ScheduleFormValues, StadiumFormValues } from "./lib/schema";
import { MatchFormValues } from "./lib/schemas";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

// 팀 데이터 가져오기
export async function fetchTeamData(userId: string) {
  try {
    // 사용자가 속한 팀 정보 가져오기
    const { data: teamMember, error: teamMemberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .single();

    if (teamMemberError) throw teamMemberError;

    if (!teamMember) {
      throw new Error("팀 정보를 찾을 수 없습니다.");
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamMember.team_id)
      .single();

    if (teamError) throw teamError;

    // 팀에 속한 경기장 정보 가져오기
    const { data: stadiums, error: stadiumsError } = await supabase
      .from("stadiums")
      .select("*")
      .eq("team_id", teamMember.team_id);

    if (stadiumsError) throw stadiumsError;

    // 등록된 모든 팀 정보 가져오기 (현재 팀 제외)
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .neq("id", teamMember.team_id);

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
  created_by: string;
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
    console.log("API 호출 데이터:", matchData);

    // 게스트 팀 처리
    let opponent_guest_team_id = null;

    if (
      matchData.opponent_type === "guest" &&
      matchData.opponent_guest_team_name
    ) {
      // 기존 게스트팀 확인 (게스트 클럽 ID가 제공된 경우)
      if (
        matchData.opponent_guest_team_id &&
        matchData.opponent_guest_team_id !== "none"
      ) {
        const { data: existingTeam, error } = await supabase
          .from("guest_clubs")
          .select("id")
          .eq("team_id", matchData.team_id)
          .eq("name", matchData.opponent_guest_team_name)
          .single();

        if (!error && existingTeam) {
          opponent_guest_team_id = existingTeam.id;
        }
      }

      // 기존 게스트팀이 없으면 새로 생성
      if (!opponent_guest_team_id) {
        const { data: newTeam, error: insertError } = await supabase
          .from("guest_clubs")
          .insert({
            name: matchData.opponent_guest_team_name,
            description: matchData.opponent_guest_team_description || null,
            team_id: matchData.team_id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        opponent_guest_team_id = newTeam.id;
      }
    }

    // match_date와 match_time을 결합하여 하나의 timestamp로 변환
    const [hours, minutes] = matchData.match_time.split(":").map(Number);
    const matchDateTime = new Date(matchData.match_date);
    matchDateTime.setHours(hours, minutes, 0, 0);

    // 경기 생성
    const { data, error } = await supabase
      .from("matches")
      .insert({
        team_id: matchData.team_id,
        match_date: matchDateTime.toISOString(),
        registration_deadline: format(
          matchData.registration_deadline,
          "yyyy-MM-dd"
        ),
        opponent_team_id:
          matchData.opponent_type === "registered"
            ? matchData.opponent_team_id
            : null,
        opponent_guest_team_id: opponent_guest_team_id, // 수정된 부분: 필드명 맞춤
        is_tbd: matchData.opponent_type === "tbd",
        venue: matchData.venue || "",
        stadium_id:
          matchData.stadium_id === "none" ? null : matchData.stadium_id,
        description: matchData.description || null,
        competition_type: "friendly",
        game_type: "11vs11",
        is_home: matchData.match_type === "home",
      })
      .select()
      .single();

    if (error) {
      console.error("경기 생성 오류:", error);
      throw new Error(`경기 생성 실패: ${error.message}`);
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
