"use client";

import Image from "next/image";
import { Shield } from "lucide-react";
import { format } from "date-fns";
import { TeamMatch } from "@/features/teams/types/index";

interface MatchStatisticsProps {
  matchData: TeamMatch;
  headToHead: any;
  recentMeetings: any[];
  homeTeamRecent: any[];
  awayTeamRecent: any[];
  getMatchResult: (match: any, teamId: string) => string;
  getResultBadgeColor: (result: string) => string;
}

export function MatchStatistics({
  matchData,
  headToHead,
  recentMeetings,
  homeTeamRecent,
  awayTeamRecent,
  getMatchResult,
  getResultBadgeColor,
}: MatchStatisticsProps) {
  if (
    matchData.is_tbd ||
    (!matchData.opponent_team && !matchData.opponent_guest_team)
  ) {
    return null;
  }

  return (
    <>
      {/* Head to Head 통계 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Head to Head</h2>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {matchData.team?.emblem_url ? (
              <Image
                src={matchData.team?.emblem_url}
                alt={matchData.team?.name || ""}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <Shield className="w-6 h-6" />
            )}
            <span className="font-semibold">{matchData.team?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              {matchData.is_tbd
                ? "상대팀 미정"
                : matchData.opponent_team?.name ||
                  matchData.opponent_guest_team?.name ||
                  "게스트팀"}
            </span>
            {matchData.opponent_team?.emblem_url ? (
              <Image
                src={matchData.opponent_team?.emblem_url}
                alt={matchData.opponent_team?.name || ""}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <Shield className="w-6 h-6" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="text-5xl font-bold text-purple-900">
            {(headToHead?.teamAWins || 0) +
              (headToHead?.draws || 0) +
              (headToHead?.teamBWins || 0)}
          </div>
          <div className="text-sm text-gray-600">Played</div>
        </div>

        <div className="space-y-6">
          {/* Total Wins */}
          <div className="flex items-center gap-4">
            <div className="w-[45%]">
              <div className="h-8 bg-blue-100 rounded-lg relative">
                <div
                  className="h-full bg-blue-600 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamAWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamAWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Wins</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-600">
                {headToHead?.draws || 0}
              </div>
              <div className="text-sm text-gray-500">Draws</div>
            </div>
            <div className="w-[45%]">
              <div className="h-8 bg-red-100 rounded-lg relative">
                <div
                  className="h-full bg-red-600 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamBWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamBWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1 text-right">
                Total Wins
              </div>
            </div>
          </div>

          {/* Home */}
          <div className="flex items-center gap-4">
            <div className="w-[45%]">
              <div className="h-8 bg-blue-50 rounded-lg relative">
                <div
                  className="h-full bg-blue-400 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamAHomeWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamAHomeWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Home</div>
            </div>
            <div className="w-[10%]" />
            <div className="w-[45%]">
              <div className="h-8 bg-red-50 rounded-lg relative">
                <div
                  className="h-full bg-red-400 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamBHomeWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamBHomeWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1 text-right">Home</div>
            </div>
          </div>

          {/* Away */}
          <div className="flex items-center gap-4">
            <div className="w-[45%]">
              <div className="h-8 bg-blue-50 rounded-lg relative">
                <div
                  className="h-full bg-blue-300 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamAAwayWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamAAwayWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Away</div>
            </div>
            <div className="w-[10%]" />
            <div className="w-[45%]">
              <div className="h-8 bg-red-50 rounded-lg relative">
                <div
                  className="h-full bg-red-300 rounded-lg"
                  style={{
                    width: `${
                      ((headToHead?.teamBAwayWins || 0) * 100) /
                      ((headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0) || 1)
                    }%`,
                  }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {headToHead?.teamBAwayWins || 0}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1 text-right">Away</div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 상대전적 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">최근 상대전적</h2>
        {recentMeetings && recentMeetings.length > 0 ? (
          <div className="space-y-3">
            {recentMeetings.map((match) => {
              // 우리팀이 홈팀인지 확인
              const isOurTeamHome = match.team_id === matchData.team?.id;

              // 상대팀 정보 가져오기 (등록팀 또는 게스트팀)
              const opponentName = isOurTeamHome
                ? match.opponent_team?.name ||
                  match.opponent_guest_team?.name ||
                  "상대팀"
                : match.team?.name || "우리팀";

              // 우리팀 스코어와 상대팀 스코어 결정
              const ourScore = isOurTeamHome
                ? match.home_score
                : match.away_score;
              const theirScore = isOurTeamHome
                ? match.away_score
                : match.home_score;

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-2 border-b"
                >
                  <div className="text-sm">
                    {format(new Date(match.match_date), "yyyy.MM.dd")}
                  </div>
                  <div className="font-bold">
                    {matchData.team?.name} {ourScore} - {theirScore}{" "}
                    {opponentName}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500">상대전적이 없습니다.</div>
        )}
      </div>

      {/* 양팀 최근 5경기 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            {matchData.team?.name} 최근 5경기
          </h2>
          {homeTeamRecent && homeTeamRecent.length > 0 ? (
            <div className="space-y-3">
              {homeTeamRecent.map((match) => {
                const result = getMatchResult(match, matchData.team_id);
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-2 border-b"
                  >
                    <div className="text-sm">
                      {format(new Date(match.match_date), "yyyy.MM.dd")}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold">
                        {match.home_score} - {match.away_score}
                      </div>
                      <div
                        className={`font-bold ${getResultBadgeColor(result)}`}
                      >
                        {result}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              최근 진행한 경기가 없습니다.
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">
            {matchData.opponent_team?.name || "상대팀"} 최근 5경기
          </h2>
          {awayTeamRecent && awayTeamRecent.length > 0 ? (
            <div className="space-y-3">
              {awayTeamRecent.map((match) => {
                const result = getMatchResult(
                  match,
                  matchData.opponent_team?.id || ""
                );
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-2 border-b"
                  >
                    <div className="text-sm">
                      {format(new Date(match.match_date), "yyyy.MM.dd")}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold">
                        {match.home_score} - {match.away_score}
                      </div>
                      <div
                        className={`font-bold ${getResultBadgeColor(result)}`}
                      >
                        {result}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              최근 진행한 경기가 없습니다.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
