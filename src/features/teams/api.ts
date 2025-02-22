import { SupabaseClient } from "@supabase/supabase-js";
import { TeamFormData, Team, TeamInvitation, TeamMatch } from "./types";
import { TeamMemberRole, TeamMemberStatus } from "./types/index";

// export async function searchTeams(
//   supabase: SupabaseClient,
//   searchQuery: string
// ) {
//   const query = supabase
//     .from("teams")
//     .select("*")
//     .order("created_at", { ascending: false });

//   if (searchQuery) {
//     query.ilike("name", `%${searchQuery}%`);
//   }

//   const { data, error } = await query;
//   if (error) throw error;
//   return data as Team[];
// }

export async function createTeam(
  supabase: SupabaseClient,
  data: TeamFormData,
  emblemFile: File | null,
  userId: string
) {
  let emblem_url = null;

  if (emblemFile) {
    const fileExt = emblemFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `team-emblems/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("teams")
      .upload(filePath, emblemFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("teams")
      .getPublicUrl(filePath);

    emblem_url = urlData.publicUrl;
  }

  // Supabase 트랜잭션 사용
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

  if (createError) throw createError;

  return team;
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

  console.log("data", data);
  console.log("updatedMember", updatedMember);
  console.log("error", error);

  if (error) throw error;
  return updatedMember;
};

export async function inviteTeamMember(
  supabase: SupabaseClient,
  teamId: string,
  email: string,
  inviterId: string
) {
  // 1. 해당 이메일의 사용자를 찾습니다.
  const { data: user, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userError) throw userError;
  if (!user) throw new Error("사용자를 찾을 수 없습니다");

  // 2. 이미 팀 멤버인지 확인합니다.
  const { data: existingMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (memberError && memberError.code !== "PGRST116") throw memberError;
  if (existingMember) throw new Error("이미 팀 멤버입니다");

  // 3. 초대를 생성합니다.
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

  // 트랜잭션으로 처리
  if (accept) {
    // 초대를 수락하면 team_members에 추가
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

  // 초대 상태 업데이트
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
        email,
        name,
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
    // 팀 멤버로 추가
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

  // 가입 신청 상태 업데이트
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
        opponent_team:teams!matches_opponent_team_id_fkey(*),
        opponent_guest_team:guest_clubs!matches_opponent_guest_team_id_fkey(*)
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