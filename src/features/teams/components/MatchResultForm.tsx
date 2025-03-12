// features/teams/components/MatchResultForm.tsx
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
import {
  Users,
  Home,
  ExternalLink,
  TrendingUp,
  Calculator,
  Edit,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSupabase } from "@/lib/supabase/client";

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
  const { supabase } = useSupabase();
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

  // 자동 계산된 점수와 수동 입력 점수 분리
  const [calculatedHomeScore, setCalculatedHomeScore] = useState(0);
  const [calculatedAwayScore, setCalculatedAwayScore] = useState(0);

  // 수동 입력 점수 상태
  const [manualHomeScore, setManualHomeScore] = useState(0);
  const [manualAwayScore, setManualAwayScore] = useState(0);

  // 수동 입력 모드 상태
  const [isManualMode, setIsManualMode] = useState(false);

  // 자동 스크롤 상태 추가
  const [autoScroll, setAutoScroll] = useState(false);

  // 실제 사용될 스코어 (수동 모드인 경우 수동 점수, 자동 모드인 경우 계산된 점수)
  const homeScore = isManualMode ? manualHomeScore : calculatedHomeScore;
  const awayScore = isManualMode ? manualAwayScore : calculatedAwayScore;

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

    setCalculatedHomeScore(homeTotal);
    setCalculatedAwayScore(awayTotal);

    // 처음 자동 계산 결과를 수동 입력의 초기값으로 설정
    if (manualHomeScore === 0 && manualAwayScore === 0) {
      setManualHomeScore(homeTotal);
      setManualAwayScore(awayTotal);
    }
  }, [playerStats, homeTeamId, awayTeamId]);

  // 참석 상태 변경 시 낙관적 UI 업데이트 및 서버 업데이트
  const handleAttendanceChange = async (
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

    // 자동 스크롤 옵션이 활성화된 경우에만 스크롤
    if (autoScroll && value === "attending" && statsTableRef.current) {
      setTimeout(() => {
        statsTableRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    // 서버에 참석 상태 업데이트
    try {
      const { error } = await supabase
        .from("match_attendance")
        .update({ status: value, updated_at: new Date().toISOString() })
        .eq("match_id", match.id)
        .eq("user_id", userId);

      if (error) {
        console.error("참석 상태 업데이트 오류:", error);
      }
    } catch (error) {
      console.error("참석 상태 업데이트 중 오류 발생:", error);
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

  // 모드 전환 시 자동 계산된 값을 수동 입력 초기값으로 설정
  const handleModeToggle = () => {
    if (!isManualMode) {
      setManualHomeScore(calculatedHomeScore);
      setManualAwayScore(calculatedAwayScore);
    }
    setIsManualMode(!isManualMode);
  };

  const handleSubmit = async () => {
    try {
      // 참석 상태 변경사항 서버에 일괄 저장
      const attendanceUpdates = Object.entries(playerStats).map(
        ([userId, stats]) => ({
          match_id: match.id,
          user_id: userId,
          status: stats.attendance,
          team_id: stats.teamId,
          updated_at: new Date().toISOString(),
        })
      );

      // 참석 상태 일괄 업데이트 (upsert)
      if (attendanceUpdates.length > 0) {
        const { error: attendanceError } = await supabase
          .from("match_attendance")
          .upsert(attendanceUpdates, { onConflict: "match_id,user_id" });

        if (attendanceError) {
          console.error("참석 상태 일괄 업데이트 오류:", attendanceError);
        }
      }

      // 스코어 정보와 모드 정보 추가
      const resultData = {
        playerStats,
        matchScore: {
          homeScore,
          awayScore,
        },
        isManualMode,
      };

      await onSubmit(resultData);
      onSuccess?.();

      // 쿼리 무효화 - 객체 형식 사용
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["match", match.id] });
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
      queryClient.invalidateQueries({
        queryKey: ["matchAttendanceList", match.id],
      });
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

  const nonAttendingPlayers = attendanceList
    ?.filter((attendance) => {
      const status =
        playerStats[attendance.user_id]?.attendance || attendance.status;
      return status === "absent" || status === "maybe";
    })
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

  // 팀별로 참석자 분류
  const homeTeamPlayers = attendingPlayers
    ?.filter(
      (attendance) =>
        attendance.team_id === homeTeamId ||
        playerStats[attendance.user_id]?.teamId === homeTeamId
    )
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

  const awayTeamPlayers = attendingPlayers
    ?.filter(
      (attendance) =>
        attendance.team_id === awayTeamId ||
        playerStats[attendance.user_id]?.teamId === awayTeamId
    )
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

  const unassignedPlayers = attendingPlayers
    ?.filter(
      (attendance) =>
        !attendance.team_id && !playerStats[attendance.user_id]?.teamId
    )
    .sort((a, b) => {
      const nameA = a.profiles?.name || a.profiles?.email || "";
      const nameB = b.profiles?.name || b.profiles?.email || "";
      return nameA.localeCompare(nameB);
    });

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
          {/* 수동/자동 모드 전환 토글 */}
          <div className="flex items-center justify-end space-x-2 mb-4">
            <Calculator
              className={`h-4 w-4 ${
                isManualMode ? "text-gray-400" : "text-blue-600"
              }`}
            />
            <Switch
              checked={isManualMode}
              onCheckedChange={handleModeToggle}
              id="score-mode-toggle"
            />
            <Edit
              className={`h-4 w-4 ${
                isManualMode ? "text-blue-600" : "text-gray-400"
              }`}
            />
            <Label htmlFor="score-mode-toggle" className="text-sm font-medium">
              {isManualMode ? "수동 입력 모드" : "자동 계산 모드"}
            </Label>
          </div>

          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">
                {homeTeamName || "홈팀"}
              </div>
              {isManualMode ? (
                <div className="w-24 mx-auto">
                  <Input
                    type="number"
                    min="0"
                    value={manualHomeScore}
                    onChange={(e) =>
                      setManualHomeScore(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-2xl font-bold text-blue-600"
                  />
                </div>
              ) : (
                <div className="text-5xl font-bold text-blue-600">
                  {calculatedHomeScore}
                </div>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-400">vs</div>
            <div className="text-center">
              <div className="text-lg font-medium mb-2">
                {awayTeamName || "원정팀"}
              </div>
              {isManualMode ? (
                <div className="w-24 mx-auto">
                  <Input
                    type="number"
                    min="0"
                    value={manualAwayScore}
                    onChange={(e) =>
                      setManualAwayScore(parseInt(e.target.value) || 0)
                    }
                    className="text-center text-2xl font-bold text-red-600"
                  />
                </div>
              ) : (
                <div className="text-5xl font-bold text-red-600">
                  {calculatedAwayScore}
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isManualMode
              ? "* 수동 입력 모드: 용병 참여나 게스트팀의 득점을 포함한 최종 스코어를 직접 입력합니다."
              : "* 자동 계산 모드: 등록된 참석자의 골 기록에 따라 자동으로 계산됩니다."}
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

      {/* 결과 저장 버튼 위에 자동 스크롤 토글 추가 */}
      <div className="mt-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-scroll"
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
          />
          <Label htmlFor="auto-scroll">참석 변경 시 자동 스크롤</Label>
        </div>
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

// 선수 스탯 테이블 컴포넌트는 변경 없음
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
