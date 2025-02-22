"use client";

import { TeamMatch } from "../types";

interface MatchDetailProps {
  match: TeamMatch;
}

/**
 * @ai_context
 * This component displays match detail
 */
export function MatchDetail({ match }: MatchDetailProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">경기 상세</h1>
      <div className="space-y-2">
        <p className="text-sm">경기 일시: {match.match_date}</p>
        <p className="text-sm">경기장: {match.venue}</p>
        <p className="text-sm">대회 유형: {match.competition_type}</p>
        <p className="text-sm">경기 유형: {match.game_type}</p>
        {match.is_tbd ? (
          <p className="text-sm">상대 팀: 미정</p>
        ) : (
          <p className="text-sm">
            상대 팀:{" "}
            {match.opponent_team?.name ||
              match.opponent_guest_team?.name ||
              "정보 없음"}
          </p>
        )}
        {match.description && (
          <p className="text-sm">설명: {match.description}</p>
        )}
        <p className="text-sm">
          마감일: {match.registration_deadline || "정보 없음"}
        </p>
      </div>
      {(match.home_score !== null || match.away_score !== null) && (
        <div className="space-y-2">
          <h2 className="font-semibold">스코어</h2>
          <p className="text-sm">
            홈: {match.home_score ?? "-"} / 원정: {match.away_score ?? "-"}
          </p>
        </div>
      )}
    </div>
  );
}