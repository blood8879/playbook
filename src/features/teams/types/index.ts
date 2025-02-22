import { z } from "zod";
import { Position } from "../constants/positions";

export const teamSchema = z.object({
  name: z
    .string()
    .min(2, "2글자 이상 입력해주세요")
    .max(50, "50글자 이하로 입력해주세요"),
  description: z.string().max(500, "500자 이하로 입력해주세요").optional(),
  city: z.string().min(1, "시/도를 선택해주세요"),
  gu: z.string().min(1, "구를 선택해주세요"),
});

export type TeamFormData = z.infer<typeof teamSchema>;

export interface Team {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  city: string;
  gu: string;
  leader_id: string;
  home_stadium: string | null;
}

export type TeamMemberRole = "owner" | "manager" | "member";
export type TeamMemberStatus = "pending" | "active" | "inactive";

export interface TeamMember {
  id: string;
  team_id: string;
  profiles: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  role: TeamMemberRole;
  positions?: Position[];
  number?: number;
}

export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

export interface TeamInvitation {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  // join된 데이터
  team: {
    name: string;
  };
  inviter: {
    email: string;
    name: string;
  };
}

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  user_id: string;
  preferred_positions: Position[];
  preferred_number: number;
  message?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Stadium {
  id: string;
  name: string;
  address: string;
  description: string | null;
}

/**
 * @ai_context
 * Added below interface for match details
 */
export interface TeamMatch {
  id: string;
  team_id: string;
  match_date: string;
  registration_deadline: string;
  opponent_team_id: string | null;
  opponent_guest_team_id: string | null;
  is_tbd: boolean;
  venue: string;
  description: string | null;
  competition_type: "friendly" | "league" | "cup";
  game_type: "5vs5" | "6vs6" | "11vs11";
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  // optional joined data
  opponent_team?: Team;
  opponent_guest_team?: {
    id: string;
    name: string;
    description: string | null;
  };
}