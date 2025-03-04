"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// 커스텀 훅 임포트
import { useMatchDetail } from "@/features/matches/hooks/useMatchDetail";
import { useMatchAttendance } from "@/features/matches/hooks/useMatchAttendance";
import { useMatchStatistics } from "@/features/matches/hooks/useMatchStatistics";

// 컴포넌트 임포트
import { MatchHeader } from "@/features/matches/components/MatchHeader";
import { MatchActions } from "@/features/matches/components/MatchActions";
import { MatchAttendance } from "@/features/matches/components/MatchAttendance";
import { MatchStatistics } from "@/features/matches/components/MatchStatistics";
import { MatchTimeline } from "@/features/teams/components/MatchTimeline";

/**
 * @ai_context
 * Match detail page with attendance update logic
 */

export default function MatchDetailPage() {
  const queryClient = useQueryClient();

  // 커스텀 훅 사용
  const {
    matchId,
    matchData,
    isMatchLoading,
    isMatchError,
    goals,
    assists,
    mom,
    isAdmin,
    isOpponentTeamUndecided,
    deleteMutation,
    refreshMatchData,
    router,
  } = useMatchDetail();

  const {
    attendanceStatus,
    isAttendanceLoading,
    refetchAttendance,
    attendanceList,
    refetchAttendanceList,
    userAttendance,
    handleAttendanceChange,
    isUpdating,
    calculateAttendanceCounts,
  } = useMatchAttendance(matchId);

  const {
    headToHead,
    recentMeetings,
    homeTeamRecent,
    awayTeamRecent,
    getMatchResult,
    getResultBadgeColor,
  } = useMatchStatistics(matchData);

  // 페이지 로드 시 데이터 새로고침
  useEffect(() => {
    if (matchId) {
      // 페이지가 마운트될 때 모든 관련 데이터를 다시 가져옴
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({
        queryKey: ["matchAttendanceList", matchId],
      });
      queryClient.invalidateQueries({ queryKey: ["matchAttendance", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchGoals", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchAssists", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchMom", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchStatistics", matchId] });

      // 참석 현황 데이터 수동 새로고침
      refetchAttendanceList();
    }
  }, [matchId, queryClient, refetchAttendanceList]);

  // 참석 상태별 인원 계산
  const attendanceCounts = calculateAttendanceCounts(
    matchData?.team?.id,
    matchData?.opponent_team?.id
  );

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
        <Button
          variant="outline"
          onClick={() => router.push(`/teams/${matchData?.team_id}`)}
        >
          경기 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 경기 헤더 */}
      <MatchHeader matchData={matchData} />

      {/* 운영진에게만 결과 수정 버튼 표시 */}
      {isAdmin && (
        <MatchActions
          matchData={matchData}
          isAdmin={isAdmin}
          isOpponentTeamUndecided={isOpponentTeamUndecided}
          deleteMutation={deleteMutation}
        />
      )}

      {matchData?.is_finished ? (
        // 경기가 종료된 경우
        <MatchTimeline
          match={matchData}
          goals={goals || []}
          assists={assists || []}
          mom={mom}
        />
      ) : (
        // 경기가 종료되지 않은 경우
        <>
          {/* 종료되지 않은 경기에서만 보이는 통계 섹션 */}
          {!matchData.is_tbd &&
            (matchData.opponent_team || matchData.opponent_guest_team) && (
              <MatchStatistics
                matchData={matchData}
                headToHead={headToHead}
                recentMeetings={recentMeetings || []}
                homeTeamRecent={homeTeamRecent || []}
                awayTeamRecent={awayTeamRecent || []}
                getMatchResult={getMatchResult}
                getResultBadgeColor={getResultBadgeColor}
              />
            )}
        </>
      )}

      {/* 참석 현황 */}
      <MatchAttendance
        matchData={matchData}
        attendanceList={attendanceList || []}
        attendanceCounts={attendanceCounts}
        userAttendance={userAttendance}
        handleAttendanceChange={handleAttendanceChange}
        isUpdating={isUpdating}
      />
    </div>
  );
}
