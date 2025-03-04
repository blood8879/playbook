"use client";

import Image from "next/image";
import { Shield, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { TeamMatch } from "@/features/teams/types/index";

interface MatchHeaderProps {
  matchData: TeamMatch;
}

export function MatchHeader({ matchData }: MatchHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {matchData.team?.emblem_url ? (
            <Image
              src={matchData.team?.emblem_url || "/team-placeholder.png"}
              alt={matchData.team?.name || ""}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <Shield className="w-6 h-6" />
          )}
          <div className="flex flex-col">
            <span className="text-xl font-bold">{matchData.team?.name}</span>
            <span className="text-sm text-gray-600">
              {matchData.is_home ? "홈" : "원정"}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">
            {format(new Date(matchData.match_date), "HH:mm")}
          </div>
          <div className="text-sm text-gray-600">
            {format(new Date(matchData.match_date), "PPP (eee)", {
              locale: ko,
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold">
              {matchData.is_tbd
                ? "상대팀 미정"
                : matchData.opponent_team?.name ||
                  matchData.opponent_guest_team?.name}
            </span>
            <span className="text-sm text-gray-600">
              {matchData.is_home ? "원정" : "홈"}
            </span>
          </div>
          {matchData.opponent_team?.emblem_url ? (
            <Image
              src={matchData.opponent_team?.emblem_url}
              alt={
                matchData.opponent_team?.name ||
                matchData.opponent_guest_team?.name ||
                ""
              }
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <Shield className="w-6 h-6" />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
        <MapPin className="w-4 h-4" />
        {matchData.stadium?.name ? (
          <>
            {matchData.stadium.name} · {matchData.venue}
          </>
        ) : (
          matchData.venue
        )}
      </div>
    </div>
  );
}
