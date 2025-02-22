"use client";

/**
 * @ai_context
 * Extended MatchDetail to show H2H stats and attendance UI.
 * Render the match details, plus a radio group for attendance status.
 */

import { TeamMatch } from "../types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchDetailProps {
  match: TeamMatch;
  userAttendance: "attending" | "absent" | "maybe";
  onAttendanceChange: (status: "attending" | "absent" | "maybe") => void;
  h2hStats?: {
    totalMatches: number;
    teamAWins: number;
    teamBWins: number;
    draws: number;
  };
  isH2HLoading?: boolean;
  isAttendanceUpdating?: boolean;
}

export function MatchDetail({
  match,
  userAttendance,
  onAttendanceChange,
  h2hStats,
  isH2HLoading,
  isAttendanceUpdating,
}: MatchDetailProps) {
  // 포맷팅
  const matchDateStr = format(new Date(match.match_date), "PPP p", {
    locale: ko,
  });

  return (
    <div className="space-y-6">
      {/* 경기 기본 정보 */}
      <div>
        <h1 className="text-2xl font-bold mb-2">경기 상세</h1>
        <p className="text-sm text-gray-500">
          {matchDateStr} / {match.venue}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {match.competition_type === "friendly"
            ? "친선전"
            : match.competition_type === "league"
            ? "리그"
            : "컵"}{" "}
          / {match.game_type}
        </p>
        {match.description && (
          <p className="mt-4 text-gray-600 whitespace-pre-wrap">
            {match.description}
          </p>
        )}
      </div>

      {/* 상대 팀 (확정 or 미정) */}
      <div>
        <h2 className="text-xl font-semibold mb-2">상대 팀</h2>
        {match.is_tbd ? (
          <p>상대 팀 미정</p>
        ) : match.opponent_team ? (
          <p className="text-gray-700 font-medium">
            {match.opponent_team.name} (리더: {match.opponent_team.leader_id})
          </p>
        ) : match.opponent_guest_team ? (
          <p className="text-gray-700 font-medium">
            {match.opponent_guest_team.name}
          </p>
        ) : (
          <p>정보 없음</p>
        )}
      </div>

      {/* 전적 (H2H) */}
      {match.opponent_team_id ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">맞대결 전적</h2>
          {isH2HLoading ? (
            <div className="space-y-2">
              <Skeleton className="w-48 h-4" />
              <Skeleton className="w-32 h-4" />
            </div>
          ) : h2hStats ? (
            <p className="text-sm text-gray-600">
              총 {h2hStats.totalMatches}전 중 우리 팀 {h2hStats.teamAWins}승,
              상대 팀 {h2hStats.teamBWins}승, 무승부 {h2hStats.draws}회
            </p>
          ) : (
            <p className="text-gray-500">전적 데이터가 없습니다.</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500">전적 데이터가 없습니다.</p>
      )}

      {/* 참석 여부 설정 */}
      <div>
        <h2 className="text-xl font-semibold mb-3">참석 여부</h2>
        <RadioGroup
          value={userAttendance}
          onValueChange={(value) =>
            onAttendanceChange(value as "attending" | "absent" | "maybe")
          }
          className="flex items-center gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="attending" id="attending" />
            <Label htmlFor="attending">참석</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="absent" id="absent" />
            <Label htmlFor="absent">불가</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="maybe" id="maybe" />
            <Label htmlFor="maybe">미정</Label>
          </div>
        </RadioGroup>
        {isAttendanceUpdating && (
          <p className="text-sm text-gray-400 mt-2">
            참석 정보를 업데이트 중...
          </p>
        )}
      </div>
    </div>
  );
}
