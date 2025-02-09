export type TeamRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'pending';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: MemberStatus;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
  teams: {
    id: string;
    name: string;
  };
  profiles: {
    id: string;
    username: string | null;
  };
}

export interface TeamMemberWithProfile extends TeamMember {
  profiles: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
} 

export interface TeamInviteWithProfile extends TeamInvite {
  profiles: {
    id: string;
    username: string | null;
  };
}
