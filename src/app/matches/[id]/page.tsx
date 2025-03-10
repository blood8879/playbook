"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              경기 정보 로딩 중
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matchData || isMatchError) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              경기를 찾을 수 없습니다
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="mb-4">요청하신 경기 정보를 찾을 수 없습니다.</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/teams/${matchData?.team_id}`)}
              className="hover:bg-gray-100 transition-colors"
            >
              경기 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 경기 헤더 */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-blue-800 text-white">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            경기 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MatchHeader matchData={matchData} />
        </CardContent>
      </Card>

      {/* 운영진에게만 결과 수정 버튼 표시 */}
      {isAdmin && (
        <Card className="overflow-hidden border-0 shadow-md mb-6">
          <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              관리자 작업
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MatchActions
              matchData={matchData}
              isAdmin={isAdmin}
              isOpponentTeamUndecided={isOpponentTeamUndecided}
              deleteMutation={deleteMutation}
            />
          </CardContent>
        </Card>
      )}

      {matchData?.is_finished ? (
        // 경기가 종료된 경우
        <Card className="overflow-hidden border-0 shadow-md mb-6">
          <CardContent className="p-6">
            <MatchTimeline
              match={matchData}
              goals={goals || []}
              assists={assists || []}
              mom={mom}
            />
          </CardContent>
        </Card>
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
      <Card className="overflow-hidden border-0 shadow-md mb-6 mt-6">
        <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            참석 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MatchAttendance
            matchData={matchData}
            attendanceList={attendanceList || []}
            attendanceCounts={attendanceCounts}
            userAttendance={userAttendance}
            handleAttendanceChange={handleAttendanceChange}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}
