"use client";

import { useParams, useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getTeamById, getLastMatchesOfTeam } from "@/features/teams/api";
import {
  Shield,
  Trophy,
  Users,
  TrendingUp,
  Star,
  Calendar,
} from "lucide-react";
import { useMemo } from "react";

// 데이터 타입 정의
interface AttendanceStat {
  status: string;
  count: number;
}

interface TopScorer {
  id: string;
  name: string;
  goals: number;
}

interface TopAssist {
  id: string;
  name: string;
  assists: number;
}

interface MomStat {
  id: string;
  name: string;
  count: number;
}

interface PlayerAttendance {
  id: string;
  name: string;
  attendanceRate: number;
  totalMatches: number;
  attendingCount: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    name: string;
  } | null;
}

export default function TeamDashboardPage() {
  const params = useParams();
  const { supabase, user } = useSupabase();
  const teamId = params.id as string;

  // 현재 연도 시작일과 끝일 계산
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1); // 1월 1일
  const yearEnd = new Date(currentYear, 11, 31); // 12월 31일

  // 팀 정보 조회
  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => getTeamById(supabase, teamId),
    enabled: !!teamId,
  });

  // 시즌 전체 통계 조회
  const { data: seasonStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["seasonStats", teamId],
    queryFn: async () => {
      // 1. 이 팀이 홈팀인 경기 가져오기
      const { data: homeMatches, error: homeError } = await supabase
        .from("matches")
        .select(
          "id, is_finished, home_score, away_score, team_id, opponent_team_id"
        )
        .eq("team_id", teamId)
        .eq("is_finished", true);

      if (homeError) throw homeError;

      // 2. 이 팀이 원정팀인 경기 가져오기
      const { data: awayMatches, error: awayError } = await supabase
        .from("matches")
        .select(
          "id, is_finished, home_score, away_score, team_id, opponent_team_id"
        )
        .eq("opponent_team_id", teamId)
        .eq("is_finished", true);

      if (awayError) throw awayError;

      // 3. 홈 경기에는 is_home = true, 원정 경기에는 is_home = false 설정
      const homeMatchesWithFlag =
        homeMatches?.map((match) => ({
          ...match,
          is_home: true,
        })) || [];

      const awayMatchesWithFlag =
        awayMatches?.map((match) => ({
          ...match,
          is_home: false,
        })) || [];

      // 4. 모든 경기 데이터 합치기
      const allMatches = [...homeMatchesWithFlag, ...awayMatchesWithFlag];

      console.log("모든 경기 데이터:", allMatches);

      if (!allMatches || allMatches.length === 0) {
        return {
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsScored: 0,
          goalsConceded: 0,
        };
      }

      // 5. 승/무/패 계산 로직 (기존 코드 그대로)
      const wins = allMatches.filter(
        (match) =>
          (match.is_home && match.home_score > match.away_score) ||
          (!match.is_home && match.away_score > match.home_score)
      ).length;

      const draws = allMatches.filter(
        (match) => match.home_score === match.away_score
      ).length;

      const losses = allMatches.filter(
        (match) =>
          (match.is_home && match.home_score < match.away_score) ||
          (!match.is_home && match.away_score < match.home_score)
      ).length;

      // 6. 득점/실점 계산
      const totalGoalsScored = allMatches.reduce(
        (acc, match) =>
          acc + (match.is_home ? match.home_score || 0 : match.away_score || 0),
        0
      );

      const totalGoalsConceded = allMatches.reduce(
        (acc, match) =>
          acc + (match.is_home ? match.away_score || 0 : match.home_score || 0),
        0
      );

      return {
        matches: allMatches.length,
        wins,
        draws,
        losses,
        goalsScored: totalGoalsScored,
        goalsConceded: totalGoalsConceded,
      };
    },
    enabled: !!teamId,
  });

  // 최근 경기 결과 조회 (폼 차트용)
  const { data: recentMatches, isLoading: isRecentMatchesLoading } = useQuery({
    queryKey: ["recentMatches", teamId],
    queryFn: async () => {
      try {
        // API 함수를 사용하여 최근 경기 데이터 가져오기
        const matchesData = await getLastMatchesOfTeam(supabase, teamId, {
          isFinished: true,
          limit: 10,
        });

        if (!matchesData || matchesData.length === 0) {
          console.log("경기 데이터가 없습니다.");
          return [];
        }

        // 데이터가 있는 경우 실제 데이터 매핑
        console.log("실제 경기 데이터:", matchesData);
        return matchesData.map((match) => {
          // 현재 팀이 홈팀인지 확인 (is_home 필드가 있으면 사용, 없으면 team_id로 계산)
          const isHome =
            match.is_home !== undefined
              ? match.is_home
              : match.team_id === teamId;

          // 승/무/패 계산
          const isWin =
            (isHome && match.home_score > match.away_score) ||
            (!isHome && match.away_score > match.home_score);
          const isDraw = match.home_score === match.away_score;

          // 상대팀 이름 결정
          let opponentName = "상대팀";

          if (isHome && match.opponent_team) {
            opponentName = match.opponent_team.name;
          } else if (!isHome && match.team) {
            opponentName = match.team.name;
          } else if (match.opponent_guest_team) {
            // guest_clubs는 객체 또는 배열일 수 있음
            if (Array.isArray(match.opponent_guest_team)) {
              if (
                match.opponent_guest_team.length > 0 &&
                match.opponent_guest_team[0].name
              ) {
                opponentName = match.opponent_guest_team[0].name;
              }
            } else if (match.opponent_guest_team.name) {
              opponentName = match.opponent_guest_team.name;
            }
          }

          return {
            ...match,
            is_home: isHome, // 홈/원정 여부 확정
            result: isWin ? "W" : isDraw ? "D" : "L",
            formattedDate: format(new Date(match.match_date), "M.d"),
            opponentName: opponentName,
          };
        });
      } catch (error) {
        console.error("최근 경기 조회 중 오류 발생:", error);
        // 오류 발생 시 빈 배열 반환
        return [];
      }
    },
    enabled: !!teamId,
  });

  // 득점/실점 통계 (시간 순)
  const { data: scoreTimeline, isLoading: isScoreTimelineLoading } = useQuery({
    queryKey: ["scoreTimeline", teamId],
    queryFn: async () => {
      try {
        // getLastMatchesOfTeam 함수를 사용하여 모든 경기 데이터 가져오기
        const matchesData = await getLastMatchesOfTeam(supabase, teamId, {
          isFinished: true,
          limit: 20, // 최대 20개 경기까지 가져옴
        });

        if (!matchesData || matchesData.length === 0) return [];

        // 데이터를 날짜 오름차순으로 정렬
        const sortedMatches = [...matchesData].sort(
          (a, b) =>
            new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
        );

        return sortedMatches.map((match) => {
          // 현재 팀이 홈팀인지 확인
          const isHome =
            match.is_home !== undefined
              ? match.is_home
              : match.team_id === teamId;

          // 득점과 실점 계산
          const goalsScored = isHome
            ? match.home_score || 0
            : match.away_score || 0;
          const goalsConceded = isHome
            ? match.away_score || 0
            : match.home_score || 0;

          return {
            date: format(new Date(match.match_date), "MM/dd"),
            득점: goalsScored,
            실점: goalsConceded,
          };
        });
      } catch (error) {
        console.error("득점/실점 통계 조회 중 오류:", error);
        return [];
      }
    },
    enabled: !!teamId,
  });

  // 출석률 통계 조회 수정
  const { data: attendanceStats } = useQuery<AttendanceStat[]>({
    queryKey: ["attendanceStats", teamId, currentYear],
    queryFn: async () => {
      try {
        // 현재 연도의 경기만 필터링하기 위한 시작일과 끝일 설정
        const startDateStr = yearStart.toISOString();
        const endDateStr = yearEnd.toISOString();

        // 팀의 모든 경기 ID 가져오기 (현재 연도만)
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id")
          .eq("team_id", teamId)
          .gte("match_date", startDateStr)
          .lte("match_date", endDateStr);

        if (matchesError) throw matchesError;

        if (!matchesData || matchesData.length === 0) {
          return [
            { status: "참석", count: 0 },
            { status: "불참", count: 0 },
            { status: "미정", count: 0 },
          ];
        }

        const matchIds = matchesData.map((match) => match.id);

        // team_id로 직접 필터링하여 출석 데이터 조회
        const { data, error } = await supabase
          .from("match_attendance")
          .select("status")
          .eq("team_id", teamId)
          .in("match_id", matchIds);

        if (error) throw error;

        if (data && data.length > 0) {
          // 참석 상태별로 집계
          const attendanceCount: Record<string, number> = data.reduce(
            (acc: Record<string, number>, curr) => {
              const status = curr.status || "unknown";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            },
            {}
          );

          console.log("실제 출석 데이터:", attendanceCount);
          return [
            { status: "참석", count: attendanceCount.attending || 0 },
            { status: "불참", count: attendanceCount.absent || 0 },
            { status: "미정", count: attendanceCount.maybe || 0 },
          ];
        }

        // 데이터가 없을 경우 모두 0으로 초기화된 데이터 반환
        return [
          { status: "참석", count: 0 },
          { status: "불참", count: 0 },
          { status: "미정", count: 0 },
        ];
      } catch (error) {
        console.error("출석률 정보 조회 중 오류:", error);
        return [
          { status: "참석", count: 0 },
          { status: "불참", count: 0 },
          { status: "미정", count: 0 },
        ];
      }
    },
    enabled: !!teamId,
  });

  // 플레이어별 출석률 통계 조회 - 연도별 필터링 추가
  const { data: playerAttendances } = useQuery<PlayerAttendance[]>({
    queryKey: ["playerAttendances", teamId, currentYear],
    queryFn: async () => {
      try {
        // 현재 연도의 경기만 필터링하기 위한 시작일과 끝일 설정
        const startDateStr = yearStart.toISOString();
        const endDateStr = yearEnd.toISOString();

        // 1. 팀의 현재 연도 모든 경기 수 조회
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id")
          .eq("team_id", teamId)
          .eq("is_finished", true)
          .gte("match_date", startDateStr)
          .lte("match_date", endDateStr);

        if (matchesError) throw matchesError;

        const totalTeamMatches = matchesData?.length || 0;
        if (totalTeamMatches === 0) return [];

        const matchIds = matchesData.map((match) => match.id);

        // 2. 팀에 소속된 모든 플레이어 조회
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from("team_members")
          .select(
            `
            id,
            user_id,
            profiles(
              id,
              name
            )
          `
          )
          .eq("team_id", teamId);

        if (teamMembersError) throw teamMembersError;
        if (!teamMembers || teamMembers.length === 0) return [];

        // 3. 각 플레이어의 출석 데이터 조회 - 현재 연도 경기만
        const playerAttendances: PlayerAttendance[] = [];

        for (const member of teamMembers) {
          // 프로필 정보 추출
          const profile = member.profiles;
          const playerName =
            typeof profile === "object" && profile !== null && "name" in profile
              ? (profile.name as string)
              : "알 수 없음";

          const { data: attendanceData, error: attendanceError } =
            await supabase
              .from("match_attendance")
              .select("*")
              .eq("user_id", member.user_id)
              .eq("status", "attending")
              .in("match_id", matchIds);

          if (attendanceError) throw attendanceError;

          const attendingCount = attendanceData?.length || 0;
          const attendanceRate =
            totalTeamMatches > 0
              ? Math.round((attendingCount / totalTeamMatches) * 100)
              : 0;

          playerAttendances.push({
            id: member.user_id,
            name: playerName,
            attendanceRate,
            totalMatches: totalTeamMatches,
            attendingCount,
          });
        }

        // 출석률 기준 내림차순 정렬 후 상위 5명만 반환
        return playerAttendances
          .sort((a, b) => b.attendanceRate - a.attendanceRate)
          .slice(0, 10);
      } catch (error) {
        console.error("플레이어별 출석률 정보 조회 중 오류:", error);
        return [];
      }
    },
    enabled: !!teamId,
  });

  // 팀 전체 평균 출석률 계산
  const teamAverageAttendance = useMemo(() => {
    if (!playerAttendances || playerAttendances.length === 0) return 0;

    const totalAttendanceRate = playerAttendances.reduce(
      (sum, player) => sum + player.attendanceRate,
      0
    );

    return Math.round(totalAttendanceRate / playerAttendances.length);
  }, [playerAttendances]);

  // 득점자 통계 조회 - 연도별 필터링 및 user_id 사용으로 수정
  // 득점자 통계 조회 부분
  const { data: topScorers } = useQuery<TopScorer[]>({
    queryKey: ["topScorers", teamId, currentYear],
    queryFn: async () => {
      try {
        // 현재 연도의 경기만 필터링하기 위한 시작일과 끝일 설정
        const startDateStr = yearStart.toISOString();
        const endDateStr = yearEnd.toISOString();

        // 1. 팀의 현재 연도 모든 경기 ID 가져오기
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id")
          .eq("team_id", teamId)
          .gte("match_date", startDateStr)
          .lte("match_date", endDateStr);

        if (matchesError) throw matchesError;

        if (!matchesData || matchesData.length === 0) {
          return [];
        }

        const matchIds = matchesData.map((match) => match.id);

        // 2. 현재 연도 경기에 대한 득점 데이터 조회
        const { data: goalsData, error } = await supabase
          .from("match_goals")
          .select("*")
          .eq("team_id", teamId)
          .in("match_id", matchIds);

        if (error) throw error;

        if (!goalsData || goalsData.length === 0) {
          return [];
        }

        // 3. 득점자 user_id 수집
        const userIds = [...new Set(goalsData.map((goal) => goal.user_id))];

        if (userIds.length === 0) {
          return [];
        }

        // 4. 프로필 정보 가져오기
        const { data: profilesData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (profileError) throw profileError;

        // 프로필 ID로 빠르게 조회할 수 있는 맵 만들기
        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((profile) => {
            profileMap[profile.id] = profile;
          });
        }

        // 선수별 득점 집계
        const playerGoals: Record<string, TopScorer> = {};

        goalsData.forEach((goal) => {
          const playerId = goal.user_id;
          const profile = profileMap[playerId];
          const playerName = profile?.name || "알 수 없음";

          if (!playerGoals[playerId]) {
            playerGoals[playerId] = {
              id: playerId,
              name: playerName,
              goals: 0,
            };
          }
          playerGoals[playerId].goals += 1;
        });

        // 배열로 변환하고 득점 수 기준으로 정렬
        const formattedData = Object.values(playerGoals)
          .sort((a, b) => b.goals - a.goals)
          .slice(0, 10);

        console.log("집계된 득점자 데이터:", formattedData);
        return formattedData;
      } catch (error) {
        console.error("득점자 정보 조회 중 오류:", error);
        return [];
      }
    },
    enabled: !!teamId,
  });

  // 어시스트 통계 조회 부분
  const { data: topAssists } = useQuery<TopAssist[]>({
    queryKey: ["topAssists", teamId, currentYear],
    queryFn: async () => {
      try {
        // 현재 연도의 경기만 필터링하기 위한 시작일과 끝일 설정
        const startDateStr = yearStart.toISOString();
        const endDateStr = yearEnd.toISOString();

        // 1. 팀의 현재 연도 모든 경기 ID 가져오기
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id")
          .eq("team_id", teamId)
          .gte("match_date", startDateStr)
          .lte("match_date", endDateStr);

        if (matchesError) throw matchesError;

        if (!matchesData || matchesData.length === 0) {
          return [];
        }

        const matchIds = matchesData.map((match) => match.id);

        // 2. 현재 연도 경기에 대한 어시스트 데이터 조회
        const { data: assistsData, error } = await supabase
          .from("match_assists")
          .select("*")
          .eq("team_id", teamId)
          .in("match_id", matchIds);

        if (error) throw error;

        if (!assistsData || assistsData.length === 0) {
          return [];
        }

        // 3. 어시스트 기록자 user_id 수집
        const userIds = [
          ...new Set(assistsData.map((assist) => assist.user_id)),
        ];

        if (userIds.length === 0) {
          return [];
        }

        // 4. 프로필 정보 가져오기
        const { data: profilesData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (profileError) throw profileError;

        // 프로필 ID로 빠르게 조회할 수 있는 맵 만들기
        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((profile) => {
            profileMap[profile.id] = profile;
          });
        }

        // 선수별 어시스트 집계
        const playerAssists: Record<string, TopAssist> = {};

        assistsData.forEach((assist) => {
          const playerId = assist.user_id;
          const profile = profileMap[playerId];
          const playerName = profile?.name || "알 수 없음";

          if (!playerAssists[playerId]) {
            playerAssists[playerId] = {
              id: playerId,
              name: playerName,
              assists: 0,
            };
          }
          playerAssists[playerId].assists += 1;
        });

        // 배열로 변환하고 어시스트 수 기준으로 정렬
        const formattedData = Object.values(playerAssists)
          .sort((a, b) => b.assists - a.assists)
          .slice(0, 10);

        console.log("집계된 어시스트 데이터:", formattedData);
        return formattedData;
      } catch (error) {
        console.error("어시스트 정보 조회 중 오류:", error);
        return [];
      }
    },
    enabled: !!teamId,
  });

  // MOM 통계 조회 부분
  const { data: momStats } = useQuery<MomStat[]>({
    queryKey: ["momStats", teamId, currentYear],
    queryFn: async () => {
      try {
        // 현재 연도의 경기만 필터링하기 위한 시작일과 끝일 설정
        const startDateStr = yearStart.toISOString();
        const endDateStr = yearEnd.toISOString();

        // 1. 팀의 현재 연도 모든 경기 ID 가져오기
        const { data: matchesData, error: matchesError } = await supabase
          .from("matches")
          .select("id")
          .eq("team_id", teamId)
          .gte("match_date", startDateStr)
          .lte("match_date", endDateStr);

        if (matchesError) throw matchesError;

        if (!matchesData || matchesData.length === 0) {
          return [];
        }

        const matchIds = matchesData.map((match) => match.id);

        // 2. 현재 연도 경기에 대한 MOM 데이터 조회
        const { data: momData, error } = await supabase
          .from("match_mom")
          .select("*")
          .eq("team_id", teamId)
          .in("match_id", matchIds);

        if (error) throw error;

        if (!momData || momData.length === 0) {
          return [];
        }

        // 3. MOM 수상자 user_id 수집
        const userIds = [...new Set(momData.map((mom) => mom.user_id))];

        if (userIds.length === 0) {
          return [];
        }

        // 4. 프로필 정보 가져오기
        const { data: profilesData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (profileError) throw profileError;

        // 프로필 ID로 빠르게 조회할 수 있는 맵 만들기
        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((profile) => {
            profileMap[profile.id] = profile;
          });
        }

        // 각 선수별 MOM 횟수 집계
        const momCounts: Record<string, MomStat> = {};

        momData.forEach((mom) => {
          const playerId = mom.user_id;
          const profile = profileMap[playerId];
          const playerName = profile?.name || "알 수 없음";

          if (!momCounts[playerId]) {
            momCounts[playerId] = {
              id: playerId,
              name: playerName,
              count: 0,
            };
          }
          momCounts[playerId].count += 1;
        });

        // 배열로 변환하고 MOM 횟수 기준으로 정렬
        const result = Object.values(momCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        console.log("집계된 MOM 데이터:", result);
        return result;
      } catch (error) {
        console.error("MOM 정보 조회 중 오류:", error);
        return [];
      }
    },
    enabled: !!teamId,
  });

  // 팀 색상 설정
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  // 사용자 정의 색상 (승/무/패)
  const resultColors = {
    W: "#4ade80", // 승리: 녹색
    D: "#facc15", // 무승부: 노랑
    L: "#f87171", // 패배: 빨강
  };

  // 로딩 상태 확인
  const isLoading =
    isStatsLoading || isRecentMatchesLoading || isScoreTimelineLoading;

  // 데이터 기본값 설정
  const defaultAttendanceStats = [
    { status: "참석", count: 0 },
    { status: "불참", count: 0 },
    { status: "미정", count: 0 },
  ];

  const defaultPlayerAttendances: PlayerAttendance[] = [];
  const defaultTopScorers = [];
  const defaultTopAssists = [];
  const defaultMomStats = [];
  const defaultRecentMatches = [];
  const defaultScoreTimeline = [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Shield className="mr-2 h-8 w-8" />
        {team?.name} 대시보드
      </h1>

      <Tabs defaultValue="team" className="w-full mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="team">팀 통계</TabsTrigger>
          <TabsTrigger value="players">선수 통계</TabsTrigger>
        </TabsList>

        {/* 팀 통계 탭 */}
        <TabsContent value="team">
          {/* 시즌 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">경기 결과</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {seasonStats?.wins || 0}승 {seasonStats?.draws || 0}무{" "}
                  {seasonStats?.losses || 0}패
                </div>
                <p className="text-xs text-muted-foreground">
                  총 {seasonStats?.matches || 0}경기 | 승률{" "}
                  {seasonStats?.matches > 0
                    ? Math.round((seasonStats.wins / seasonStats.matches) * 100)
                    : 0}
                  %
                </p>

                {/* 승/무/패 비율 파이 차트 */}
                <div className="h-40 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "승",
                            value: seasonStats?.wins || 0,
                            color: resultColors.W,
                          },
                          {
                            name: "무",
                            value: seasonStats?.draws || 0,
                            color: resultColors.D,
                          },
                          {
                            name: "패",
                            value: seasonStats?.losses || 0,
                            color: resultColors.L,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          {
                            name: "승",
                            value: seasonStats?.wins || 0,
                            color: resultColors.W,
                          },
                          {
                            name: "무",
                            value: seasonStats?.draws || 0,
                            color: resultColors.D,
                          },
                          {
                            name: "패",
                            value: seasonStats?.losses || 0,
                            color: resultColors.L,
                          },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}경기`, ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">득점/실점</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {seasonStats?.goalsScored || 0} /{" "}
                  {seasonStats?.goalsConceded || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  평균{" "}
                  {seasonStats?.matches > 0
                    ? (seasonStats.goalsScored / seasonStats.matches).toFixed(1)
                    : 0}{" "}
                  골 득점 |{" "}
                  {seasonStats?.matches > 0
                    ? (seasonStats.goalsConceded / seasonStats.matches).toFixed(
                        1
                      )
                    : 0}{" "}
                  골 실점
                </p>

                {/* 득점/실점 막대 차트 */}
                <div className="h-40 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "득점",
                          value: seasonStats?.goalsScored || 0,
                          color: "#4ade80",
                        },
                        {
                          name: "실점",
                          value: seasonStats?.goalsConceded || 0,
                          color: "#f87171",
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}골`, ""]} />
                      <Bar dataKey="value">
                        {[
                          {
                            name: "득점",
                            value: seasonStats?.goalsScored || 0,
                            color: "#4ade80",
                          },
                          {
                            name: "실점",
                            value: seasonStats?.goalsConceded || 0,
                            color: "#f87171",
                          },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">최근 폼</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2 mt-2">
                  {(recentMatches || defaultRecentMatches)
                    ?.slice(0, 5)
                    .map((match, index) => (
                      <div
                        key={index}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          match.result === "W"
                            ? "bg-green-500"
                            : match.result === "D"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      >
                        {match.result}
                      </div>
                    ))}
                </div>

                <div className="text-sm text-muted-foreground mt-4">
                  최근 {Math.min(5, recentMatches?.length || 0)}경기 결과
                </div>

                {/* 최근 경기 결과 리스트 */}
                <div className="mt-2 text-sm">
                  {(recentMatches || defaultRecentMatches)
                    ?.slice(0, 5)
                    .map((match, index) => (
                      <div
                        key={index}
                        className="flex justify-between py-1 border-b text-xs"
                      >
                        <div>{match.formattedDate}</div>
                        <div
                          className={`px-1 rounded ${
                            match.result === "W"
                              ? "text-green-600"
                              : match.result === "D"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {match.is_home ? match.home_score : match.away_score}{" "}
                          -{" "}
                          {match.is_home ? match.away_score : match.home_score}
                        </div>
                        <div className="truncate max-w-[60px]">
                          {match.opponentName}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 득점/실점 추이 그래프 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>득점 및 실점 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={scoreTimeline || defaultScoreTimeline}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="득점"
                      stroke="#4ade80"
                      activeDot={{ r: 8 }}
                    />
                    <Line type="monotone" dataKey="실점" stroke="#f87171" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 출석률 통계 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-indigo-500" />
                  출석률
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                {/* 팀 평균 출석률 */}
                <div className="mb-4 text-center">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    팀 평균 출석률
                  </h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">
                          {teamAverageAttendance}%
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "출석",
                                value: teamAverageAttendance,
                                color: "#818cf8",
                              },
                              {
                                name: "미출석",
                                value: 100 - teamAverageAttendance,
                                color: "#e5e7eb",
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={45}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            {[
                              {
                                name: "출석",
                                value: teamAverageAttendance,
                                color: "#818cf8",
                              },
                              {
                                name: "미출석",
                                value: 100 - teamAverageAttendance,
                                color: "#e5e7eb",
                              },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 플레이어별 출석률 순위 */}
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  선수별 출석률 순위
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={playerAttendances || defaultPlayerAttendances}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value) => [`${value}%`, "출석률"]} />
                      <Bar
                        dataKey="attendanceRate"
                        name="출석률"
                        fill="#818cf8"
                      >
                        {(playerAttendances || defaultPlayerAttendances)?.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 선수 통계 탭 */}
        <TabsContent value="players">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 최다 득점자 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-amber-500" />
                    최다 득점자 ({currentYear}년)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topScorers || defaultTopScorers}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tickFormatter={(value) => value}
                      />
                      <Tooltip />
                      <Bar dataKey="goals" name="득점" fill="#4ade80">
                        {(topScorers || defaultTopScorers)?.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 최다 어시스트 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-blue-500" />
                    최다 어시스트 ({currentYear}년)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topAssists || defaultTopAssists}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tickFormatter={(value) => value}
                      />
                      <Tooltip />
                      <Bar dataKey="assists" name="어시스트" fill="#60a5fa">
                        {(topAssists || defaultTopAssists)?.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* MOM 통계 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center">
                    <Star className="mr-2 h-5 w-5 text-yellow-500" />
                    Man of the Match ({currentYear}년)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={momStats || defaultMomStats}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tickFormatter={(value) => value}
                      />
                      <Tooltip />
                      <Bar dataKey="count" name="MOM 횟수" fill="#fbbf24">
                        {(momStats || defaultMomStats)?.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 출석률 통계 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-indigo-500" />
                    출석률 ({currentYear}년)
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={playerAttendances || defaultPlayerAttendances}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tickFormatter={(value) => value}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, "출석률"]} />
                      <Bar
                        dataKey="attendanceRate"
                        name="출석률"
                        fill="#818cf8"
                      >
                        {(playerAttendances || defaultPlayerAttendances).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
