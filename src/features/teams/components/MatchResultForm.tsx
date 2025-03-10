"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamMatch, MatchAttendance } from "@/features/teams/types/index";
import { Badge } from "@/components/ui/badge";
import { Users, Home, ExternalLink, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface MatchResultFormProps {
  match: TeamMatch;
  attendanceList: MatchAttendance[];
  onSubmit: (data: any) => void | Promise<void>;
  onSuccess?: () => void;
  isUpdating: boolean;
}

export function MatchResultForm({
  match,
  attendanceList,
  onSubmit,
  onSuccess,
  isUpdating,
}: MatchResultFormProps) {
  const statsTableRef = useRef<HTMLDivElement>(null);
  const [playerStats, setPlayerStats] = useState<{
    [key: string]: {
      attendance: "attending" | "absent" | "maybe";
      fieldGoals: number;
      freeKickGoals: number;
      penaltyGoals: number;
      assists: number;
      isMom: boolean;
      teamId?: string; // 선수의 팀 ID 추가
    };
  }>({});
  const queryClient = useQueryClient();

  // 팀별 총 골 계산
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // 홈팀과 원정팀 ID
  const homeTeamId = match.is_home
    ? match.team_id
    : match.opponent_team_id || "";
  const awayTeamId = match.is_home
    ? match.opponent_team_id || ""
    : match.team_id;

  // 홈팀과 원정팀 이름
  const homeTeamName = match.is_home
    ? (match.user_team || match.team)?.name
    : (match.opposing_team || match.opponent_team)?.name;
  const awayTeamName = match.is_home
    ? (match.opposing_team || match.opponent_team)?.name
    : (match.user_team || match.team)?.name;

  // 사용자 팀 ID
  const userTeamId = (match.user_team || match.team)?.id;
  const opposingTeamId = (match.opposing_team || match.opponent_team)?.id;

  // 초기 상태 설정
  useEffect(() => {
    const updatedStats: {
      [key: string]: {
        attendance: "attending" | "absent" | "maybe";
        fieldGoals: number;
        freeKickGoals: number;
        penaltyGoals: number;
        assists: number;
        isMom: boolean;
        teamId?: string;
      };
    } = {};

    attendanceList?.forEach((attendance) => {
      const existingStats = playerStats[attendance.user_id] || {
        fieldGoals: 0,
        freeKickGoals: 0,
        penaltyGoals: 0,
        assists: 0,
        isMom: false,
      };

      updatedStats[attendance.user_id] = {
        ...existingStats,
        attendance: attendance.status,
        teamId: attendance.team_id, // 팀 ID 저장
      };
    });

    setPlayerStats(updatedStats);
  }, [attendanceList]);

  // 팀별 스코어 계산
  useEffect(() => {
    let homeTotal = 0;
    let awayTotal = 0;

    // 모든 참석자의 골 합산
    Object.entries(playerStats).forEach(([userId, stats]) => {
      if (stats.attendance !== "attending") return;

      const totalGoals =
        (stats.fieldGoals || 0) +
        (stats.freeKickGoals || 0) +
        (stats.penaltyGoals || 0);

      // 선수의 팀 ID를 기준으로 홈/원정 구분
      if (stats.teamId === homeTeamId) {
        homeTotal += totalGoals;
      } else if (stats.teamId === awayTeamId) {
        awayTotal += totalGoals;
      } else {
        // 팀 ID가 없는 경우 기본적으로 홈팀으로 처리
        homeTotal += totalGoals;
      }
    });

    setHomeScore(homeTotal);
    setAwayScore(awayTotal);
  }, [playerStats, homeTeamId, awayTeamId]);

  // 참석 상태 변경 시 낙관적 UI 업데이트
  const handleAttendanceChange = (
    userId: string,
    value: "attending" | "absent" | "maybe"
  ) => {
    // 낙관적 UI 업데이트
    setPlayerStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        attendance: value,
      },
    }));

    // 참석으로 변경된 경우 스탯 테이블로 스크롤
    if (value === "attending" && statsTableRef.current) {
      setTimeout(() => {
        statsTableRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    // 참석 현황 쿼리 무효화 (낙관적 업데이트 후 서버 데이터와 동기화)
    queryClient.invalidateQueries({ queryKey: ["attendance", match.id] });
  };

  const handleStatChange = (
    userId: string,
    field:
      | "fieldGoals"
      | "freeKickGoals"
      | "penaltyGoals"
      | "assists"
      | "isMom",
    value: number | boolean
  ) => {
    setPlayerStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      // 스코어 정보 추가
      const resultData = {
        playerStats,
        matchScore: {
          homeScore,
          awayScore,
        },
      };

      await onSubmit(resultData);
      onSuccess?.();

      // 쿼리 무효화 - 객체 형식 사용
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match", match.id] });
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
    } catch (error) {
      console.error("Failed to save match result:", error);
    }
  };

  // 참석자와 미참석자(미정/불참) 분리
  const attendingPlayers = attendanceList?.filter(
    (attendance) =>
      playerStats[attendance.user_id]?.attendance === "attending" ||
      attendance.status === "attending"
  );

  const nonAttendingPlayers = attendanceList?.filter((attendance) => {
    const status =
      playerStats[attendance.user_id]?.attendance || attendance.status;
    return status === "absent" || status === "maybe";
  });

  // 팀별로 참석자 분류
  const homeTeamPlayers = attendingPlayers?.filter(
    (attendance) =>
      attendance.team_id === homeTeamId ||
      playerStats[attendance.user_id]?.teamId === homeTeamId
  );

  const awayTeamPlayers = attendingPlayers?.filter(
    (attendance) =>
      attendance.team_id === awayTeamId ||
      playerStats[attendance.user_id]?.teamId === awayTeamId
  );

  const unassignedPlayers = attendingPlayers?.filter(
    (attendance) =>
      !attendance.team_id && !playerStats[attendance.user_id]?.teamId
  );

  // 선수의 팀 표시를 위한 함수
  const getTeamBadge = (teamId?: string) => {
    if (!teamId) return null;

    const isHome = teamId === homeTeamId;
    return (
      <Badge variant={isHome ? "default" : "secondary"} className="ml-2">
        {isHome ? (
          <Home className="w-3 h-3 mr-1" />
        ) : (
          <ExternalLink className="w-3 h-3 mr-1" />
        )}
        {isHome ? homeTeamName : awayTeamName}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* 현재 스코어 표시 */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            현재 스코어
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">
                {homeTeamName || "홈팀"}
              </div>
              <div className="text-5xl font-bold text-blue-600">
                {homeScore}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-400">vs</div>
            <div className="text-center">
              <div className="text-lg font-medium mb-2">
                {awayTeamName || "원정팀"}
              </div>
              <div className="text-5xl font-bold text-red-600">{awayScore}</div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            * 참석자의 골 기록에 따라 자동으로 계산됩니다
          </p>
        </CardContent>
      </Card>

      {/* 참석자 스탯 테이블 */}
      <div ref={statsTableRef}>
        <Card className="overflow-hidden border-0 shadow-md mb-6">
          <CardHeader className="bg-gradient-to-r from-green-700 to-green-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              참석자 경기 기록
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* 홈팀 선수 */}
            {homeTeamPlayers && homeTeamPlayers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <Home className="w-4 h-4 mr-2" />
                  {homeTeamName || "홈팀"} 선수
                </h3>
                <Card className="p-4 bg-blue-50">
                  <PlayerStatsTable
                    players={homeTeamPlayers}
                    playerStats={playerStats}
                    handleAttendanceChange={handleAttendanceChange}
                    handleStatChange={handleStatChange}
                    getTeamBadge={getTeamBadge}
                  />
                </Card>
              </div>
            )}

            {/* 원정팀 선수 */}
            {awayTeamPlayers && awayTeamPlayers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {awayTeamName || "원정팀"} 선수
                </h3>
                <Card className="p-4 bg-red-50">
                  <PlayerStatsTable
                    players={awayTeamPlayers}
                    playerStats={playerStats}
                    handleAttendanceChange={handleAttendanceChange}
                    handleStatChange={handleStatChange}
                    getTeamBadge={getTeamBadge}
                  />
                </Card>
              </div>
            )}

            {/* 팀 미지정 선수 */}
            {unassignedPlayers && unassignedPlayers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">팀 미지정 선수</h3>
                <Card className="p-4 bg-gray-50">
                  <PlayerStatsTable
                    players={unassignedPlayers}
                    playerStats={playerStats}
                    handleAttendanceChange={handleAttendanceChange}
                    handleStatChange={handleStatChange}
                    getTeamBadge={getTeamBadge}
                  />
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 미정/불참 플레이어 섹션 */}
      {nonAttendingPlayers && nonAttendingPlayers.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-md mb-6">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              미정/불참 플레이어
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nonAttendingPlayers.map((attendance) => {
                const stats = playerStats[attendance.user_id] || {
                  attendance: attendance.status,
                  fieldGoals: 0,
                  freeKickGoals: 0,
                  penaltyGoals: 0,
                  assists: 0,
                  isMom: false,
                };

                return (
                  <div
                    key={attendance.user_id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        {attendance.profiles?.name ||
                          attendance.profiles?.email}
                      </span>
                      <Badge
                        variant={
                          stats.attendance === "maybe" ? "outline" : "secondary"
                        }
                      >
                        {stats.attendance === "maybe" ? "미정" : "불참"}
                      </Badge>
                      {getTeamBadge(attendance.team_id || stats.teamId)}
                    </div>
                    <Select
                      value={stats.attendance}
                      onValueChange={(
                        value: "attending" | "absent" | "maybe"
                      ) => handleAttendanceChange(attendance.user_id, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attending">참석</SelectItem>
                        <SelectItem value="absent">불참</SelectItem>
                        <SelectItem value="maybe">미정</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isUpdating}
          className="bg-purple-900 hover:bg-purple-800"
        >
          {isUpdating ? "저장 중..." : "결과 저장"}
        </Button>
      </div>
    </div>
  );
}

// 선수 스탯 테이블 컴포넌트
function PlayerStatsTable({
  players,
  playerStats,
  handleAttendanceChange,
  handleStatChange,
  getTeamBadge,
}: {
  players: MatchAttendance[];
  playerStats: any;
  handleAttendanceChange: (
    userId: string,
    value: "attending" | "absent" | "maybe"
  ) => void;
  handleStatChange: (
    userId: string,
    field:
      | "fieldGoals"
      | "freeKickGoals"
      | "penaltyGoals"
      | "assists"
      | "isMom",
    value: number | boolean
  ) => void;
  getTeamBadge: (teamId?: string) => React.ReactNode;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>선수</TableHead>
          <TableHead>참석 여부</TableHead>
          <TableHead>필드골</TableHead>
          <TableHead>프리킥</TableHead>
          <TableHead>페널티킥</TableHead>
          <TableHead>총 골</TableHead>
          <TableHead>어시스트</TableHead>
          <TableHead>MOM</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((attendance) => {
          const stats = playerStats[attendance.user_id] || {
            attendance: attendance.status,
            fieldGoals: 0,
            freeKickGoals: 0,
            penaltyGoals: 0,
            assists: 0,
            isMom: false,
          };

          const totalGoals =
            (stats.fieldGoals || 0) +
            (stats.freeKickGoals || 0) +
            (stats.penaltyGoals || 0);

          return (
            <TableRow key={attendance.user_id}>
              <TableCell className="flex items-center">
                <span>
                  {attendance.profiles?.name || attendance.profiles?.email}
                </span>
                {getTeamBadge(attendance.team_id || stats.teamId)}
              </TableCell>
              <TableCell>
                <Select
                  value={stats.attendance}
                  onValueChange={(value: "attending" | "absent" | "maybe") =>
                    handleAttendanceChange(attendance.user_id, value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attending">참석</SelectItem>
                    <SelectItem value="absent">불참</SelectItem>
                    <SelectItem value="maybe">미정</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={stats.fieldGoals}
                  onChange={(e) =>
                    handleStatChange(
                      attendance.user_id,
                      "fieldGoals",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={stats.freeKickGoals}
                  onChange={(e) =>
                    handleStatChange(
                      attendance.user_id,
                      "freeKickGoals",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={stats.penaltyGoals}
                  onChange={(e) =>
                    handleStatChange(
                      attendance.user_id,
                      "penaltyGoals",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell className="font-bold">{totalGoals}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={stats.assists}
                  onChange={(e) =>
                    handleStatChange(
                      attendance.user_id,
                      "assists",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-20"
                />
              </TableCell>
              <TableCell>
                <Checkbox
                  checked={stats.isMom}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    handleStatChange(attendance.user_id, "isMom", !!checked)
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
