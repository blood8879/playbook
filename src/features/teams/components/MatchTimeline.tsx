"use client";

import { Trophy, Dribbble } from "lucide-react";
import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

    fetchProfilesForGoals();
  }, [matchGoals, goals, supabase]);

  // 팀 멤버 정보를 가져와서 골 데이터를 분류합니다.
  useEffect(() => {
    const fetchTeamMembers = async () => {
      // 골 데이터가 없거나 팀 ID가 없으면 처리하지 않습니다
      if (
        !goalsWithProfiles ||
        goalsWithProfiles.length === 0 ||
        !match?.team_id
      ) {
        setIsLoading(false);
        return;
      }

      try {
        // 홈팀 멤버 조회
        const { data: homeTeamMembers, error: homeError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", match.team_id);

        if (homeError) {
          console.error("홈팀 멤버 조회 오류:", homeError);
          setIsLoading(false);
          return;
        }

        // 홈팀 멤버 ID 목록
        const homeTeamUserIds = homeTeamMembers.map((member) => member.user_id);

        // 골 데이터 분류
        const homeGoals = goalsWithProfiles.filter((goal) =>
          homeTeamUserIds.includes(goal.user_id)
        );

        const awayGoals = goalsWithProfiles.filter(
          (goal) => !homeTeamUserIds.includes(goal.user_id)
        );

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
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* 스코어보드 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 relative">
            {match.team?.emblem_url ? (
              <img
                src={match.team.emblem_url}
                alt={match.team.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                {match.team?.name?.[0]}
              </div>
            )}
          </div>
          <div className="text-lg font-semibold">{match.team?.name}</div>
        </div>

        <div className="text-center">
          <div className="text-5xl font-bold mb-2">
            {match.home_score} - {match.away_score}
          </div>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            경기 종료
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-right">
            {match.opponent_team?.name}
          </div>
          <div className="w-16 h-16 relative">
            {match.opponent_team?.emblem_url ? (
              <img
                src={match.opponent_team.emblem_url}
                alt={match.opponent_team.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                {match.opponent_team?.name?.[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 득점자 정보 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-blue-700 mb-3 text-center border-b border-blue-100 pb-2">
            {match.team?.name} 득점자
          </h3>
          {isLoading || isGoalsLoading ? (
            <div className="text-center text-sm text-gray-500 py-2">
              로딩 중...
            </div>
          ) : homeTeamGoals.length > 0 ? (
            <div className="space-y-2.5">
              {homeTeamGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-2">
                  <Dribbble className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <span className="font-medium">{goal.profiles?.name}</span>
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
              득점 없음
            </div>
          )}
        </div>

        <div className="bg-red-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-red-700 mb-3 text-center border-b border-red-100 pb-2">
            {match.opponent_team?.name || "상대팀"} 득점자
          </h3>
          {isLoading || isGoalsLoading ? (
            <div className="text-center text-sm text-gray-500 py-2">
              로딩 중...
            </div>
          ) : awayTeamGoals.length > 0 ? (
            <div className="space-y-2.5">
              {awayTeamGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-2">
                  <Dribbble className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="text-sm flex-1">
                    <span className="font-medium">{goal.profiles?.name}</span>
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

      {/* 타임라인 */}
      {(displayGoals.length > 0 || mom) && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="text-base font-medium mb-4 text-gray-700">
            경기 하이라이트
          </h3>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {displayGoals.map((goal) => (
              <div
                key={goal.id}
                className="relative mb-5 flex items-center gap-3"
              >
                <div className="absolute left-0 w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded-full -translate-x-2 flex items-center justify-center">
                  <Dribbble className="w-2 h-2 text-blue-500" />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 shadow-sm w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.profiles?.name}</span>
                    {goal.goal_type && (
                      <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                        {getGoalTypeText(goal.goal_type)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {mom && (
              <div className="relative mb-5 flex items-center gap-3">
                <div className="absolute left-0 w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded-full -translate-x-2 flex items-center justify-center">
                  <Trophy className="w-2 h-2 text-yellow-500" />
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 shadow-sm w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{mom.profiles?.name}</span>
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                      MOM
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
