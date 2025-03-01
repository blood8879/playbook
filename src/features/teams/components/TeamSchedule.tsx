"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMatch } from "../types/index";
import Link from "next/link";

interface TeamScheduleProps {
  matches: TeamMatch[];
  isLoading: boolean;
  upcoming?: boolean;
}

export function TeamSchedule({
  matches,
  isLoading,
  upcoming = false,
}: TeamScheduleProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  let filteredMatches = matches;
  if (upcoming) {
    const now = new Date();
    filteredMatches = matches.filter((m) => new Date(m.match_date) >= now);
  }

  if (filteredMatches.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
        <p className="text-gray-500">
          {upcoming ? "다가오는 일정이 없습니다" : "등록된 일정이 없습니다"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredMatches.map((match) => (
        <Link href={`/matches/${match.id}`} key={match.id}>
          <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer mb-2">
            <div className="text-sm text-gray-500">
              {format(new Date(match.match_date), "PPP p", { locale: ko })}
            </div>
            <div className="font-medium">
              {match.is_tbd
                ? "상대팀 미정"
                : match.opponent_team?.name || match.opponent_guest_team?.name}
            </div>
            {/* <div className="text-sm text-gray-500">{match.venue}</div> */}
            <div className="text-sm text-gray-500">
              {match.stadium?.name || "장소 미정"}
            </div>
            <div className="text-sm text-gray-500">
              {match.competition_type === "friendly"
                ? "친선전"
                : match.competition_type === "league"
                ? "리그"
                : "컵"}{" "}
              · {match.game_type}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
