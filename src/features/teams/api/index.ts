import { SupabaseClient } from "@supabase/supabase-js";

export async function getLastMatchesOfTeam(
  supabase: SupabaseClient,
  teamId: string,
  options?: { isFinished?: boolean }
) {
  const { data, error } = await supabase
    .from("matches")
    .select(
      `
      *,
      team:teams!matches_team_id_fkey(*),
      opponent_team:teams!matches_opponent_team_id_fkey(*),
      opponent_guest_team:guest_clubs(*),
      home_score,
      away_score
    `
    )
    .eq("team_id", teamId)
    .eq("is_finished", true)
    .order("match_date", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}
