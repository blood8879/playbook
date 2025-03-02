/**
 * @ai_context
 * This helper just fetches all matches at once for a given team. We'll unify the data
 * so the parent can pass them to TeamSchedule and TeamMatches, preventing different loading times.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { TeamMatch } from "../types/";

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

  // 각 경기 데이터에 is_home 속성 추가
  const matchesWithIsHome = data.map((match) => ({
    ...match,
    is_home: Boolean(match.is_home), // 필드가 있으면 그 값 사용, 없으면 기본값으로 변환
  }));

  return matchesWithIsHome as TeamMatch[];
}
