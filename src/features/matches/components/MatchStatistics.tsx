"use client";

import Image from "next/image";
import { Shield, Calendar, TrendingUp, History, Users } from "lucide-react";
import { format } from "date-fns";
import { TeamMatch } from "@/features/teams/types/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <Card className="mb-6 overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-blue-800 text-white">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Head to Head
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* 팀 정보 */}
          <div className="flex items-center justify-between p-6 bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              {matchData.team?.emblem_url ? (
                <Image
                  src={matchData.team?.emblem_url}
                  alt={matchData.team?.name || ""}
                  width={64}
                  height={64}
                  className="rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <span className="font-bold text-lg">{matchData.team?.name}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-gray-800 mb-1">
                {totalMatches}
              </div>
              <div className="text-sm text-gray-500 uppercase tracking-wider">
                Played
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {matchData.opponent_team?.emblem_url ? (
                <Image
                  src={matchData.opponent_team?.emblem_url}
                  alt={matchData.opponent_team?.name || ""}
                  width={64}
                  height={64}
                  className="rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-gray-500" />
                </div>
              )}
              <span className="font-bold text-lg">
                {matchData.is_tbd
                  ? "상대팀 미정"
                  : matchData.opponent_team?.name ||
                    matchData.opponent_guest_team?.name ||
                    "게스트팀"}
              </span>
            </div>
          </div>

          {/* 새로운 Head to Head 통계 레이아웃 */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="w-[40%]">
                <div className="flex items-center mb-4">
                  <div className="w-[30%] bg-blue-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamAWins || 0}
                  </div>
                  <div className="ml-4 text-gray-800 font-medium">
                    Total Wins
                  </div>
                </div>

                <div className="flex items-center mb-4">
                  <div className="w-[30%] bg-blue-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamAHomeWins || 0}
                  </div>
                  <div className="ml-4 text-gray-800 font-medium">Home</div>
                </div>

                <div className="flex items-center">
                  <div className="w-[30%] bg-blue-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamAAwayWins || 0}
                  </div>
                  <div className="ml-4 text-gray-800 font-medium">Away</div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-[80px] font-bold text-purple-900 leading-none">
                  {totalMatches}
                </div>
                <div className="text-lg text-gray-600 font-medium">Draws</div>
                <div className="text-3xl font-bold text-gray-700 mt-1">
                  {headToHead?.draws || 0}
                </div>
              </div>

              <div className="w-[40%]">
                <div className="flex items-center justify-end mb-4">
                  <div className="mr-4 text-gray-800 font-medium">
                    Total Wins
                  </div>
                  <div className="w-[30%] bg-red-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamBWins || 0}
                  </div>
                </div>

                <div className="flex items-center justify-end mb-4">
                  <div className="mr-4 text-gray-800 font-medium">Home</div>
                  <div className="w-[30%] bg-red-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamBHomeWins || 0}
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="mr-4 text-gray-800 font-medium">Away</div>
                  <div className="w-[30%] bg-red-600 h-8 flex items-center justify-center text-white font-bold">
                    {headToHead?.teamBAwayWins || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최근 상대전적 */}
      <Card className="mb-6 overflow-hidden border-0 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            최근 상대전적
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentMeetings && recentMeetings.length > 0 ? (
            <div className="divide-y">
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

                // 경기 결과 결정
                let resultClass = "";
                if (ourScore > theirScore) {
                  resultClass = "bg-green-100 border-l-4 border-green-500";
                } else if (ourScore < theirScore) {
                  resultClass = "bg-red-100 border-l-4 border-red-500";
                } else {
                  resultClass = "bg-gray-100 border-l-4 border-gray-500";
                }

                return (
                  <div
                    key={match.id}
                    className={`flex items-center p-4 ${resultClass}`}
                  >
                    <div className="w-24 text-sm text-gray-500">
                      {format(new Date(match.match_date), "yyyy.MM.dd")}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {matchData.team?.name}
                        </span>
                        <div className="flex items-center justify-center bg-gray-800 text-white font-bold rounded px-3 py-1 mx-2">
                          <span>{ourScore}</span>
                          <span className="mx-1">-</span>
                          <span>{theirScore}</span>
                        </div>
                        <span className="font-medium">{opponentName}</span>
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      {isOurTeamHome ? (
                        <Badge variant="outline" className="bg-blue-50">
                          홈
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          원정
                        </Badge>
                      )}
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
        </CardContent>
      </Card>

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
                    resultBg = "bg-green-500";
                  } else if (result === "L") {
                    resultBg = "bg-red-500";
                  } else {
                    resultBg = "bg-gray-500";
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
                    resultBg = "bg-green-500";
                  } else if (result === "L") {
                    resultBg = "bg-red-500";
                  } else {
                    resultBg = "bg-gray-500";
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
