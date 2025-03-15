import { SupabaseClient } from "@supabase/supabase-js";
import {
  TeamFormData,
  Team,
  TeamInvitation,
  TeamMatch,
  HeadToHeadStats,
  MatchAttendance,
} from "./types/index";
import { TeamMemberRole, TeamMemberStatus } from "./types/index";

/**
 * @ai_context
 * Here we add new functions for head-to-head stats and match attendance management.
 */

// PlayerStats 인터페이스 추가 (함수 외부에 정의)
interface PlayerStats {
  attendance: "attending" | "absent" | "maybe";
  fieldGoals: number;
  freeKickGoals: number;
  penaltyGoals: number;
  assists: number;
  isMom: boolean;
  teamId?: string;
}

export async function createTeam(
  supabase: SupabaseClient,
  data: TeamFormData,
  emblemFile: File | null,
  userId: string
) {
  let emblem_url = null;

  try {
    // 사용자가 존재하는지 확인
    const { data: userExists, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("사용자 확인 오류:", userError);
      throw new Error(`사용자 확인 실패: ${userError.message}`);
    }

    if (!userExists) {
      throw new Error(
        "사용자가 존재하지 않습니다. 프로필을 먼저 생성해주세요."
      );
    }

    if (emblemFile) {
      const fileExt = emblemFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `team-emblems/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("teams")
        .upload(filePath, emblemFile);

      if (uploadError) {
        console.error("파일 업로드 오류:", uploadError);
        throw new Error(`팀 엠블럼 업로드 실패: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("teams")
        .getPublicUrl(filePath);

      emblem_url = urlData.publicUrl;
    }

    const { data: team, error: createError } = await supabase.rpc(
      "create_team_with_member",
      {
        team_name: data.name,
        team_description: data.description,
        team_emblem_url: emblem_url,
        team_city: data.city,
        team_gu: data.gu,
        team_leader_id: userId,
        member_user_id: userId,
      }
    );

    if (createError) {
      console.error("팀 생성 오류:", createError);
      if (createError.code === "23505") {
        throw new Error(
          "이미 존재하는 팀 이름입니다. 다른 이름을 사용해주세요."
        );
      } else if (createError.code === "23503") {
        throw new Error(
          "외래 키 제약 조건 위반: 사용자가 존재하지 않거나 접근할 수 없습니다."
        );
      }
      throw new Error(`팀 생성 실패: ${createError.message}`);
    }

    return team;
  } catch (error) {
    console.error("팀 생성 중 예외 발생:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("팀 생성 중 알 수 없는 오류가 발생했습니다.");
  }
}

export async function getTeamById(supabase: SupabaseClient, teamId: string) {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (error) throw error;
  return data as Team;
}

export const getTeamMembers = async (
  supabase: SupabaseClient,
  teamId: string
) => {
  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
    *,
    profiles:profiles!team_members_user_id_fkey(
      id,
      email,
      name,
      avatar_url
    )
    `
    )
    .eq("team_id", teamId)
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("error", error);
    return null;
  }

  return data;
};

interface TeamMemberUpdateData {
  role?: TeamMemberRole;
  status?: TeamMemberStatus;
  positions?: string[];
  number?: string;
}

export const updateTeamMember = async (
  supabase: SupabaseClient,
  memberId: string,
  data: TeamMemberUpdateData
) => {
  const { data: updatedMember, error } = await supabase
    .from("team_members")
    .update(data)
    .eq("id", memberId)
    .select()
    .single();

  if (error) throw error;
  return updatedMember;
};

export async function inviteTeamMember(
  supabase: SupabaseClient,
  teamId: string,
  email: string,
  inviterId: string
) {
  const { data: user, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError) throw userError;
  if (!user) throw new Error("사용자를 찾을 수 없습니다");

  const { data: existingMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (memberError && memberError.code !== "PGRST116") throw memberError;
  if (existingMember) throw new Error("이미 팀 멤버입니다");

  const { data: invite, error: inviteError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      inviter_id: inviterId,
      invitee_id: user.id,
    });

  if (inviteError) throw inviteError;
}

export async function removeTeamMember(
  supabase: SupabaseClient,
  userId: string,
  teamId: string
) {
  const { data: invitationData, error: invitationError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("invitee_id", userId)
    .eq("team_id", teamId);

  const { data: joinRequestData, error: joinRequestError } = await supabase
    .from("team_join_requests")
    .delete()
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (invitationError) throw invitationError;
  const { data: memberData, error } = await supabase
    .from("team_members")
    .delete()
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (error) throw error;
}

export async function getMyInvitations(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      *,
      team:team_id (name),
      inviter:inviter_id (
        email,
        name
      )
    `
    )
    .eq("status", "pending")
    .eq("invitee_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as unknown as TeamInvitation[];
}

export async function respondToInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  accept: boolean
) {
  const { data: invitation, error: getError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("id", invitationId)
    .single();

  if (getError) throw getError;

  if (accept) {
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: invitation.team_id,
        user_id: invitation.invitee_id,
        status: "active",
        role: "member",
      });

    if (memberError) throw memberError;
  }

  const { data: update, error: updateError } = await supabase
    .from("team_invitations")
    .update({
      status: accept ? "accepted" : "rejected",
    })
    .eq("id", invitationId);

  if (updateError) throw updateError;
}

export const searchTeams = async (
  supabase: SupabaseClient,
  searchTerm: string
) => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .ilike("name", `%${searchTerm}%`);

  if (error) throw error;
  return data;
};

export const createJoinRequest = async (
  supabase: SupabaseClient,
  {
    teamId,
    userId,
    positions,
    number,
    message,
  }: {
    teamId: string;
    userId: string;
    positions: string[];
    number: number;
    message: string;
  }
) => {
  const { data, error } = await supabase.from("team_join_requests").insert({
    team_id: teamId,
    user_id: userId,
    preferred_positions: positions,
    preferred_number: number,
    message,
  });

  if (error) throw error;
  return data;
};

export const getTeamJoinRequests = async (
  supabase: SupabaseClient,
  teamId: string
) => {
  const { data, error } = await supabase
    .from("team_join_requests")
    .select(
      `
      *,
      profiles:user_id (
        id,
        name,
        email,
        avatar_url
      )
    `
    )
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const respondToJoinRequest = async (
  supabase: SupabaseClient,
  requestId: string,
  {
    accepted,
    positions,
    number,
  }: {
    accepted: boolean;
    positions?: string[];
    number?: number;
  }
) => {
  const { data: request, error: getError } = await supabase
    .from("team_join_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (getError) throw getError;

  if (accepted) {
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: request.team_id,
      user_id: request.user_id,
      status: "active",
      role: "member",
      positions: positions || request.preferred_positions,
      number: number || request.preferred_number,
    });

    if (memberError) throw memberError;
  }

  const { error: updateError } = await supabase
    .from("team_join_requests")
    .update({
      status: accepted ? "accepted" : "rejected",
    })
    .eq("id", requestId);

  if (updateError) throw updateError;
};

export const getTeamNumbers = async (
  supabase: SupabaseClient,
  teamId: string
) => {
  const { data, error } = await supabase
    .from("team_members")
    .select("number")
    .eq("team_id", teamId)
    .not("number", "is", null);

  if (error) throw error;
  return data.map((member) => member.number);
};

export const swapTeamNumbers = async (
  supabase: SupabaseClient,
  teamId: string,
  updates: { memberId: string; number: number | null }[]
) => {
  const { data, error } = await supabase.rpc("swap_team_numbers", {
    p_team_id: teamId,
    p_updates: updates,
  });

  if (error) throw error;
  return data;
};

/**
 * @ai_context
 * New function to get a match by ID for detail page
 */
export async function getMatchById(
  supabase: SupabaseClient,
  matchId: string
): Promise<TeamMatch | null> {
  // 기본 경기 정보 조회
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      *,
      team:teams!matches_team_id_fkey(*),
      opponent_team:teams!matches_opponent_team_id_fkey(*),
      opponent_guest_team:guest_clubs(*),
      stadium:stadiums(*)
    `
    )
    .eq("id", matchId)
    .single();

  if (matchError) {
    if (matchError.code === "PGRST116") {
      return null;
    }
    throw matchError;
  }

  if (!matchData) {
    return null;
  }

  // currentUserTeam을 기본적으로 team으로 설정
  let currentUserTeam = matchData.team;
  let opponentTeam = matchData.opponent_team || matchData.opponent_guest_team;
  let isHome = true;

  // 추가로 확인: 사용자가 원정 팀에 소속되어 있는지 여부
  const { data: userTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "");

  // 사용자가 속한 팀 목록
  const userTeamIds = userTeams?.map((t) => t.team_id) || [];

  // 사용자가 원정 팀에 소속되어 있는 경우, 데이터 구조를 변경
  if (
    matchData.opponent_team &&
    userTeamIds.includes(matchData.opponent_team.id)
  ) {
    currentUserTeam = matchData.opponent_team;
    opponentTeam = matchData.team;
    isHome = false;
  }

  return {
    ...matchData,
    is_home: isHome,
    user_team: currentUserTeam, // 사용자의 팀 정보
    opposing_team: opponentTeam, // 상대 팀 정보
  } as TeamMatch;
}

/**
 * @ai_context
 * We add new methods for advanced match stats
 */
export const getHeadToHeadStats = async (
  supabase: SupabaseClient,
  teamAId: string,
  teamBId: string
): Promise<HeadToHeadStats> => {
  console.log("getHeadToHeadStats 호출:", { teamAId, teamBId });

  // 게스트 팀 ID와의 매치도 고려
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .or(
      `and(team_id.eq.${teamAId},opponent_team_id.eq.${teamBId}),` +
        `and(team_id.eq.${teamBId},opponent_team_id.eq.${teamAId}),` +
        `and(team_id.eq.${teamAId},opponent_guest_team_id.eq.${teamBId}),` +
        `and(team_id.eq.${teamBId},opponent_guest_team_id.eq.${teamAId})`
    )
    .eq("is_finished", true);

  console.log("조회된 head-to-head 매치:", matches);

  if (error) {
    console.error("Head-to-Head 매치 조회 오류:", error);
    throw error;
  }

  // 통계 초기화 및 계산 로직
  const stats: HeadToHeadStats = {
    // (기존 코드와 동일)
    teamAWins: 0,
    teamBWins: 0,
    draws: 0,
    teamAHomeWins: 0,
    teamBHomeWins: 0,
    homeDraws: 0,
    teamAAwayWins: 0,
    teamBAwayWins: 0,
    awayDraws: 0,
  };

  // (기존 코드와 동일)
  if (!matches || matches.length === 0) {
    return stats;
  }

  // 매치 처리 로직
  matches.forEach((match) => {
    // (기존 코드와 동일하나 게스트 팀 ID도 고려)
    const involvesTeamA =
      match.team_id === teamAId ||
      match.opponent_team_id === teamAId ||
      match.opponent_guest_team_id === teamAId;

    const involvesTeamB =
      match.team_id === teamBId ||
      match.opponent_team_id === teamBId ||
      match.opponent_guest_team_id === teamBId;

    if (!involvesTeamA || !involvesTeamB) {
      return;
    }

    // 팀 A가 홈인지 확인 (팀 A가 팀 ID와 일치하는지)
    const isTeamAHome = match.team_id === teamAId;

    // 스코어 처리 및 통계 계산
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    // (기존 결과 처리 로직과 동일)
    if (homeScore > awayScore) {
      // 홈팀 승리
      if (isTeamAHome) {
        stats.teamAWins++;
        stats.teamAHomeWins++;
      } else {
        stats.teamBWins++;
        stats.teamBHomeWins++;
      }
    } else if (homeScore < awayScore) {
      // 원정팀 승리
      if (isTeamAHome) {
        stats.teamBWins++;
        stats.teamBAwayWins++;
      } else {
        stats.teamAWins++;
        stats.teamAAwayWins++;
      }
    } else {
      // 무승부
      stats.draws++;
      if (isTeamAHome) {
        stats.homeDraws++;
      } else {
        stats.awayDraws++;
      }
    }
  });

  return stats;
};

/**
 * get last N matches of a team
 */
export async function getLastMatchesOfTeam(
  supabase: SupabaseClient,
  teamId: string,
  options?: { isFinished?: boolean; limit?: number }
) {
  const query = supabase
    .from("matches")
    .select(
      `
      *,
      team:teams!matches_team_id_fkey(id, name, emblem_url),
      opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url),
      opponent_guest_team:guest_clubs(id, name)
    `
    )
    .or(`team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
    .order("match_date", { ascending: false })
    .limit(options?.limit || 5);

  if (options?.isFinished !== undefined) {
    query.eq("is_finished", options.isFinished);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 양팀간 최근 5전 성적
export async function getLastMatchesBetweenTeams(
  supabase: SupabaseClient,
  teamAId: string,
  teamBId: string,
  options?: { isFinished?: boolean }
) {
  console.log("최근 상대전적 조회 시작:", { teamAId, teamBId });

  // 모든 가능한 매치 조합 쿼리 (등록팀과 게스트팀 모두 고려)
  const query = supabase
    .from("matches")
    .select(
      `
      *,
      team:teams!matches_team_id_fkey(*),
      opponent_team:teams!matches_opponent_team_id_fkey(*),
      opponent_guest_team:guest_clubs(*)
    `
    )
    .or(
      `and(team_id.eq.${teamAId},opponent_team_id.eq.${teamBId}),` +
        `and(team_id.eq.${teamBId},opponent_team_id.eq.${teamAId}),` +
        `and(team_id.eq.${teamAId},opponent_guest_team_id.eq.${teamBId}),` +
        `and(team_id.eq.${teamBId},opponent_guest_team_id.eq.${teamAId})`
    )
    .order("match_date", { ascending: false })
    .limit(5);

  if (options?.isFinished) {
    query.eq("is_finished", true);
  }

  const { data, error } = await query;
  console.log("최근 상대전적 결과:", data);

  if (error) {
    console.error("최근 상대전적 조회 오류:", error);
    throw error;
  }

  return data;
}
/**
 * match attendance
 */
export async function getMatchAttendance(
  supabase: SupabaseClient,
  matchId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("match_attendance")
    .select("status")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data.status as "attending" | "absent" | "maybe";
}

export async function setMatchAttendance(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
  status: "attending" | "absent" | "maybe"
) {
  console.log(
    `참석 상태 업데이트: 매치 ${matchId}, 유저 ${userId}, 상태 ${status}`
  );

  try {
    // 기존 엔트리 확인
    const { data: existingAttendance, error: checkError } = await supabase
      .from("match_attendance")
      .select("id, team_id")
      .eq("match_id", matchId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("참석 정보 확인 중 오류:", checkError);
      throw checkError;
    }

    // 기존 엔트리가 있으면 업데이트, 없으면 신규 생성
    if (existingAttendance) {
      const { data, error } = await supabase
        .from("match_attendance")
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq("id", existingAttendance.id)
        .select();

      if (error) {
        console.error("참석 정보 업데이트 중 오류:", error);
        throw error;
      }

      return data;
    } else {
      // 새 엔트리 추가
      const { data, error } = await supabase
        .from("match_attendance")
        .insert({
          match_id: matchId,
          user_id: userId,
          status: status,
          team_id: null, // 팀 ID는 필요한 경우 추가
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("참석 정보 추가 중 오류:", error);
        throw error;
      }

      return data;
    }
  } catch (error) {
    console.error("참석 상태 업데이트 중 예외 발생:", error);
    throw error;
  }
}

export interface MatchAttendanceCount {
  attending: number;
  absent: number;
  maybe: number;
  homeAttending: number;
  homeAbsent: number;
  homeMaybe: number;
  awayAttending: number;
  awayAbsent: number;
  awayMaybe: number;
}

export async function getMatchAttendanceList(
  supabase: SupabaseClient,
  matchId: string
): Promise<MatchAttendance[]> {
  try {
    // 먼저 경기 정보를 가져옵니다
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        *,
        team:teams!matches_team_id_fkey(id),
        opponent_team:teams!matches_opponent_team_id_fkey(id)
      `
      )
      .eq("id", matchId)
      .single();

    if (matchError) {
      console.error("경기 정보 조회 오류:", matchError);
      throw matchError;
    }

    console.log("경기 정보:", matchData);

    // 현재 로그인한 사용자의 ID 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 사용자가 속한 팀 목록 가져오기
    const { data: userTeams, error: userTeamsError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user?.id || "");

    if (userTeamsError) {
      console.error("팀 멤버십 조회 오류:", userTeamsError);
    }

    // 사용자가 속한 팀 ID 목록
    const userTeamIds = userTeams?.map((t) => t.team_id) || [];

    // 사용자가 홈팀인지 원정팀인지 확인
    const isUserHome = userTeamIds.includes(matchData.team_id);
    const isUserAway =
      matchData.opponent_team_id &&
      userTeamIds.includes(matchData.opponent_team_id);

    // 참석 정보 가져오기
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("match_attendance")
      .select(
        `
        id,
        match_id,
        user_id,
        status,
        team_id,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          name,
          avatar_url
        )
      `
      )
      .eq("match_id", matchId);

    if (attendanceError) {
      console.error("참석 정보 조회 오류:", attendanceError);
      throw attendanceError;
    }

    // 참석자의 팀 정보를 정확하게 가져오기 위한 추가 조회
    const userIds = attendanceData.map((a) => a.user_id);
    const { data: teamMemberships, error: teamMembershipsError } = await supabase
      .from("team_members")
      .select("user_id, team_id")
      .in("user_id", userIds)
      .in("team_id", [matchData.team_id, matchData.opponent_team_id].filter(Boolean));

    if (teamMembershipsError) {
      console.error("팀 소속 정보 조회 오류:", teamMembershipsError);
    }

    // 팀 소속 정보를 맵으로 구성
    const userTeamMap: Record<string, string> = {};
    teamMemberships?.forEach((membership) => {
      // 홈팀과 원정팀 괄다성을 위해 여기서 상대팀 정보를 선택적으로 사용
      if (membership.team_id === matchData.team_id) {
        userTeamMap[membership.user_id] = matchData.team_id;
      } else if (membership.team_id === matchData.opponent_team_id) {
        userTeamMap[membership.user_id] = matchData.opponent_team_id;
      }
    });

    console.log("사용자 팀 맵:", userTeamMap);

    // 참석 정보에 팀 정보 갱신
    const attendanceWithTeam = attendanceData.map((attendance) => {
      // 1. 이미 team_id가 있는 경우 유지
      if (attendance.team_id) {
        return attendance;
      }
      
      // 2. 사용자의 팀 소속 정보가 있는 경우 추가
      if (userTeamMap[attendance.user_id]) {
        return {
          ...attendance,
          team_id: userTeamMap[attendance.user_id],
        };
      }

      // 3. 그 외의 경우 그대로 반환
      return attendance;
    });

    console.log("처리된 참석 정보:", attendanceWithTeam);

    return attendanceWithTeam as MatchAttendance[];
  } catch (error) {
    console.error("참석 정보 조회 중 오류 발생:", error);
    throw error;
  }
}

// src/features/teams/api.ts 파일에서 updateMatchResult 함수 수정

export async function updateMatchResult(
  supabase: SupabaseClient,
  matchId: string,
  data: any,
  attendanceList: any[],
  teamInfo?: { homeTeamId: string; awayTeamId: string }
) {
  try {
    // 먼저 경기 정보를 가져옵니다
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        *,
        team:teams!matches_team_id_fkey(*),
        opponent_team:teams!matches_opponent_team_id_fkey(*)
      `
      )
      .eq("id", matchId)
      .single();

    if (matchError) throw matchError;

    console.log("경기 데이터:", matchData);

    // 홈팀과 원정팀 ID 설정
    const homeTeamId = teamInfo?.homeTeamId || matchData.team_id;
    const awayTeamId = teamInfo?.awayTeamId || matchData.opponent_team_id;

    console.log("홈팀 ID:", homeTeamId);
    console.log("원정팀 ID:", awayTeamId);

    // 1. 기존 데이터 삭제
    await Promise.all([
      supabase.from("match_goals").delete().eq("match_id", matchId),
      supabase.from("match_assists").delete().eq("match_id", matchId),
      supabase.from("match_mom").delete().eq("match_id", matchId),
    ]);

    // 데이터 형식 확인 및 추출
    const playerStats =
      data.playerStats || (data as Record<string, PlayerStats>);
    const matchScore = data.matchScore || { homeScore: 0, awayScore: 0 };

    // 2. 참석 상태 업데이트
    const attendanceResults = [];
    for (const [userId, stats] of Object.entries(playerStats)) {
      // 타입 단언 추가
      const playerStat = stats as PlayerStats;

      // 플레이어의 팀 정보 찾기
      const playerAttendance = attendanceList.find((a) => a.user_id === userId);
      const playerTeamId = playerAttendance?.team_id;

      console.log(`플레이어 ${userId}의 팀 ID:`, playerTeamId);

      // 먼저 기존 참석 정보 삭제
      const { error: deleteError } = await supabase
        .from("match_attendance")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", userId);

      console.log("stats", playerStat);

      // 새 참석 상태 추가
      const { error } = await supabase.from("match_attendance").insert({
        match_id: matchId,
        user_id: userId,
        status: playerStat.attendance,
        team_id: playerTeamId,
      });

      if (error) {
        console.error("참석 상태 업데이트 오류:", error);
        throw error;
      }

      attendanceResults.push({
        userId,
        status: playerStat.attendance,
        teamId: playerTeamId,
      });
    }

    // 3. 스코어 설정
    const homeScore = matchScore.homeScore;
    const awayScore = matchScore.awayScore;

    // 4. matches 테이블 업데이트
    await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_finished: true,
      })
      .eq("id", matchId);

    // 5. 골 기록 업데이트
    const goalInserts = [];
    for (const [userId, stats] of Object.entries(playerStats)) {
      // 타입 단언 추가
      const playerStat = stats as PlayerStats;

      // 플레이어의 팀 정보 찾기
      const playerAttendance = attendanceList.find((a) => a.user_id === userId);
      const playerTeamId = playerAttendance?.team_id;

      console.log(
        `골 수 기록 - 플레이어 ${userId}, 팀 ${playerTeamId}, 필드골: ${playerStat.fieldGoals}, 프리킥: ${playerStat.freeKickGoals}, 페널티: ${playerStat.penaltyGoals}`
      );

      if (playerStat.fieldGoals > 0) {
        for (let i = 0; i < playerStat.fieldGoals; i++) {
          goalInserts.push({
            match_id: matchId,
            user_id: userId,
            goal_type: "field",
            team_id: playerTeamId,
          });
        }
      }

      if (playerStat.freeKickGoals > 0) {
        for (let i = 0; i < playerStat.freeKickGoals; i++) {
          goalInserts.push({
            match_id: matchId,
            user_id: userId,
            goal_type: "freekick",
            team_id: playerTeamId,
          });
        }
      }

      if (playerStat.penaltyGoals > 0) {
        for (let i = 0; i < playerStat.penaltyGoals; i++) {
          goalInserts.push({
            match_id: matchId,
            user_id: userId,
            goal_type: "penalty",
            team_id: playerTeamId,
          });
        }
      }
    }

    // 골 일괄 삽입
    if (goalInserts.length > 0) {
      console.log("저장할 골 데이터:", goalInserts);
      const { data: goalData, error: goalError } = await supabase
        .from("match_goals")
        .insert(goalInserts)
        .select();

      if (goalError) {
        console.error("골 저장 오류:", goalError);
      } else {
        console.log("저장된 골 데이터:", goalData);
      }
    }

    // 6. 어시스트 업데이트
    const assistInserts = [];
    for (const [userId, stats] of Object.entries(playerStats)) {
      // 타입 단언 추가
      const playerStat = stats as PlayerStats;

      // 플레이어의 팀 정보 찾기
      const playerAttendance = attendanceList.find((a) => a.user_id === userId);
      const playerTeamId = playerAttendance?.team_id;

      console.log(
        `어시스트 기록 - 플레이어 ${userId}, 팀 ${playerTeamId}, 어시스트: ${playerStat.assists}`
      );

      if (playerStat.assists > 0) {
        for (let i = 0; i < playerStat.assists; i++) {
          assistInserts.push({
            match_id: matchId,
            user_id: userId,
            team_id: playerTeamId,
          });
        }
      }
    }

    // 어시스트 일괄 삽입
    if (assistInserts.length > 0) {
      console.log("저장할 어시스트 데이터:", assistInserts);
      const { data: assistData, error: assistError } = await supabase
        .from("match_assists")
        .insert(assistInserts)
        .select();

      if (assistError) {
        console.error("어시스트 저장 오류:", assistError);
      } else {
        console.log("저장된 어시스트 데이터:", assistData);
      }
    }

    // 7. MOM 업데이트
    for (const [userId, stats] of Object.entries(playerStats)) {
      // 타입 단언 추가
      const playerStat = stats as PlayerStats;

      if (playerStat.isMom) {
        // 플레이어의 팀 정보 찾기
        const playerAttendance = attendanceList.find(
          (a) => a.user_id === userId
        );
        const playerTeamId = playerAttendance?.team_id;

        console.log(`MOM 기록 - 플레이어 ${userId}, 팀 ${playerTeamId}`);

        const { data: momData, error: momError } = await supabase
          .from("match_mom")
          .insert({
            match_id: matchId,
            user_id: userId,
            team_id: playerTeamId,
          })
          .select();

        if (momError) {
          console.error("MOM 저장 오류:", momError);
        } else {
          console.log("저장된 MOM 데이터:", momData);
        }

        break; // MOM은 한 명만 있으므로 찾으면 루프 종료
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating match result:", error);
    throw error;
  }
}

// 매치 골 정보 조회
export async function getMatchGoals(supabase: any, matchId: string) {
  try {
    const { data, error } = await supabase
      .from("match_goals")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("골 정보 조회 중 오류 발생:", error);
      return [];
    }

    // 골 데이터가 있으면 프로필 정보 조회
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((goal) => goal.user_id))];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      if (profileError) {
        console.error("프로필 정보 조회 오류:", profileError);
        return data;
      }

      // 골 데이터에 프로필 정보 추가
      return data.map((goal) => {
        const profile = profiles.find((p) => p.id === goal.user_id);
        return {
          ...goal,
          profiles: profile,
        };
      });
    }

    return data || [];
  } catch (error) {
    console.error("골 정보 조회 중 예외 발생:", error);
    return [];
  }
}

// 매치 어시스트 정보 조회
export async function getMatchAssists(supabase: any, matchId: string) {
  try {
    const { data, error } = await supabase
      .from("match_assists")
      .select("*")
      .eq("match_id", matchId);

    if (error) {
      console.error("어시스트 정보 조회 중 오류 발생:", error);
      return [];
    }

    // 어시스트 데이터가 있으면 프로필 정보 조회
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((assist) => assist.user_id))];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      if (profileError) {
        console.error("프로필 정보 조회 오류:", profileError);
        return data;
      }

      // 어시스트 데이터에 프로필 정보 추가
      return data.map((assist) => {
        const profile = profiles.find((p) => p.id === assist.user_id);
        return {
          ...assist,
          profiles: profile,
        };
      });
    }

    return data || [];
  } catch (error) {
    console.error("어시스트 정보 조회 중 예외 발생:", error);
    return [];
  }
}

// 매치 MOM 정보 조회
export async function getMatchMom(supabase: any, matchId: string) {
  try {
    const { data, error } = await supabase
      .from("match_mom")
      .select("*")
      .eq("match_id", matchId)
      .maybeSingle();

    if (error) {
      console.error("MOM 정보 조회 중 오류 발생:", error);
      return null;
    }

    // MOM 데이터가 있으면 프로필 정보 조회
    if (data) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", data.user_id)
        .single();

      if (profileError) {
        console.error("프로필 정보 조회 오류:", profileError);
        return data;
      }

      // MOM 데이터에 프로필 정보 추가
      return {
        ...data,
        profiles: profile,
      };
    }

    return data;
  } catch (error) {
    console.error("MOM 정보 조회 중 예외 발생:", error);
    return null;
  }
}
