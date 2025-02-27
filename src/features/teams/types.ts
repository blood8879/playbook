export interface Team {
  id: string;
  name: string;
  description: string | null;
  emblem_url: string | null;
  leader_id: string;
  created_at: string;
  updated_at: string;
  city: string;
  gu: string;
}

export interface TeamMatch {
  id: string;
  team_id: string;
  match_date: string;
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
  created_at: string;
  updated_at: string;
  team?: Team;
  opponent_team?: Team;
  opponent_guest_team?: {
    id: string;
    name: string;
    description: string | null;
    emblem_url: string | null;
    team_id: string;
    created_at: string;
  };
  stadium?: {
    id: string;
    name: string;
    address: string;
    team_id: string;
    description: string | null;
  };
  status: string;
  participants_count: number;
  registration_deadline: string | null;
}
