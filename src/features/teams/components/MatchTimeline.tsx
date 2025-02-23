"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trophy, Dribbble, Star } from "lucide-react";

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
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                {match.team?.name?.[0]}
              </div>
            )}
          </div>
          <div className="text-lg font-semibold">{match.team?.name}</div>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            {match.home_score} - {match.away_score}
          </div>
          <div className="text-sm text-gray-500">Full Time</div>
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
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                {match.opponent_team?.name?.[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>

        {goals.map((goal) => (
          <div
            key={goal.id}
            className="relative pl-8 pb-6 flex items-center gap-3"
          >
            <div className="absolute left-0 w-2 h-2 bg-blue-500 rounded-full -translate-x-[3px]"></div>
            <Dribbble className="w-4 h-4 text-blue-500" />
            <div>
              <span className="font-medium">{goal.profiles?.name}</span>
              <span className="text-gray-500 text-sm ml-2">
                {format(new Date(goal.created_at), "m")}분
              </span>
              <span className="text-gray-500 text-sm ml-2">
                (
                {goal.goal_type === "field"
                  ? "필드골"
                  : goal.goal_type === "freekick"
                  ? "프리킥"
                  : "페널티킥"}
                )
              </span>
            </div>
          </div>
        ))}

        {mom && (
          <div className="relative pl-8 pb-6 flex items-center gap-3">
            <div className="absolute left-0 w-2 h-2 bg-yellow-500 rounded-full -translate-x-[3px]"></div>
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div>
              <span className="font-medium">{mom.profiles?.name}</span>
              <span className="text-gray-500 text-sm ml-2">MOM</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
