/**
 * @ai_context
 * This helper just fetches all matches at once for a given team. We'll unify the data
 * so the parent can pass them to TeamSchedule and TeamMatches, preventing different loading times.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { TeamMatch } from "../types";

export async function getAllMatchesForTeam(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
        *,
        opponent_team:teams!matches_opponent_team_id_fkey(*),
        opponent_guest_team:guest_clubs!matches_opponent_guest_team_id_fkey(*),
        stadium:stadiums(*)
      `
    )
    .eq("team_id", teamId)
    .order("match_date", { ascending: true });

  if (error) throw error;
  return data as TeamMatch[];
}
