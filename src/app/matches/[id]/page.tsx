"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getMatchById,
  getMatchAttendance,
  setMatchAttendance,
  getMatchAttendanceList,
  getHeadToHeadStats,
  getLastMatchesOfTeam,
} from "@/features/teams/api";
import { TeamMatch } from "@/features/teams/types/index";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  Check,
  X,
  HelpCircle,
  Shield,
  Trophy,
  AlertCircle,
  Info,
  Edit,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";

import { MatchTimeline } from "@/features/teams/components/MatchTimeline";
import { UpdateOpponent } from "@/features/teams/components/UpdateOpponent";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

/**
 * @ai_context
 * Match detail page with attendance update logic
 */

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const queryClient = useQueryClient();
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

  // 전체 참석 현황 조회
  const { data: attendanceList, refetch: refetchAttendanceList } = useQuery({
    queryKey: ["matchAttendanceList", matchId],
    queryFn: () => getMatchAttendanceList(supabase, matchId),
    enabled: !!matchId,
    staleTime: 0, // 항상 최신 데이터 요청
    refetchOnMount: true, // 컴포넌트 마운트 시 항상 재조회
    refetchOnWindowFocus: true, // 윈도우 포커스 시 재조회
  });

  // 참석 상태별 인원 계산
  const attendanceCount = {
    // 전체 참석 현황
    attending:
      attendanceList?.filter((a) => a.status === "attending").length || 0,
    absent: attendanceList?.filter((a) => a.status === "absent").length || 0,
    maybe: attendanceList?.filter((a) => a.status === "maybe").length || 0,

    // 홈팀 참석 현황
    homeAttending:
      attendanceList?.filter(
        (a) => a.status === "attending" && a.team_id === matchData?.team?.id
      ).length || 0,
    homeAbsent:
      attendanceList?.filter(
        (a) => a.status === "absent" && a.team_id === matchData?.team?.id
      ).length || 0,
    homeMaybe:
      attendanceList?.filter(
        (a) => a.status === "maybe" && a.team_id === matchData?.team?.id
      ).length || 0,

    // 어웨이팀 참석 현황 (팀이 없는 사용자도 어웨이팀으로 포함)
    awayAttending:
      attendanceList?.filter(
        (a) =>
          a.status === "attending" &&
          (a.team_id === matchData?.opponent_team?.id || !a.team_id)
      ).length || 0,
    awayAbsent:
      attendanceList?.filter(
        (a) =>
          a.status === "absent" &&
          (a.team_id === matchData?.opponent_team?.id || !a.team_id)
      ).length || 0,
    awayMaybe:
      attendanceList?.filter(
        (a) =>
          a.status === "maybe" &&
          (a.team_id === matchData?.opponent_team?.id || !a.team_id)
      ).length || 0,
  };

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

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log("Head-to-Head 의존성 확인:", {
      teamId: matchData?.team_id,
      opponentTeamId: matchData?.opponent_team_id,
      isTbd: matchData?.is_tbd,
      shouldFetch:
        !!matchData?.team_id &&
        !!matchData?.opponent_team_id &&
        !matchData.is_tbd,
    });
  }, [matchData?.team_id, matchData?.opponent_team_id, matchData?.is_tbd]);

  // Head to Head 통계
  const { data: headToHead, isLoading: isHeadToHeadLoading } = useQuery({
    queryKey: [
      "headToHead",
      matchData?.team_id,
      matchData?.opponent_team_id,
      matchData?.opponent_guest_team_id,
    ],
    queryFn: async () => {
      const opponentId =
        matchData?.opponent_team_id || matchData?.opponent_guest_team_id;
      console.log("Head-to-Head 쿼리 실행 파라미터:", {
        teamA: matchData?.team_id,
        teamB: opponentId,
        isGuestTeam:
          !matchData?.opponent_team_id && !!matchData?.opponent_guest_team_id,
      });

      return getHeadToHeadStats(
        supabase,
        matchData?.team_id || "",
        opponentId || ""
      );
    },
    enabled:
      !!matchData?.team_id &&
      (!!matchData?.opponent_team_id || !!matchData?.opponent_guest_team_id) &&
      !matchData?.is_tbd,
  });

  // 최근 상대전적
  const { data: recentMeetings } = useQuery({
    queryKey: ["recentMeetings", matchId],
    queryFn: () =>
      getLastMatchesOfTeam(supabase, matchData.team?.id || "", {
        isFinished: true,
      }),
    enabled:
      !!matchData?.team?.id &&
      !!matchData?.opponent_team?.id &&
      !matchData.is_tbd,
  });

  // 홈팀 최근 경기
  const { data: homeTeamRecent } = useQuery({
    queryKey: ["homeTeamRecent", matchId],
    queryFn: () =>
      getLastMatchesOfTeam(supabase, matchData.team?.id || "", {
        isFinished: true,
      }),
    enabled: !!matchData?.team?.id && !matchData.is_tbd,
  });

  // 원정팀 최근 경기
  const { data: awayTeamRecent } = useQuery({
    queryKey: ["awayTeamRecent", matchId],
    queryFn: () =>
      getLastMatchesOfTeam(supabase, matchData.opponent_team?.id || "", {
        isFinished: true,
      }),
    enabled: !!matchData?.opponent_team?.id && !matchData.is_tbd,
  });

  // 골 정보 조회
  const { data: goals } = useQuery({
    queryKey: ["matchGoals", matchId],
    queryFn: async () => {
      console.log("골 정보 조회 시작:", matchId);
      try {
        const { data, error } = await supabase
          .from("match_goals")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });

        console.log("골 정보 조회 결과:", data);
        console.log("골 정보 조회 오류:", error);

        if (error) {
          console.error("골 정보 조회 중 오류 발생:", error);
          return [];
        }

        // 골 데이터가 있으면 프로필 정보 조회
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((goal) => goal.user_id))];

          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // 골 데이터에 프로필 정보 추가
          return data.map((goal) => {
            const profile = profiles.find((p) => p.id === goal.user_id);
            return {
              ...goal,
              profiles: profile,
            };
          });
        }

        return data || [];
      } catch (error) {
        console.error("골 정보 조회 중 예외 발생:", error);
        return [];
      }
    },
    enabled: !!matchId, // 경기 ID만 있으면 조회 가능하도록 수정
  });

  // 어시스트 정보 조회
  const { data: assists } = useQuery({
    queryKey: ["matchAssists", matchId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("match_assists")
          .select("*")
          .eq("match_id", matchId);

        if (error) {
          console.error("어시스트 정보 조회 중 오류 발생:", error);
          return [];
        }

        // 어시스트 데이터가 있으면 프로필 정보 조회
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((assist) => assist.user_id))];

          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // 어시스트 데이터에 프로필 정보 추가
          return data.map((assist) => {
            const profile = profiles.find((p) => p.id === assist.user_id);
            return {
              ...assist,
              profiles: profile,
            };
          });
        }

        return data || [];
      } catch (error) {
        console.error("어시스트 정보 조회 중 예외 발생:", error);
        return [];
      }
    },
    enabled: !!matchId, // 경기 ID만 있으면 조회 가능하도록 수정
  });

  // MOM 정보 조회
  const { data: mom } = useQuery({
    queryKey: ["matchMom", matchId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("match_mom")
          .select("*")
          .eq("match_id", matchId)
          .maybeSingle(); // single() 대신 maybeSingle() 사용

        if (error) {
          console.error("MOM 정보 조회 중 오류 발생:", error);
          return null;
        }

        // MOM 데이터가 있으면 프로필 정보 조회
        if (data) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", data.user_id)
            .single();

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // MOM 데이터에 프로필 정보 추가
          return {
            ...data,
            profiles: profile,
          };
        }

        return data;
      } catch (error) {
        console.error("MOM 정보 조회 중 예외 발생:", error);
        return null;
      }
    },
    enabled: !!matchId, // 경기 ID만 있으면 조회 가능하도록 수정
  });

  // 팀 멤버 조회
  const { data: teamMembers } = useQuery<any[]>({
    queryKey: ["teamMembers", matchData?.team_id],
    queryFn: async () => {
      if (!matchData?.team_id) return [];

      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          id,
          user_id,
          role,
          profiles:user_id(id, name, email)
        `
        )
        .eq("team_id", matchData.team_id);

      if (error) {
        console.error("팀 멤버 조회 오류:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!matchData?.team_id,
  });

  // 팀 멤버권한 확인
  const { data: teamMember } = useQuery({
    queryKey: ["teamMember", matchData?.team_id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select(
          `
          role,
          user_id,
          profiles:user_id(id, name, email)
        `
        )
        .eq("team_id", matchData?.team_id)
        .eq("user_id", user?.id)
        .single();
      return data;
    },
    enabled: !!user && !!matchData?.team_id,
  });

  const isAdmin = teamMember?.role === "owner" || teamMember?.role === "admin";

  const getMatchResult = (match: any, teamId: string) => {
    if (match.team_id === teamId) {
      // 홈팀인 경우
      if (match.home_score > match.away_score) return "W";
      if (match.home_score < match.away_score) return "L";
      return "D";
    } else {
      // 원정팀인 경우
      if (match.home_score < match.away_score) return "W";
      if (match.home_score > match.away_score) return "L";
      return "D";
    }
  };

  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case "W":
        return "text-green-600";
      case "L":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // 새로운 상태 추가
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 삭제 뮤테이션 추가
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // 1. 참석 정보 삭제
      const { error: attendanceError } = await supabase
        .from("match_attendance")
        .delete()
        .eq("match_id", matchId);

      if (attendanceError) throw attendanceError;

      // 2. 경기 삭제
      const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (matchError) throw matchError;
    },
    onSuccess: () => {
      router.push(`/teams/${matchData?.team_id}/matches`);
    },
    onError: (error) => {
      console.error("경기 삭제 중 오류:", error);
      toast({
        title: "경기 삭제 실패",
        description: "경기를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 상대팀이 미정인지 확인
  const isOpponentTeamUndecided =
    matchData?.is_tbd ||
    (!matchData?.opponent_team_id && !matchData?.opponent_guest_team_id);

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

      // 참석 현황 데이터 수동 새로고침
      refetchAttendanceList();
    }
  }, [matchId, queryClient, refetchAttendanceList]);

  // 날짜 포맷 함수
  const formatMatchDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy년 MM월 dd일 (EEE) HH:mm", {
        locale: ko,
      });
    } catch (error) {
      return dateString;
    }
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
    <div className="container py-8 max-w-4xl mx-auto">
      {/* 경기 헤더 */}
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
      {/* 운영진에게만 결과 수정 버튼 표시 */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">경기 결과 수정</h2>
              <p className="text-sm text-gray-500">
                경기 결과를 수정할 수 있습니다.
              </p>
              {isOpponentTeamUndecided && (
                <div className="mt-2 flex items-center text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  상대팀이 미정인 경우 경기 결과를 업데이트할 수 없습니다.
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <UpdateOpponent matchId={matchId} teamId={matchData.team_id} />
              )}
              <Button
                onClick={() => router.push(`/matches/${matchId}/result`)}
                disabled={isOpponentTeamUndecided}
              >
                <Edit className="w-4 h-4 mr-2" />
                경기 결과 업데이트
              </Button>
              {!matchData.is_finished && ( // 종료되지 않은 경기만 삭제 가능
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  경기 삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {matchData?.is_finished ? (
        // 경기가 종료된 경우
        <>
          <MatchTimeline
            match={matchData}
            goals={goals || []}
            assists={assists || []}
            mom={mom}
          />
        </>
      ) : (
        // 경기가 종료되지 않은 경우
        <>
          {/* 참석 여부 컨트롤 */}
          {/* 종료되지 않은 경기에서만 보이는 통계 섹션 */}
          {!matchData.is_tbd &&
            (matchData.opponent_team || matchData.opponent_guest_team) && (
              <>
                {/* Head to Head 통계 */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">Head to Head</h2>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      {matchData.team?.emblem_url ? (
                        <Image
                          src={matchData.team?.emblem_url}
                          alt={matchData.team?.name || ""}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <Shield className="w-6 h-6" />
                      )}
                      <span className="font-semibold">
                        {matchData.team?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {matchData.is_tbd
                          ? "상대팀 미정"
                          : matchData.opponent_team?.name ||
                            matchData.opponent_guest_team?.name ||
                            "게스트팀"}
                      </span>
                      {matchData.opponent_team?.emblem_url ? (
                        <Image
                          src={matchData.opponent_team?.emblem_url}
                          alt={matchData.opponent_team?.name || ""}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <Shield className="w-6 h-6" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center mb-8">
                    <div className="text-5xl font-bold text-purple-900">
                      {(headToHead?.teamAWins || 0) +
                        (headToHead?.draws || 0) +
                        (headToHead?.teamBWins || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Played</div>
                  </div>

                  <div className="space-y-6">
                    {/* Total Wins */}
                    <div className="flex items-center gap-4">
                      <div className="w-[45%]">
                        <div className="h-8 bg-blue-100 rounded-lg relative">
                          <div
                            className="h-full bg-blue-600 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamAWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamAWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Total Wins
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-600">
                          {headToHead?.draws || 0}
                        </div>
                        <div className="text-sm text-gray-500">Draws</div>
                      </div>
                      <div className="w-[45%]">
                        <div className="h-8 bg-red-100 rounded-lg relative">
                          <div
                            className="h-full bg-red-600 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamBWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamBWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 text-right">
                          Total Wins
                        </div>
                      </div>
                    </div>

                    {/* Home */}
                    <div className="flex items-center gap-4">
                      <div className="w-[45%]">
                        <div className="h-8 bg-blue-50 rounded-lg relative">
                          <div
                            className="h-full bg-blue-400 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamAHomeWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamAHomeWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Home</div>
                      </div>
                      <div className="w-[10%]" />
                      <div className="w-[45%]">
                        <div className="h-8 bg-red-50 rounded-lg relative">
                          <div
                            className="h-full bg-red-400 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamBHomeWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamBHomeWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 text-right">
                          Home
                        </div>
                      </div>
                    </div>

                    {/* Away */}
                    <div className="flex items-center gap-4">
                      <div className="w-[45%]">
                        <div className="h-8 bg-blue-50 rounded-lg relative">
                          <div
                            className="h-full bg-blue-300 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamAAwayWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamAAwayWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Away</div>
                      </div>
                      <div className="w-[10%]" />
                      <div className="w-[45%]">
                        <div className="h-8 bg-red-50 rounded-lg relative">
                          <div
                            className="h-full bg-red-300 rounded-lg"
                            style={{
                              width: `${
                                ((headToHead?.teamBAwayWins || 0) * 100) /
                                ((headToHead?.teamAWins || 0) +
                                  (headToHead?.draws || 0) +
                                  (headToHead?.teamBWins || 0) || 1)
                              }%`,
                            }}
                          >
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                              {headToHead?.teamBAwayWins || 0}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 text-right">
                          Away
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 최근 상대전적 */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold mb-4">최근 상대전적</h2>
                  {recentMeetings && recentMeetings.length > 0 ? (
                    <div className="space-y-3">
                      {recentMeetings.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-2 border-b"
                        >
                          <div className="text-sm">
                            {format(new Date(match.match_date), "yyyy.MM.dd")}
                          </div>
                          <div className="font-bold">
                            {match.home_score} - {match.away_score}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      상대전적이 없습니다.
                    </div>
                  )}
                </div>

                {/* 양팀 최근 5경기 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {matchData.team?.name} 최근 5경기
                    </h2>
                    {homeTeamRecent && homeTeamRecent.length > 0 ? (
                      <div className="space-y-3">
                        {homeTeamRecent.map((match) => {
                          const result = getMatchResult(
                            match,
                            matchData.team_id
                          );
                          return (
                            <div
                              key={match.id}
                              className="flex items-center justify-between p-2 border-b"
                            >
                              <div className="text-sm">
                                {format(
                                  new Date(match.match_date),
                                  "yyyy.MM.dd"
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold">
                                  {match.home_score} - {match.away_score}
                                </div>
                                <div
                                  className={`font-bold ${getResultBadgeColor(
                                    result
                                  )}`}
                                >
                                  {result}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        최근 진행한 경기가 없습니다.
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">
                      {matchData.opponent_team?.name || "상대팀"} 최근 5경기
                    </h2>
                    {awayTeamRecent && awayTeamRecent.length > 0 ? (
                      <div className="space-y-3">
                        {awayTeamRecent.map((match) => {
                          const result = getMatchResult(
                            match,
                            matchData.opponent_team?.id || ""
                          );
                          return (
                            <div
                              key={match.id}
                              className="flex items-center justify-between p-2 border-b"
                            >
                              <div className="text-sm">
                                {format(
                                  new Date(match.match_date),
                                  "yyyy.MM.dd"
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold">
                                  {match.home_score} - {match.away_score}
                                </div>
                                <div
                                  className={`font-bold ${getResultBadgeColor(
                                    result
                                  )}`}
                                >
                                  {result}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        최근 진행한 경기가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
        </>
      )}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          참석 현황
        </h2>

        {/* 홈팀 참석 현황 */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3">
            {matchData.team?.name} (홈)
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {attendanceCount.homeAttending || 0}명
              </div>
              <div className="text-sm text-green-600">참석</div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {attendanceCount.homeAbsent || 0}명
              </div>
              <div className="text-sm text-red-600">불참</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {attendanceCount.homeMaybe || 0}명
              </div>
              <div className="text-sm text-gray-600">미정</div>
            </div>
          </div>

          {/* 홈팀 참석자 명단 */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <h4 className="text-sm font-medium mb-2 w-full">참석자 명단</h4>
              {attendanceList
                ?.filter(
                  (a) =>
                    a.status === "attending" &&
                    (a.team_id === matchData?.team?.id ||
                      // 팀 ID가 없으면 홈팀으로 간주할 수도 있음
                      (!a.team_id && matchData?.is_home))
                )
                .map((attendance) => (
                  <span
                    key={attendance.user_id}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                  >
                    {attendance.profiles?.name || attendance.profiles?.email}
                  </span>
                ))}
              {/* 디버깅용 - 참석자 수가 없으면 메시지 표시 */}
              {attendanceList?.filter((a) => a.status === "attending")
                .length === 0 && (
                <span className="text-xs text-gray-500">
                  참석자가 없습니다.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 어웨이팀 참석 현황 */}
        <div>
          <h3 className="text-md font-semibold mb-3">
            {matchData.opponent_team?.name || "상대팀"} (어웨이)
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {attendanceCount.awayAttending || 0}명
              </div>
              <div className="text-sm text-green-600">참석</div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {attendanceCount.awayAbsent || 0}명
              </div>
              <div className="text-sm text-red-600">불참</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {attendanceCount.awayMaybe || 0}명
              </div>
              <div className="text-sm text-gray-600">미정</div>
            </div>
          </div>

          {/* 어웨이팀 참석자 명단 */}
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <h4 className="text-sm font-medium mb-2 w-full">참석자 명단</h4>
              {attendanceList
                ?.filter(
                  (a) =>
                    a.status === "attending" &&
                    (a.team_id === matchData?.opponent_team?.id ||
                      // 팀 ID가 없는 경우 원정팀으로 간주할 수도 있음
                      (!a.team_id && !matchData?.is_home))
                )
                .map((attendance) => (
                  <span
                    key={attendance.user_id}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                  >
                    {attendance.profiles?.name ||
                      attendance.profiles?.email ||
                      "알 수 없는 사용자"}
                  </span>
                ))}
              {/* 디버깅용 - 참석자 수가 없으면 메시지 표시 */}
              {attendanceList?.filter(
                (a) =>
                  a.status === "attending" &&
                  (a.team_id === matchData?.opponent_team?.id ||
                    (!a.team_id && !matchData?.is_home))
              ).length === 0 && (
                <span className="text-xs text-gray-500">
                  참석자가 없습니다.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 참석 버튼 */}
        <div className="space-y-2 mt-6">
          <p className="text-sm text-gray-600 mb-3">나의 참석 여부</p>
          {matchData.is_finished ? (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-1 mt-0.5">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    경기가 종료되었습니다
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    종료된 경기는 참석 상태를 변경할 수 없습니다.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              variant={userAttendance === "attending" ? "default" : "outline"}
              disabled={isUpdating || matchData.is_finished}
              onClick={() => handleAttendanceChange("attending")}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              참석
            </Button>
            <Button
              variant={userAttendance === "absent" ? "default" : "outline"}
              disabled={isUpdating || matchData.is_finished}
              onClick={() => handleAttendanceChange("absent")}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              불참
            </Button>
            <Button
              variant={userAttendance === "maybe" ? "default" : "outline"}
              disabled={isUpdating || matchData.is_finished}
              onClick={() => handleAttendanceChange("maybe")}
              className="flex-1"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              미정
            </Button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              경기 삭제 확인
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            정말로 이 경기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든
            참석 정보가 함께 삭제됩니다.
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate();
                setIsDeleteDialogOpen(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
