"use client";

import Image from "next/image";
import { Shield, Calendar, TrendingUp, History, Users } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TeamMatch } from "@/features/teams/types/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  if (
    matchData.is_tbd ||
    (!matchData.opponent_team && !matchData.opponent_guest_team)
  ) {
    return null;
  }

  // 총 경기 수 계산
  const totalMatches =
    (headToHead?.teamAWins || 0) +
    (headToHead?.draws || 0) +
    (headToHead?.teamBWins || 0);

  // 승률 계산 (0으로 나누기 방지)
  const teamAWinPercentage = totalMatches
    ? ((headToHead?.teamAWins || 0) * 100) / totalMatches
    : 0;
  const teamBWinPercentage = totalMatches
    ? ((headToHead?.teamBWins || 0) * 100) / totalMatches
    : 0;
  const drawPercentage = totalMatches
    ? ((headToHead?.draws || 0) * 100) / totalMatches
    : 0;

  return (
    <>
      {/* Head to Head 통계 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center text-purple-900 mb-6">
          Head-to-Head
        </h2>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
          {/* 팀 이름과 로고 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="min-w-[48px]">
                {matchData.team?.emblem_url ? (
                  <Image
                    src={matchData.team?.emblem_url}
                    alt={matchData.team?.name || ""}
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
              <span className="font-bold text-xl">{matchData.team?.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">
                {matchData.is_tbd
                  ? "상대팀 미정"
                  : matchData.opponent_team?.name ||
                    matchData.opponent_guest_team?.name ||
                    "게스트팀"}
              </span>
              <div className="min-w-[48px]">
                {matchData.opponent_team?.emblem_url ? (
                  <Image
                    src={matchData.opponent_team?.emblem_url}
                    alt={matchData.opponent_team?.name || ""}
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 통계 데이터 */}
          <div className="px-6 py-8">
            <div className="text-center mb-6">
              <div className="text-gray-700 font-medium mb-2">Played</div>
              <div className="text-[140px] font-bold text-purple-900 leading-none">
                {totalMatches}
              </div>
            </div>

            <div className="space-y-6">
              {/* 총 승리 */}
              <div className="flex items-center">
                <div className="w-10 font-bold text-xl text-right pr-3">
                  {headToHead?.teamAWins || 0}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-red-600 rounded-sm absolute left-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamAWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-32 text-center font-medium px-3">
                  Total Wins
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-amber-500 rounded-sm absolute right-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamBWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-10 font-bold text-xl text-left pl-3">
                  {headToHead?.teamBWins || 0}
                </div>
              </div>

              {/* 홈 */}
              <div className="flex items-center">
                <div className="w-10 font-bold text-xl text-right pr-3">
                  {headToHead?.teamAHomeWins || 0}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-red-600 rounded-sm absolute left-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamAHomeWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-32 text-center font-medium px-3">Home</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-amber-500 rounded-sm absolute right-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamBHomeWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-10 font-bold text-xl text-left pl-3">
                  {headToHead?.teamBHomeWins || 0}
                </div>
              </div>

              {/* 원정 */}
              <div className="flex items-center">
                <div className="w-10 font-bold text-xl text-right pr-3">
                  {headToHead?.teamAAwayWins || 0}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-red-600 rounded-sm absolute left-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamAAwayWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-32 text-center font-medium px-3">Away</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded-sm relative">
                    <div
                      className="h-8 bg-amber-500 rounded-sm absolute right-0 top-0"
                      style={{
                        width: `${
                          ((headToHead?.teamBAwayWins || 0) * 100) /
                          Math.max(totalMatches, 1)
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="w-10 font-bold text-xl text-left pl-3">
                  {headToHead?.teamBAwayWins || 0}
                </div>
              </div>

              {/* 무승부 */}
              <div className="text-center mt-4">
                <div className="font-medium">Draws</div>
                <div className="font-bold text-xl">
                  {headToHead?.draws || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 상대전적 */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-center text-purple-900 mb-6">
          Recent Meetings
        </h2>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {recentMeetings && recentMeetings.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentMeetings.map((match, index) => {
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
                  <div key={match.id} className="p-4 hover:bg-gray-50">
                    <div className="mb-2">
                      <div className="text-gray-700 font-medium mb-1">
                        {format(
                          new Date(match.match_date),
                          "EEEE dd MMMM yyyy",
                          { locale: ko }
                        )}
                      </div>
                      <div className="text-gray-600 text-sm">
                        {match.venue || "-"}, {match.stadium?.address || "-"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* 홈팀 정보 */}
                      <div className="flex items-center gap-2">
                        <div className="min-w-[32px]">
                          {isOurTeamHome ? (
                            matchData.team?.emblem_url ? (
                              <Image
                                src={matchData.team?.emblem_url}
                                alt={matchData.team?.name || ""}
                                width={32}
                                height={32}
                              />
                            ) : (
                              <Shield className="w-8 h-8 text-gray-500" />
                            )
                          ) : match.opponent_team?.emblem_url ? (
                            <Image
                              src={match.opponent_team?.emblem_url}
                              alt={match.opponent_team?.name || ""}
                              width={32}
                              height={32}
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <div className="font-bold">
                          {isOurTeamHome ? matchData.team?.name : opponentName}
                        </div>
                      </div>

                      {/* 스코어 */}
                      <div className="px-4 py-2 bg-purple-900 text-white font-bold rounded-md">
                        {match.home_score || 0} - {match.away_score || 0}
                      </div>

                      {/* 원정팀 정보 */}
                      <div className="flex items-center gap-2">
                        <div className="font-bold">
                          {isOurTeamHome ? opponentName : matchData.team?.name}
                        </div>
                        <div className="min-w-[32px]">
                          {!isOurTeamHome ? (
                            matchData.team?.emblem_url ? (
                              <Image
                                src={matchData.team?.emblem_url}
                                alt={matchData.team?.name || ""}
                                width={32}
                                height={32}
                              />
                            ) : (
                              <Shield className="w-8 h-8 text-gray-500" />
                            )
                          ) : match.opponent_team?.emblem_url ? (
                            <Image
                              src={match.opponent_team?.emblem_url}
                              alt={match.opponent_team?.name || ""}
                              width={32}
                              height={32}
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                        onClick={() => router.push(`/matches/${match.id}`)}
                        aria-label="경기 결과 페이지로 이동"
                      >
                        <span className="text-lg text-purple-800">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              상대전적이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 양팀 최근 5경기 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 홈팀 최근 경기 */}
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {matchData.team?.name} 최근 성적
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {homeTeamRecent && homeTeamRecent.length > 0 ? (
              <div className="divide-y">
                {homeTeamRecent.map((match) => {
                  const result = getMatchResult(match, matchData.team_id);
                  const isHome = match.team_id === matchData.team_id;
                  // 상대팀 정보 가져오기
                  const opponentTeam = isHome
                    ? match.opponent_team?.name ||
                      match.opponent_guest_team?.name ||
                      "상대팀"
                    : match.team?.name || "상대팀";

                  // 결과에 따른 배경색 설정
                  let resultBg = "";
                  if (result === "W") {
                    resultBg = "#13CF00";
                  } else if (result === "L") {
                    resultBg = "#D81920";
                  } else {
                    resultBg = "#C3B3C5";
                  }

                  return (
                    <div
                      key={match.id}
                      className="flex items-center p-4 hover:bg-gray-50"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-4"
                        style={{ backgroundColor: resultBg }}
                      >
                        {result}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">
                            {isHome ? "(H)" : "(A)"}
                          </span>
                          <span className="font-medium">{opponentTeam}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(match.match_date), "yyyy.MM.dd")}
                        </div>
                      </div>
                      <div className="font-bold bg-gray-800 text-white rounded px-3 py-1">
                        {match.home_score} - {match.away_score}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                최근 진행한 경기가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 원정팀 최근 경기 */}
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {matchData.opponent_team?.name ||
                matchData.opponent_guest_team?.name ||
                "상대팀"}
              최근 성적
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {awayTeamRecent && awayTeamRecent.length > 0 ? (
              <div className="divide-y">
                {awayTeamRecent.map((match) => {
                  const result = getMatchResult(
                    match,
                    matchData.opponent_team?.id || ""
                  );
                  const isHome = match.team_id === matchData.opponent_team?.id;
                  // 상대팀 정보 가져오기
                  const opponentTeam = isHome
                    ? match.opponent_team?.name ||
                      match.opponent_guest_team?.name ||
                      "상대팀"
                    : match.team?.name || "상대팀";

                  // 결과에 따른 배경색 설정
                  let resultBg = "";
                  if (result === "W") {
                    resultBg = "#13CF00";
                  } else if (result === "L") {
                    resultBg = "#D81920";
                  } else {
                    resultBg = "#C3B3C5";
                  }

                  return (
                    <div
                      key={match.id}
                      className="flex items-center p-4 hover:bg-gray-50"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-4"
                        style={{ backgroundColor: resultBg }}
                      >
                        {result}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">
                            {isHome ? "(H)" : "(A)"}
                          </span>
                          <span className="font-medium">{opponentTeam}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(match.match_date), "yyyy.MM.dd")}
                        </div>
                      </div>
                      <div className="font-bold bg-gray-800 text-white rounded px-3 py-1">
                        {match.home_score} - {match.away_score}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                최근 진행한 경기가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
