import { supabase } from '@/lib/supabase/client';
import { Team, TeamMember, TeamInvite } from './types';

export const teamsApi = {
  // 팀 생성
  async createTeam(name: string, description?: string, logo_url?: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        logo_url,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Team;
  },

  // 팀 정보 수정
  async updateTeam(teamId: string, updates: Partial<Team>) {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data as Team;
  },

  // 팀원 초대
  async inviteTeamMember(teamId: string, email: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        email,
        invited_by: userData.user.id
      })
      .select()
      .single();

    console.log("invite data", data);
    console.log("invite error", error);

    if (error) throw error;
    return data as TeamInvite;
  },

  // 팀원 강퇴
  async removeTeamMember(teamId: string, userId: string) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    console.log("removeTeamMember teamId", teamId);
    console.log("removeTeamMember userId", userId);
    console.log("removeTeamMember error", error);

    if (error) throw error;
  },

  // 팀 가입 요청
  async requestJoinTeam(teamId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as TeamMember;
  },

  // 가입 요청 승인
  async approveJoinRequest(teamId: string, userId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as TeamMember;
  },

  // 팀 목록 조회
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Teams query error:', error); // 에러 상세 정보 출력
      throw error;
    }

    return (data ?? []) as Team[]; // 데이터가 없으면 빈 배열 반환
  },

  // 내 팀 목록 조회
  async getMyTeams() {
    // 현재 인증된 사용자의 정보를 가져옴
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user.id;

    console.log("userId", userId);

    // 팀 멤버 테이블에서 가입 상태가 active인 경우만 join 수행
    const { data, error } = await supabase
      .from('team_members')
      .select('teams (*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    console.log("my teams data", data);
    console.log("my teams error", error);
    if (error) throw error;

    // 각 팀원 로우(row)에 auto-generated 관계로 채워진 teams 필드를 추출
    return (data ?? []).flatMap((row: any) => row.teams) as Team[];
  },

  // 팀 상세 조회
  async getTeam(teamId: string) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    console.log("data", data);
    console.log("error", error);

    if (error) throw error;
    return data as Team;
  },

  // 팀 멤버 목록 조회 (프로필 정보 포함)
  async getTeamMembers(teamId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        id,
        team_id,
        user_id,
        role,
        status,
        joined_at,
        created_at,
        updated_at,
        profiles!team_members_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    console.log("team members data", data);
    console.log("team members error", error);

    if (error) throw error;
    return data as unknown as TeamMember[];
  },

  // 내가 받은 초대 목록 조회
  async getMyInvites() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('team_invites')
      .select(`
        id,
        team_id,
        email,
        invited_by,
        expires_at,
        created_at,
        teams!team_invites_team_id_fkey (
          id,
          name
        ),
        profiles!team_invites_invited_by_fkey (
          id,
          username
        )
      `)
      .eq('email', userData.user.email);

    console.log("invites data", data);
    console.log("invites error", error);

    if (error) throw error;
    return data as unknown as TeamInvite[];
  },

  // 초대 수락
  async acceptInvite(inviteId: string) {
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    console.log("invite", invite);
    console.log("inviteError", inviteError);

    if (inviteError) throw inviteError;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    console.log("userData on acceptInvite", userData);
    console.log("userError on acceptInvite", userError);

    // 팀 멤버로 추가
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: userData.user.id,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    console.log("member", member);
    console.log("memberError", memberError);  

    if (memberError) throw memberError;

    // 초대 삭제
    const { error: deleteError } = await supabase
      .from('team_invites')
      .delete()
      .eq('id', inviteId);

    console.log("deleteError", deleteError);

    if (deleteError) throw deleteError;
  },
}; 