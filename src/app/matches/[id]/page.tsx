"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { getMatchById, getMatchAttendance, setMatchAttendance } from "@/features/teams/api";
import { TeamMatch } from "@/features/teams/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * @ai_context
 * Match detail page with attendance update logic
 */

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const matchId = params.id as string;

  // 매치 정보 조회
  const {
    data: matchData,
    isLoading: isMatchLoading,
    isError: isMatchError,
  } = useQuery<TeamMatch>({
    queryKey: ["match", matchId],
    queryFn: () => getMatchById(supabase, matchId),
    enabled: !!matchId,
  });

  // 현재 사용자 참석 상태 조회
  const {
    data: attendanceStatus,
    isLoading: isAttendanceLoading,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ["matchAttendance", matchId, user?.id],
    queryFn: () => getMatchAttendance(supabase, matchId, user?.id),
    enabled: !!user && !!matchId,
  });

  // 로컬 상태로 참석 여부 관리
  const [userAttendance, setUserAttendance] =
    useState<"attending" | "absent" | "maybe">("maybe");

  // attendanceStatus가 바뀔 때마다 로컬 상태도 동기화
  useEffect(() => {
    if (attendanceStatus) {
      setUserAttendance(attendanceStatus);
    }
  }, [attendanceStatus]);

  // 참석 상태 업데이트 뮤테이션
  const { mutate: updateAttendance, isLoading: isUpdating } = useMutation({
    mutationFn: (status: "attending" | "absent" | "maybe") =>
      setMatchAttendance(supabase, matchId, user?.id || "", status),
    onSuccess: () => {
      // 상태 변경 후 재조회 (혹은 로컬로도 즉시 반영)
      refetchAttendance();
    },
  });

  const handleAttendanceChange = (status: "attending" | "absent" | "maybe") => {
    setUserAttendance(status); // UI 즉시 반영
    updateAttendance(status);  // Supabase DB 업데이트
  };

  if (isMatchLoading || isAttendanceLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!matchData || isMatchError) {
    return (
      <div className="container py-8">
        <p>경기를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push("/matches")}>
          경기 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-xl font-semibold mb-4">경기 상세</h1>

      <p className="mb-2">경기 ID: {matchData.id}</p>
      <p className="mb-2">
        {matchData.is_tbd
          ? "상대팀 미정"
          : matchData.opponent_team?.name ||
            matchData.opponent_guest_team?.name}
      </p>
      <p className="mb-2">장소: {matchData.venue}</p>
      <p className="mb-4">
        {matchData.competition_type} / {matchData.game_type}
      </p>

      {/* 참석 버튼들 */}
      <div className="flex items-center gap-2">
        <Button
          variant={userAttendance === "attending" ? "default" : "outline"}
          disabled={isUpdating}
          onClick={() => handleAttendanceChange("attending")}
        >
          참석
        </Button>
        <Button
          variant={userAttendance === "absent" ? "default" : "outline"}
          disabled={isUpdating}
          onClick={() => handleAttendanceChange("absent")}
        >
          불참
        </Button>
        <Button
          variant={userAttendance === "maybe" ? "default" : "outline"}
          disabled={isUpdating}
          onClick={() => handleAttendanceChange("maybe")}
        >
          미정
        </Button>
      </div>

      <p className="mt-4">현재 참석 상태: {userAttendance}</p>
    </div>
  );
}