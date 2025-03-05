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
  // 홈 경기 (팀이 team_id인 경우)
  const { data: homeMatches, error: homeError } = await supabase
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

  if (homeError) throw homeError;

  // 원정 경기 (팀이 opponent_team_id인 경우)
  const { data: awayMatches, error: awayError } = await supabase
    .from("matches")
    .select(
      `
        *,
        team:teams!matches_team_id_fkey(*),
        opponent_guest_team:guest_clubs!matches_opponent_guest_team_id_fkey(*),
        stadium:stadiums(*)
      `
    )
    .eq("opponent_team_id", teamId)
    .order("match_date", { ascending: true });

  if (awayError) throw awayError;

  // 홈 경기에는 is_home = true 설정
  const homeMatchesWithFlag = homeMatches.map((match) => ({
    ...match,
    is_home: true,
  }));

  // 원정 경기에는 is_home = false 설정
  const awayMatchesWithFlag = awayMatches.map((match) => ({
    ...match,
    is_home: false,
    // 원정 경기인 경우 opponent_team을 사용자의 팀으로 설정
    opponent_team: match.team,
    team: { id: teamId }, // 최소한의 팀 정보 설정
  }));

  // 모든 경기 병합 및 날짜순 정렬
  const allMatches = [...homeMatchesWithFlag, ...awayMatchesWithFlag].sort(
    (a, b) =>
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  return allMatches as TeamMatch[];
}
