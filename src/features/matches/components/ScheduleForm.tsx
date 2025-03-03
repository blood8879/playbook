"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Check, X, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ScheduleFormProps {
  userId: string;
}

export function ScheduleForm({ userId }: ScheduleFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [dateWithMatches, setDateWithMatches] = useState<Date[]>([]);
  const [matchAttendances, setMatchAttendances] = useState<Record<string, any>>(
    {}
  );

  useEffect(() => {
    const fetchTeamId = async () => {
      if (!userId) return;

      try {
        const { data: teamMember, error: teamMemberError } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", userId)
          .single();

        if (teamMemberError) throw teamMemberError;
        if (teamMember) setTeamId(teamMember.team_id);
      } catch (error) {
        console.error("팀 정보 조회 오류:", error);
        toast({
          title: "오류",
          description: "팀 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamId();
  }, [userId, toast]);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!teamId) return;

      try {
        setIsLoading(true);

        // 팀의 경기 데이터 가져오기
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            *,
            opponent_team:teams(*),
            opponent_guest_team:guest_teams(*),
            stadium:stadiums(*)
          `
          )
          .eq("team_id", teamId)
          .order("match_date", { ascending: true });

        if (error) throw error;

        setMatches(data || []);

        // 경기가 있는 날짜 추출
        const dates = (data || [])
          .map((match) => new Date(match.match_date))
          .filter((date) => date !== null);

        setDateWithMatches(dates);

        // 각 경기의 참석 현황 데이터 가져오기
        if (data && data.length > 0) {
          await fetchMatchAttendances(data.map((match) => match.id));
        }
      } catch (error) {
        console.error("경기 정보 조회 오류:", error);
        toast({
          title: "오류",
          description: "경기 정보를 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [teamId, toast]);

  // 모든 경기의 참석 현황 가져오기
  const fetchMatchAttendances = async (matchIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("match_players")
        .select("match_id, status, is_home_team")
        .in("match_id", matchIds);

      if (error) throw error;

      // 경기별, 팀별, 상태별 집계 계산
      const attendanceCounts: Record<string, any> = {};

      (data || []).forEach((player) => {
        if (!attendanceCounts[player.match_id]) {
          attendanceCounts[player.match_id] = {
            home: { accepted: 0, rejected: 0, pending: 0 },
            away: { accepted: 0, rejected: 0, pending: 0 },
          };
        }

        const teamKey = player.is_home_team ? "home" : "away";
        attendanceCounts[player.match_id][teamKey][player.status]++;
      });

      setMatchAttendances(attendanceCounts);
    } catch (error) {
      console.error("참석 현황 조회 오류:", error);
    }
  };

  const getMatchesForSelectedDate = () => {
    if (!selectedDate) return [];

    return matches.filter((match) => {
      const matchDate = new Date(match.match_date);
      return (
        matchDate.getDate() === selectedDate.getDate() &&
        matchDate.getMonth() === selectedDate.getMonth() &&
        matchDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  const getCompetitionTypeLabel = (type: string) => {
    switch (type) {
      case "friendly":
        return "친선 경기";
      case "league":
        return "리그 경기";
      case "cup":
        return "컵 경기";
      default:
        return type;
    }
  };

  const getGameTypeLabel = (type: string) => {
    switch (type) {
      case "11vs11":
        return "11:11";
      case "8vs8":
        return "8:8";
      case "6vs6":
        return "6:6";
      case "5vs5":
        return "5:5";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">
          팀 정보를 찾을 수 없습니다
        </h2>
        <p className="text-muted-foreground">
          먼저 팀에 가입하거나 새 팀을 만들어주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>경기 일정</CardTitle>
          <CardDescription>일정을 확인할 날짜를 선택하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="border rounded-md p-3"
            locale={ko}
            modifiers={{
              hasMatch: dateWithMatches,
            }}
            modifiersStyles={{
              hasMatch: {
                backgroundColor: "var(--primary-50)",
                fontWeight: "bold",
                borderRadius: "0.3rem",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? format(selectedDate, "yyyy년 MM월 dd일", { locale: ko })
              : "선택된 날짜 없음"}
          </CardTitle>
          <CardDescription>
            {getMatchesForSelectedDate().length > 0
              ? `${getMatchesForSelectedDate().length}개의 경기가 있습니다.`
              : "이 날짜에 예정된 경기가 없습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getMatchesForSelectedDate().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                선택한 날짜에 예정된 경기가 없습니다.
              </div>
            ) : (
              getMatchesForSelectedDate().map((match) => {
                // 상대팀 정보 처리
                const opponentName = match.is_tbd
                  ? "미정"
                  : match.opponent_team
                  ? match.opponent_team.name
                  : match.opponent_guest_team
                  ? match.opponent_guest_team.name
                  : "미정";

                // 참석 현황 가져오기
                const attendance = matchAttendances[match.id] || {
                  home: { accepted: 0, rejected: 0, pending: 0 },
                  away: { accepted: 0, rejected: 0, pending: 0 },
                };

                // 홈팀과 원정팀 결정
                const homeTeamName = match.is_home ? "우리 팀" : opponentName;
                const awayTeamName = match.is_home ? opponentName : "우리 팀";

                // 홈팀과 원정팀의 참석 현황
                const homeAttendance = match.is_home
                  ? attendance.home
                  : attendance.away;
                const awayAttendance = match.is_home
                  ? attendance.away
                  : attendance.home;

                return (
                  <Card key={match.id} className="overflow-hidden">
                    <div className="bg-secondary p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <Badge variant="outline" className="mr-2">
                            {match.is_home ? "홈" : "원정"}
                          </Badge>
                          <Badge variant="outline">
                            {getCompetitionTypeLabel(match.competition_type)}
                          </Badge>
                          {match.game_type && (
                            <Badge variant="outline" className="ml-2">
                              {getGameTypeLabel(match.game_type)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(match.match_date), "p", {
                            locale: ko,
                          })}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-2 items-center text-center my-2">
                        <div>
                          <div className="font-semibold">{homeTeamName}</div>
                          {match.is_finished && match.home_score !== null && (
                            <div className="text-lg font-bold mt-1">
                              {match.home_score}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold">VS</div>
                        <div>
                          <div className="font-semibold">{awayTeamName}</div>
                          {match.is_finished && match.away_score !== null && (
                            <div className="text-lg font-bold mt-1">
                              {match.away_score}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 참석 현황 */}
                      <div className="mt-4">
                        <h3 className="text-sm font-medium mb-2">참석 현황</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {/* 홈팀 참석 현황 */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              {homeTeamName}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-green-50 rounded p-2">
                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                                <p className="text-green-600 font-medium">
                                  {homeAttendance.accepted}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  참석
                                </p>
                              </div>
                              <div className="bg-red-50 rounded p-2">
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                                <p className="text-red-600 font-medium">
                                  {homeAttendance.rejected}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  불참
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <HelpCircle className="h-4 w-4 text-gray-500 mx-auto" />
                                <p className="text-gray-600 font-medium">
                                  {homeAttendance.pending}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  미정
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 어웨이팀 참석 현황 */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              {awayTeamName}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="bg-green-50 rounded p-2">
                                <Check className="h-4 w-4 text-green-500 mx-auto" />
                                <p className="text-green-600 font-medium">
                                  {awayAttendance.accepted}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  참석
                                </p>
                              </div>
                              <div className="bg-red-50 rounded p-2">
                                <X className="h-4 w-4 text-red-500 mx-auto" />
                                <p className="text-red-600 font-medium">
                                  {awayAttendance.rejected}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  불참
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded p-2">
                                <HelpCircle className="h-4 w-4 text-gray-500 mx-auto" />
                                <p className="text-gray-600 font-medium">
                                  {awayAttendance.pending}명
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  미정
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm">
                        <div>
                          <span className="font-medium">경기장:</span>{" "}
                          {match.venue}
                        </div>
                        {match.description && (
                          <div className="mt-2">
                            <span className="font-medium">설명:</span>{" "}
                            {match.description}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // 경기 상세 페이지로 이동
                            window.location.href = `/matches/${match.id}`;
                          }}
                        >
                          상세 보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
