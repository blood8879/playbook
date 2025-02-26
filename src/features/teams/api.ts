import { SupabaseClient } from "@supabase/supabase-js";
import {
  TeamFormData,
  Team,
  TeamInvitation,
  TeamMatch,
  HeadToHeadStats,
} from "./types/index";
import { TeamMemberRole, TeamMemberStatus } from "./types/index";

/**
 * @ai_context
 * Here we add new functions for head-to-head stats and match attendance management.
 */

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
  const { data, error } = await supabase
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

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as TeamMatch;
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
  // 임시로 더미 데이터 반환
  return {
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
};

/**
 * get last N matches between two teams
 */
export async function getLastMatchesBetweenTeams(
  supabase: SupabaseClient,
  teamAId: string,
  teamBId: string,
  options?: { isFinished?: boolean }
) {
  const query = supabase
    .from("matches")
    .select("*")
    .or(`team_id.eq.${teamAId},opponent_team_id.eq.${teamAId}`)
    .or(`team_id.eq.${teamBId},opponent_team_id.eq.${teamBId}`)
    .order("match_date", { ascending: false })
    .limit(5);

  if (options?.isFinished) {
    query.eq("is_finished", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * get last N matches of a team
 */
export async function getLastMatchesOfTeam(
  supabase: SupabaseClient,
  teamId: string,
  options?: { isFinished?: boolean }
) {
  const query = supabase
    .from("matches")
    .select("*")
    .or(`team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
    .order("match_date", { ascending: false })
    .limit(5);

  if (options?.isFinished) {
    query.eq("is_finished", true);
  }

  const { data, error } = await query;
  if (error) throw error;
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
  // use onConflict for proper upsert
  const { error } = await supabase.from("match_attendance").upsert(
    {
      match_id: matchId,
      user_id: userId,
      status,
    },
    { onConflict: "match_id,user_id" }
  );

  if (error) throw error;
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
) {
  const { data, error } = await supabase
    .from("match_attendance")
    .select(
      `
      *,
      profiles (
        id,
        email,
        name,
        team_members (
          team_id
        )
      )
    `
    )
    .eq("match_id", matchId);

  console.log("data", data);
  console.log("error", error);

  if (error) throw error;

  // team_id 정보를 match_attendance 객체에 포함
  return data.map((attendance) => ({
    ...attendance,
    team_id: attendance.profiles?.team_members?.[0]?.team_id,
  }));
}

export async function updateMatchResult(
  supabase: SupabaseClient,
  matchId: string,
  data: any,
  attendanceList: any[]
) {
  try {
    // 1. 기존 데이터 삭제
    await Promise.all([
      supabase.from("match_goals").delete().eq("match_id", matchId),
      supabase.from("match_assists").delete().eq("match_id", matchId),
      supabase.from("match_mom").delete().eq("match_id", matchId),
    ]);

    // 2. 참석 상태 업데이트
    const attendancePromises = Object.entries(data).map(
      ([userId, stats]: [string, any]) =>
        supabase.from("match_attendance").upsert({
          match_id: matchId,
          user_id: userId,
          status: stats.attendance,
        })
    );

    // 3. 팀별 골 수 계산
    let homeScore = 0;
    let awayScore = 0;

    // 매치 정보 조회
    const { data: match } = await supabase
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

    // 각 선수의 골 수 계산 및 팀별 합산
    Object.entries(data).forEach(([userId, stats]: [string, any]) => {
      const totalGoals =
        (stats.fieldGoals || 0) +
        (stats.freeKickGoals || 0) +
        (stats.penaltyGoals || 0);

      // 선수의 팀 확인
      const isHomeTeam = attendanceList.find(
        (a) => a.user_id === userId && a.team_id === match.team_id
      );

      if (isHomeTeam) {
        homeScore += totalGoals;
      } else {
        awayScore += totalGoals;
      }
    });

    // 4. matches 테이블 업데이트
    await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_finished: true,
      })
      .eq("id", matchId);

    console.log("homeScore", homeScore);
    console.log("awayScore", awayScore);
    console.log("match", match);

    // 5. 골 기록 업데이트
    const goalPromises = Object.entries(data).flatMap(
      ([userId, stats]: [string, any]) => {
        const goals = [];
        if (stats.fieldGoals > 0) {
          for (let i = 0; i < stats.fieldGoals; i++) {
            goals.push({
              match_id: matchId,
              user_id: userId,
              goal_type: "field",
            });
          }
        }
        if (stats.freeKickGoals > 0) {
          for (let i = 0; i < stats.freeKickGoals; i++) {
            goals.push({
              match_id: matchId,
              user_id: userId,
              goal_type: "freekick",
            });
          }
        }
        if (stats.penaltyGoals > 0) {
          for (let i = 0; i < stats.penaltyGoals; i++) {
            goals.push({
              match_id: matchId,
              user_id: userId,
              goal_type: "penalty",
            });
          }
        }
        return goals.map((goal) => supabase.from("match_goals").insert(goal));
      }
    );

    // 어시스트 업데이트
    const assistPromises = Object.entries(data).flatMap(
      ([userId, stats]: [string, any]) => {
        const assists = [];
        if (stats.assists > 0) {
          for (let i = 0; i < stats.assists; i++) {
            assists.push({
              match_id: matchId,
              user_id: userId,
            });
          }
        }
        return assists.map((assist) =>
          supabase.from("match_assists").insert(assist)
        );
      }
    );

    // MOM 업데이트
    const momUser = Object.entries(data).find(
      ([_, stats]: [string, any]) => stats.isMom
    )?.[0];
    if (momUser) {
      await supabase.from("match_mom").insert({
        match_id: matchId,
        user_id: momUser,
      });
    }

    // 모든 업데이트 실행
    await Promise.all([
      ...attendancePromises,
      ...goalPromises,
      ...assistPromises,
    ]);

    return true;
  } catch (error) {
    console.error("Error updating match result:", error);
    throw error;
  }
}
