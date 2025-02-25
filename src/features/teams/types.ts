export interface TeamMatch {
  id: string;
  team_id: string;
  match_date: string;
  opponent_team_id: string | null;
  opponent_guest_team_id: string | null;
  is_tbd: boolean;
  venue: string;
  description: string | null;
  competition_type: string;
  game_type: string;
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
  };
  status: string;
  participants_count: number;
  registration_deadline: string | null;
}
