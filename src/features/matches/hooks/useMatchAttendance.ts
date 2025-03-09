"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getMatchAttendance,
  setMatchAttendance,
  getMatchAttendanceList,
} from "@/features/teams/api";

export function useMatchAttendance(matchId: string) {
  const { supabase, user } = useSupabase();

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

  // 전체 참석 현황 조회
  const {
    data: attendanceList,
    refetch: refetchAttendanceList,
    isLoading: isAttendanceListLoading,
  } = useQuery({
    queryKey: ["matchAttendanceList", matchId],
    queryFn: () => getMatchAttendanceList(supabase, matchId),
    enabled: !!matchId,
    staleTime: 0, // 항상 최신 데이터 요청
    refetchOnMount: true, // 컴포넌트 마운트 시 항상 재조회
    refetchOnWindowFocus: true, // 윈도우 포커스 시 재조회
  });

  // 로컬 상태로 참석 여부 관리
  const [userAttendance, setUserAttendance] = useState<
    "attending" | "absent" | "maybe"
  >("maybe");

  // attendanceStatus가 바뀔 때마다 로컬 상태도 동기화
  useEffect(() => {
    if (attendanceStatus) {
      setUserAttendance(attendanceStatus);
    }
  }, [attendanceStatus]);

  // 참석 상태 업데이트 뮤테이션
  const { mutate: updateAttendance, isPending: isUpdating } = useMutation({
    mutationFn: (status: "attending" | "absent" | "maybe") =>
      setMatchAttendance(supabase, matchId, user?.id || "", status),
    onSuccess: () => {
      // 상태 변경 후 참석 현황도 함께 재조회
      refetchAttendance();
      refetchAttendanceList();
    },
  });

  const handleAttendanceChange = (status: "attending" | "absent" | "maybe") => {
    setUserAttendance(status); // UI 즉시 반영
    updateAttendance(status); // Supabase DB 업데이트
  };

  // 참석 상태별 인원 계산
  const calculateAttendanceCounts = (
    teamId?: string,
    opponentTeamId?: string
  ) => {
    if (!attendanceList)
      return {
        attending: 0,
        absent: 0,
        maybe: 0,
        homeAttending: 0,
        homeAbsent: 0,
        homeMaybe: 0,
        awayAttending: 0,
        awayAbsent: 0,
        awayMaybe: 0,
      };

    return {
      // 전체 참석 현황
      attending:
        attendanceList.filter((a) => a.status === "attending").length || 0,
      absent: attendanceList.filter((a) => a.status === "absent").length || 0,
      maybe: attendanceList.filter((a) => a.status === "maybe").length || 0,

      // 홈팀 참석 현황
      homeAttending:
        attendanceList.filter(
          (a) => a.status === "attending" && a.team_id === teamId
        ).length || 0,
      homeAbsent:
        attendanceList.filter(
          (a) => a.status === "absent" && a.team_id === teamId
        ).length || 0,
      homeMaybe:
        attendanceList.filter(
          (a) => a.status === "maybe" && a.team_id === teamId
        ).length || 0,

      // 어웨이팀 참석 현황 (팀이 없는 사용자도 어웨이팀으로 포함)
      awayAttending:
        attendanceList.filter(
          (a) =>
            a.status === "attending" &&
            (a.team_id === opponentTeamId || !a.team_id)
        ).length || 0,
      awayAbsent:
        attendanceList.filter(
          (a) =>
            a.status === "absent" &&
            (a.team_id === opponentTeamId || !a.team_id)
        ).length || 0,
      awayMaybe:
        attendanceList.filter(
          (a) =>
            a.status === "maybe" && (a.team_id === opponentTeamId || !a.team_id)
        ).length || 0,
    };
  };

  return {
    attendanceStatus,
    isAttendanceLoading,
    refetchAttendance,
    attendanceList,
    refetchAttendanceList,
    isAttendanceListLoading,
    userAttendance,
    updateAttendance,
    isUpdating,
    handleAttendanceChange,
    calculateAttendanceCounts,
  };
}
