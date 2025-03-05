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
  // 사용자의 팀과 상대팀 설정
  const userTeam = matchData.user_team || matchData.team;
  const opposingTeam =
    matchData.opposing_team ||
    matchData.opponent_team ||
    matchData.opponent_guest_team;

  const isHome = matchData.is_home;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {userTeam?.emblem_url ? (
            <Image
              src={userTeam?.emblem_url || "/team-placeholder.png"}
              alt={userTeam?.name || ""}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <Shield className="w-6 h-6" />
          )}
          <div className="flex flex-col">
            <span className="text-xl font-bold">{userTeam?.name}</span>
            <span className="text-sm text-gray-600">
              {isHome ? "홈" : "원정"}
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
          {matchData.is_finished && (
            <div className="font-bold text-xl mt-1">
              {isHome ? matchData.home_score : matchData.away_score} :{" "}
              {isHome ? matchData.away_score : matchData.home_score}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold">
              {matchData.is_tbd ? "상대팀 미정" : opposingTeam?.name}
            </span>
            <span className="text-sm text-gray-600">
              {isHome ? "원정" : "홈"}
            </span>
          </div>
          {opposingTeam?.emblem_url ? (
            <Image
              src={opposingTeam?.emblem_url}
              alt={opposingTeam?.name || ""}
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
