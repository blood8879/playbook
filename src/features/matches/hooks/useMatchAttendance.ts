"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getMatchAttendance,
  setMatchAttendance,
  getMatchAttendanceList,
} from "@/features/teams/api";

export function useMatchAttendance(matchId: string) {
  const { supabase, user } = useSupabase();

  const queryClient = useQueryClient();

  // 로컬 상태를 사용하여 캐시가 초기화되더라도 UI 상태 유지
  const [attendanceCache, setAttendanceCache] = useState<{
    [key: string]: "attending" | "absent" | "maybe";
  }>({});

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
    refetchOnWindowFocus: false,
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

  // 참석 상태 업데이트 뮤테이션 - 낙관적 업데이트 추가
  const { mutate: updateAttendance, isPending: isUpdating } = useMutation({
    mutationFn: (status: "attending" | "absent" | "maybe") =>
      setMatchAttendance(supabase, matchId, user?.id || "", status),
    onMutate: async (newStatus) => {
      // 이전 쿼리 데이터 백업
      await queryClient.cancelQueries({
        queryKey: ["matchAttendanceList", matchId],
      });
      const previousAttendanceList = queryClient.getQueryData([
        "matchAttendanceList",
        matchId,
      ]);

      // 낙관적 업데이트
      if (user?.id && attendanceList) {
        queryClient.setQueryData(
          ["matchAttendanceList", matchId],
          attendanceList.map((item) =>
            item.user_id === user.id ? { ...item, status: newStatus } : item
          )
        );
      }

      return { previousAttendanceList };
    },
    onError: (err, newStatus, context) => {
      // 에러 발생 시 이전 데이터로 롤백
      if (context?.previousAttendanceList) {
        queryClient.setQueryData(
          ["matchAttendanceList", matchId],
          context.previousAttendanceList
        );
      }
    },
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

    // 홈팀 참석 현황 사용자
    const homeAttendingUsers = attendanceList.filter(
      (a) => a.status === "attending" && a.team_id === teamId
    );
    const homeAbsentUsers = attendanceList.filter(
      (a) => a.status === "absent" && a.team_id === teamId
    );
    const homeMaybeUsers = attendanceList.filter(
      (a) => a.status === "maybe" && a.team_id === teamId
    );

    // 원정팀 참석 현황 사용자
    const awayAttendingUsers = attendanceList.filter(
      (a) =>
        a.status === "attending" && (a.team_id === opponentTeamId || !a.team_id)
    );
    const awayAbsentUsers = attendanceList.filter(
      (a) =>
        a.status === "absent" && (a.team_id === opponentTeamId || !a.team_id)
    );
    const awayMaybeUsers = attendanceList.filter(
      (a) =>
        a.status === "maybe" && (a.team_id === opponentTeamId || !a.team_id)
    );

    console.log("Filtered Users:", {
      homeAttendingUsers,
      homeAbsentUsers,
      homeMaybeUsers,
      awayAttendingUsers,
      awayAbsentUsers,
      awayMaybeUsers,
    });

    return {
      // 전체 참석 현황
      attending:
        attendanceList.filter((a) => a.status === "attending").length || 0,
      absent: attendanceList.filter((a) => a.status === "absent").length || 0,
      maybe: attendanceList.filter((a) => a.status === "maybe").length || 0,

      // 홈팀 참석 현황
      homeAttending: homeAttendingUsers.length || 0,
      homeAbsent: homeAbsentUsers.length || 0,
      homeMaybe: homeMaybeUsers.length || 0,

      // 어웨이팀 참석 현황 (팀이 없는 사용자도 어웨이팀으로 포함)
      awayAttending: awayAttendingUsers.length || 0,
      awayAbsent: awayAbsentUsers.length || 0,
      awayMaybe: awayMaybeUsers.length || 0,
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
