"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getHeadToHeadStats,
  getLastMatchesBetweenTeams,
  getLastMatchesOfTeam,
} from "@/features/teams/api";
import { TeamMatch } from "@/features/teams/types/index";

export function useMatchStatistics(matchData: TeamMatch | undefined) {
  const { supabase } = useSupabase();

  // Head to Head 통계
  const { data: headToHead, isLoading: isHeadToHeadLoading } = useQuery({
    queryKey: [
      "headToHead",
      matchData?.team_id,
      matchData?.opponent_team_id,
      matchData?.opponent_guest_team_id,
    ],
    queryFn: async () => {
      const opponentId =
        matchData?.opponent_team_id || matchData?.opponent_guest_team_id;

      return getHeadToHeadStats(
        supabase,
        matchData?.team_id || "",
        opponentId || ""
      );
    },
    enabled:
      !!matchData?.team_id &&
      (!!matchData?.opponent_team_id || !!matchData?.opponent_guest_team_id) &&
      !matchData?.is_tbd,
  });

  // 최근 상대전적
  const { data: recentMeetings } = useQuery({
    queryKey: ["recentMeetings", matchData?.id],
    queryFn: () => {
      const teamId = matchData?.team?.id || "";
      const opponentId =
        matchData?.opponent_team?.id ||
        matchData?.opponent_guest_team?.id ||
        "";

      return getLastMatchesBetweenTeams(supabase, teamId, opponentId, {
        isFinished: true,
      });
    },
    enabled:
      !!matchData?.team?.id &&
      (!!matchData?.opponent_team?.id ||
        !!matchData?.opponent_guest_team?.id) &&
      !matchData?.is_tbd,
  });

  // 홈팀 최근 경기
  const { data: homeTeamRecent } = useQuery({
    queryKey: ["homeTeamRecent", matchData?.id],
    queryFn: () =>
      getLastMatchesOfTeam(supabase, matchData?.team?.id || "", {
        isFinished: true,
      }),
    enabled: !!matchData?.team?.id && !matchData?.is_tbd,
  });

  // 원정팀 최근 경기
  const { data: awayTeamRecent } = useQuery({
    queryKey: ["awayTeamRecent", matchData?.id],
    queryFn: () =>
      getLastMatchesOfTeam(supabase, matchData?.opponent_team?.id || "", {
        isFinished: true,
      }),
    enabled: !!matchData?.opponent_team?.id && !matchData?.is_tbd,
  });

  // 경기 결과 포맷 헬퍼 함수
  const getMatchResult = (match: any, teamId: string) => {
    if (match.team_id === teamId) {
      // 홈팀인 경우
      if (match.home_score > match.away_score) return "W";
      if (match.home_score < match.away_score) return "L";
      return "D";
    } else {
      // 원정팀인 경우
      if (match.home_score < match.away_score) return "W";
      if (match.home_score > match.away_score) return "L";
      return "D";
    }
  };

  // 결과 배지 색상 함수
  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case "W":
        return "text-green-600";
      case "L":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return {
    headToHead,
    isHeadToHeadLoading,
    recentMeetings,
    homeTeamRecent,
    awayTeamRecent,
    getMatchResult,
    getResultBadgeColor,
  };
}
