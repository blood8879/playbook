"use client";

import { supabase } from "@/lib/supabase/client";
import { ScheduleFormValues, StadiumFormValues } from "./lib/schema";
import { MatchFormValues } from "./lib/schemas";

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

// 경기 생성하기
export async function createMatch(
  values: MatchFormValues,
  teamId: string,
  userId: string
) {
  try {
    // 날짜와 시간 결합
    console.log("values", values);
    console.log("teamId", teamId);
    console.log("userId", userId);
    const matchDateTime = new Date(values.match_date);
    const [hours, minutes] = values.match_time.split(":").map(Number);
    matchDateTime.setHours(hours, minutes);

    const matchData = {
      team_id: teamId,
      match_date: matchDateTime.toISOString(),
      registration_deadline: values.registration_deadline.toISOString(),
      opponent_team_id:
        values.opponent_type === "registered" ? values.opponent_team_id : null,
      opponent_guest_team_id: null, // 게스트 팀인 경우 아래에서 설정
      is_tbd: values.opponent_type === "tbd",
      venue: values.venue,
      description: values.description || null,
      competition_type: values.competition_type,
      game_type: "11vs11", // 기본값
      home_score: null,
      away_score: null,
      is_finished: false,
      stadium_id: values.stadium_id || null,
      is_home: values.match_type === "home",
    };

    // 게스트 팀인 경우 게스트 팀 정보 추가
    if (values.opponent_type === "guest") {
      const { data: guestTeam, error: guestTeamError } = await supabase
        .from("guest_teams")
        .insert([
          {
            name: values.opponent_guest_team_name,
            description: values.opponent_guest_team_description || "",
            club_id: values.guest_club_id,
          },
        ])
        .select()
        .single();

      if (guestTeamError) throw guestTeamError;

      // 게스트 팀 ID 설정
      matchData.opponent_guest_team_id = guestTeam.id;
    }

    // 경기 생성
    const { data: match, error } = await supabase
      .from("matches")
      .insert([matchData])
      .select()
      .single();

    if (error) throw error;

    // 우리 팀 소속 플레이어들 가져오기
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("status", "active");

    console.log("teamMembers", teamMembers);
    console.log("teamMembersError", teamMembersError);

    if (teamMembersError) throw teamMembersError;

    // 우리 팀 플레이어들을 미정 상태로 등록
    if (teamMembers && teamMembers.length > 0) {
      const matchPlayers = teamMembers.map((member) => ({
        match_id: match.id,
        user_id: member.user_id,
        status: "maybe", // 미정 상태
      }));

      console.log("matchPlayers", matchPlayers);

      const { error: insertError } = await supabase
        .from("match_attendance")
        .insert(matchPlayers);

      console.log("insertError", insertError);

      if (insertError) throw insertError;
    }

    // 등록된 상대팀인 경우, 상대팀 플레이어들도 등록
    if (values.opponent_type === "registered" && matchData.opponent_team_id) {
      const { data: opponentTeamMembers, error: opponentTeamMembersError } =
        await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", matchData.opponent_team_id)
          .eq("status", "active");

      console.log("opponentTeamMembers", opponentTeamMembers);

      if (opponentTeamMembersError) throw opponentTeamMembersError;

      // 상대팀 플레이어들을 미정 상태로 등록
      if (opponentTeamMembers && opponentTeamMembers.length > 0) {
        const opponentMatchPlayers = opponentTeamMembers.map((member) => ({
          match_id: match.id,
          user_id: member.user_id,
          status: "maybe", // 미정 상태
        }));

        console.log("opponentMatchPlayers", opponentMatchPlayers);

        const { error: insertOpponentError } = await supabase
          .from("match_attendance")
          .insert(opponentMatchPlayers);

        if (insertOpponentError) throw insertOpponentError;
      }
    }

    return match;
  } catch (error) {
    console.error("경기 생성 오류:", error);
    throw error;
  }
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
