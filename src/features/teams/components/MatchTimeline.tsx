"use client";

import { Trophy, Dribbble, Calendar, Users, Clock, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MatchTimelineProps {
  match: any;
  goals: any[];
  assists: any[];
  mom: any;
}

export function MatchTimeline({
  match,
  goals,
  assists,
  mom,
}: MatchTimelineProps) {
  const { supabase } = useSupabase();
  const [homeTeamGoals, setHomeTeamGoals] = useState<any[]>([]);
  const [awayTeamGoals, setAwayTeamGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [goalsWithProfiles, setGoalsWithProfiles] = useState<any[]>([]);

  // 상대팀이 미정인지 확인
  const isOpponentTeamUndecided =
    !match?.opponent_team?.id && !match?.opponent_guest_team?.id;

  // 직접 골 데이터를 가져옵니다 (profiles 조인 없이)
  const { data: matchGoals, isLoading: isGoalsLoading } = useQuery({
    queryKey: ["matchGoalsInTimeline", match?.id],
    queryFn: async () => {
      if (!match?.id) return [];

      try {
        const { data, error } = await supabase
          .from("match_goals")
          .select("*")
          .eq("match_id", match.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("골 데이터 조회 오류:", error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error("골 데이터 조회 중 예외 발생:", error);
        return [];
      }
    },
    enabled: !!match?.id,
  });

  // 골 데이터에 프로필 정보를 추가합니다
  useEffect(() => {
    const fetchProfilesForGoals = async () => {
      const goalsToProcess = matchGoals || goals;

      if (!goalsToProcess || goalsToProcess.length === 0) {
        setGoalsWithProfiles([]);
        setIsLoading(false);
        return;
      }

      try {
        // 모든 골 데이터의 user_id를 추출
        const userIds = [
          ...new Set(goalsToProcess.map((goal) => goal.user_id)),
        ];

        // 프로필 정보 조회
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (error) {
          console.error("프로필 정보 조회 오류:", error);
          setGoalsWithProfiles(goalsToProcess);
          setIsLoading(false);
          return;
        }

        // 골 데이터에 프로필 정보 추가
        const goalsWithProfileData = goalsToProcess.map((goal) => {
          const profile = profiles.find((p) => p.id === goal.user_id);
          return {
            ...goal,
            profiles: profile,
          };
        });

        setGoalsWithProfiles(goalsWithProfileData);
      } catch (error) {
        console.error("프로필 정보 처리 중 오류 발생:", error);
        setGoalsWithProfiles(goalsToProcess);
      } finally {
        setIsLoading(false);
      }
    };

    if (matchGoals || goals) {
      fetchProfilesForGoals();
    }
  }, [matchGoals, goals, supabase]);

  // 골 데이터를 홈팀과 원정팀으로 분류
  useEffect(() => {
    if (!goalsWithProfiles || goalsWithProfiles.length === 0) {
      setHomeTeamGoals([]);
      setAwayTeamGoals([]);
      return;
    }

    const fetchTeamMembers = async () => {
      try {
        // 홈팀과 원정팀 골 분류
        const homeGoals = [];
        const awayGoals = [];

        for (const goal of goalsWithProfiles) {
          if (goal.team_id === match.team_id) {
            homeGoals.push(goal);
          } else {
            awayGoals.push(goal);
          }
        }

        setHomeTeamGoals(homeGoals);
        setAwayTeamGoals(awayGoals);
        setIsLoading(false);
      } catch (error) {
        console.error("팀 멤버 조회 중 오류 발생:", error);
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [goalsWithProfiles, match?.team_id, supabase]);

  // 실제 표시할 골 데이터
  const displayGoals = goalsWithProfiles || [];

  // 골 타입에 따른 표시 텍스트
  const getGoalTypeText = (type: string) => {
    switch (type) {
      case "field":
        return "필드골";
      case "freekick":
        return "프리킥";
      case "penalty":
        return "페널티킥";
      default:
        return "";
    }
  };

  return (
    <>
      {/* 스코어보드 */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-green-700 to-green-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            경기 결과
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center gap-2">
              {(match.user_team || match.team)?.emblem_url ? (
                <img
                  src={(match.user_team || match.team).emblem_url}
                  alt={(match.user_team || match.team).name}
                  className="w-16 h-16 object-contain rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-xl font-bold text-gray-500">
                    {(match.user_team || match.team)?.name?.[0] || "?"}
                  </span>
                </div>
              )}
              <div className="text-lg font-bold">
                {(match.user_team || match.team)?.name || "우리 팀"}
              </div>
            </div>

            <div className="text-center">
              <div className="text-5xl font-bold mb-3 bg-gray-800 text-white px-6 py-2 rounded-lg">
                {match.is_finished
                  ? match.is_home
                    ? `${match.home_score} - ${match.away_score}`
                    : `${match.away_score} - ${match.home_score}`
                  : isOpponentTeamUndecided
                  ? "vs"
                  : match.is_home
                  ? `${match.home_score || 0} - ${match.away_score || 0}`
                  : `${match.away_score || 0} - ${match.home_score || 0}`}
              </div>
              <div className="text-sm font-medium bg-gray-100 px-4 py-1 rounded-full inline-flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                {match.is_finished ? "경기 종료" : "예정된 경기"}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {!isOpponentTeamUndecided &&
              (match.opposing_team || match.opponent_team)?.emblem_url ? (
                <img
                  src={(match.opposing_team || match.opponent_team).emblem_url}
                  alt={(match.opposing_team || match.opponent_team).name}
                  className="w-16 h-16 object-contain rounded-full border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-xl font-bold text-gray-500">
                    {isOpponentTeamUndecided
                      ? "?"
                      : (match.opposing_team || match.opponent_team)
                          ?.name?.[0] ||
                        match.opponent_guest_team?.name?.[0] ||
                        "?"}
                  </span>
                </div>
              )}
              <div className="text-lg font-bold">
                {isOpponentTeamUndecided
                  ? "미정"
                  : (
                      match.opposing_team ||
                      match.opponent_team ||
                      match.opponent_guest_team
                    )?.name || "상대팀"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 득점자 정보 */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Dribbble className="h-5 w-5" />
            득점 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-md font-medium text-blue-700 mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
                <Users className="w-4 h-4" />
                {(match.user_team || match.team)?.name} 득점자
              </h3>
              {isLoading || isGoalsLoading ? (
                <div className="text-center text-sm text-gray-500 py-2">
                  로딩 중...
                </div>
              ) : homeTeamGoals.length > 0 ? (
                <div className="space-y-2.5">
                  {homeTeamGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm"
                    >
                      <Dribbble className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <span className="font-medium">
                          {goal.profiles?.name}
                        </span>
                        {goal.goal_type && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-2">
                            {getGoalTypeText(goal.goal_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-2">
                  {match.status === "completed" ? "득점 없음" : "경기 전"}
                </div>
              )}
            </div>

            <div className="bg-red-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-md font-medium text-red-700 mb-3 flex items-center gap-2 border-b border-red-100 pb-2">
                <Users className="w-4 h-4" />
                {isOpponentTeamUndecided
                  ? "상대팀"
                  : (
                      match.opposing_team ||
                      match.opponent_team ||
                      match.opponent_guest_team
                    )?.name || "상대팀"}
                득점자
              </h3>
              {isLoading || isGoalsLoading ? (
                <div className="text-center text-sm text-gray-500 py-2">
                  로딩 중...
                </div>
              ) : isOpponentTeamUndecided ? (
                <div className="text-center text-sm text-gray-500 py-2">
                  상대팀 미정
                </div>
              ) : awayTeamGoals.length > 0 ? (
                <div className="space-y-2.5">
                  {awayTeamGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-md shadow-sm"
                    >
                      <Dribbble className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <span className="font-medium">
                          {goal.profiles?.name}
                        </span>
                        {goal.goal_type && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full ml-2">
                            {getGoalTypeText(goal.goal_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-2">
                  득점 없음
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 타임라인 */}
      {(displayGoals.length > 0 || mom) && (
        <Card className="overflow-hidden border-0 shadow-md mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              경기 하이라이트
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {displayGoals.map((goal) => {
                // 홈팀 골인지 확인 (goal.team_id와 homeTeamId 비교)
                const isHomeTeamGoal = goal.team_id === match.team_id;

                return (
                  <div
                    key={goal.id}
                    className="relative mb-5 flex items-center gap-3"
                  >
                    <div
                      className={`absolute left-0 w-4 h-4 ${
                        isHomeTeamGoal
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-red-100 border-2 border-red-500"
                      } rounded-full -translate-x-2 flex items-center justify-center`}
                    >
                      <Dribbble
                        className={`w-2 h-2 ${
                          isHomeTeamGoal ? "text-blue-500" : "text-red-500"
                        }`}
                      />
                    </div>
                    <div
                      className={`${
                        isHomeTeamGoal ? "bg-blue-50" : "bg-red-50"
                      } rounded-lg p-3 shadow-sm w-full`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          {goal.profiles?.name}
                          <Badge
                            variant="outline"
                            className={
                              isHomeTeamGoal
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                            }
                          >
                            {isHomeTeamGoal
                              ? (match.user_team || match.team)?.name
                              : (match.opposing_team || match.opponent_team)
                                  ?.name}
                          </Badge>
                        </span>
                        {goal.goal_type && (
                          <span
                            className={`text-xs ${
                              isHomeTeamGoal
                                ? "text-blue-600 bg-blue-100"
                                : "text-red-600 bg-red-100"
                            } px-2 py-0.5 rounded-full`}
                          >
                            {getGoalTypeText(goal.goal_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* MOM은 기존과 동일하게 유지하나 어느 팀인지 표시 추가 */}
              {mom && (
                <div className="relative mb-5 flex items-center gap-3">
                  <div className="absolute left-0 w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded-full -translate-x-2 flex items-center justify-center">
                    <Award className="w-2 h-2 text-yellow-500" />
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 shadow-sm w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        {mom.profiles?.name}
                        {mom.team_id && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-700"
                          >
                            {mom.team_id === match.team_id
                              ? (match.user_team || match.team)?.name
                              : (match.opposing_team || match.opponent_team)
                                  ?.name}
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                        MOM
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
