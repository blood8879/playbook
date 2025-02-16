import { SupabaseClient } from "@supabase/supabase-js";
import { TeamFormData, Team } from "./types";
import { TeamMember, TeamMemberRole, TeamMemberStatus } from "./types/index";

export async function searchTeams(
  supabase: SupabaseClient,
  searchQuery: string
) {
  const query = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchQuery) {
    query.ilike("name", `%${searchQuery}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Team[];
}

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
      profiles:profiles!user_id(
        id,
        email,
        raw_user_meta_data->>name,
        raw_user_meta_data->>avatar_url
      )
      `
    )
    .eq("team_id", teamId)
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  console.log("get Team Members data", data);
  console.log("get Team Members error", error);

  if (error) {
    console.error("error", error);
    return null;
  }

  return data;
};

export async function updateTeamMember(
  supabase: SupabaseClient,
  memberId: string,
  data: { role?: TeamMemberRole; status?: TeamMemberStatus }
) {
  const { error } = await supabase
    .from("team_members")
    .update(data)
    .eq("id", memberId);

  if (error) throw error;
}

export async function inviteTeamMember(
  supabase: SupabaseClient,
  teamId: string,
  email: string
) {
  // 1. 먼저 해당 이메일의 사용자를 찾습니다
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError) throw userError;
  if (!user) throw new Error("사용자를 찾을 수 없습니다");

  // 2. 이미 팀 멤버인지 확인
  const { data: existingMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (memberError && memberError.code !== "PGRST116") throw memberError;
  if (existingMember) throw new Error("이미 팀 멤버입니다");

  // 3. 초대를 생성합니다
  const { error: inviteError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      inviter_id: auth.uid(),
      invitee_id: user.id,
    });

  if (inviteError) throw inviteError;
}

export async function removeTeamMember(
  supabase: SupabaseClient,
  memberId: string
) {
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

export async function getMyInvitations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("team_invitations")
    .select(
      `
      *,
      team:team_id (name),
      inviter:inviter_id (
        email,
        raw_user_meta_data->name as name
      )
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as TeamInvitation[];
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
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: invitation.invitee_id,
      status: "active",
    });

    if (memberError) throw memberError;
  }

  // 초대 상태 업데이트
  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({
      status: accept ? "accepted" : "rejected",
    })
    .eq("id", invitationId);

  if (updateError) throw updateError;
}
