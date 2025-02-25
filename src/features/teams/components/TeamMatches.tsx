"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  CalendarPlus,
  CalendarDays,
  MapPin,
  Users,
  CalendarX,
  CalendarCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { StadiumRegistration } from "./StadiumRegistration";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TeamMatch } from "../types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { TeamMatchesSkeleton } from "./TeamMatchesSkeleton";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { subHours } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Stadium } from "../types/index";

interface TeamMatchesProps {
  matches: TeamMatch[];
  isLoading: boolean;
  teamId: string;
  canManageMatches: boolean;
}

/**
 * @ai_context
 * This component handles listing and creating matches for a team.
 */

// 경기 상태에 따른 배지 색상 반환 함수
export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "scheduled":
      return "outline";
    case "in_progress":
      return "secondary";
    case "completed":
      return "default";
    default:
      return "outline";
  }
};

// 경기 상태 텍스트 반환 함수
export const getStatusText = (status: string) => {
  switch (status) {
    case "scheduled":
      return "예정됨";
    case "in_progress":
      return "진행 중";
    case "completed":
      return "완료됨";
    default:
      return "미정";
  }
};

interface GuestClub {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
}

interface MatchFormData {
  match_date: Date | null;
  registration_deadline: Date | null;
  opponent_type: "registered" | "guest" | "tbd";
  opponent_team_id: string;
  opponent_guest_team?: {
    name: string;
    description?: string;
  };
  venue: string;
  description: string;
  competition_type: "friendly" | "league" | "cup";
  game_type: "5vs5" | "6vs6" | "11vs11";
}

export function TeamMatches({
  matches,
  isLoading,
  teamId,
  canManageMatches,
}: TeamMatchesProps) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingStadium, setIsAddingStadium] = useState(false);
  const [guestClubs, setGuestClubs] = useState<GuestClub[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [didFetchExtras, setDidFetchExtras] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // 경기 상태 및 참가자 수 계산
  const processedMatches = matches.map((match) => {
    // 경기 상태 계산
    let status = "scheduled";
    if (match.is_finished) {
      status = "completed";
    } else if (new Date(match.match_date) < new Date() && !match.is_finished) {
      status = "in_progress";
    }

    // 참가자 수는 실제 데이터가 없으므로 임시로 0으로 설정
    // 실제로는 match_attendances 테이블에서 가져와야 함
    const participants_count = 0;

    return {
      ...match,
      status,
      participants_count,
    };
  });

  const [formData, setFormData] = useState<MatchFormData>({
    match_date: null,
    registration_deadline: null,
    opponent_type: "tbd",
    opponent_team_id: "",
    venue: "",
    description: "",
    competition_type: "friendly",
    game_type: "11vs11",
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .neq("id", teamId);
      if (error) throw error;
      return data;
    },
  });

  const handleOpenDialog = async () => {
    setIsAddingMatch(true);

    if (!didFetchExtras) {
      try {
        const { data: guestData, error: guestError } = await supabase
          .from("guest_clubs")
          .select("*")
          .eq("team_id", teamId)
          .order("name");
        if (!guestError && guestData) {
          setGuestClubs(guestData);
        }

        const { data: stadiumData, error: stadiumError } = await supabase
          .from("stadiums")
          .select("*")
          .eq("team_id", teamId)
          .order("name");
        if (!stadiumError && stadiumData) {
          setStadiums(stadiumData);
        }

        setDidFetchExtras(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const addMatchMutation = useMutation({
    mutationFn: async (data: MatchFormData) => {
      let opponent_guest_team_id = null;

      if (data.opponent_type === "guest" && data.opponent_guest_team) {
        try {
          const { data: existingTeam } = await supabase
            .from("guest_clubs")
            .select("id")
            .eq("team_id", teamId)
            .eq("name", data.opponent_guest_team.name)
            .single();

          if (existingTeam) {
            opponent_guest_team_id = existingTeam.id;
          } else {
            const { data: newTeam, error: insertError } = await supabase
              .from("guest_clubs")
              .insert({
                name: data.opponent_guest_team.name,
                description: data.opponent_guest_team.description,
                team_id: teamId,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            opponent_guest_team_id = newTeam.id;
          }
        } catch (error) {
          throw error;
        }
      }

      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          team_id: teamId,
          match_date: data.match_date,
          registration_deadline: data.registration_deadline,
          opponent_team_id:
            data.opponent_type === "registered" ? data.opponent_team_id : null,
          opponent_guest_team_id,
          is_tbd: data.opponent_type === "tbd",
          venue: data.venue,
          description: data.description,
          competition_type: data.competition_type,
          game_type: data.game_type,
        })
        .select()
        .single();

      if (error) throw error;

      // 홈팀 멤버 조회
      const { data: homeTeamMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      // 어웨이팀 멤버 조회 (등록된 팀인 경우에만)
      let awayTeamMembers = [];
      if (data.opponent_type === "registered" && data.opponent_team_id) {
        const { data: awayMembers } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", data.opponent_team_id);
        awayTeamMembers = awayMembers || [];
      }

      // 모든 팀원들의 참석 상태를 "maybe"로 초기화
      const allMembers = [...(homeTeamMembers || []), ...awayTeamMembers];
      const attendancePromises = allMembers.map((member) =>
        supabase.from("match_attendance").insert({
          match_id: match.id,
          user_id: member.user_id,
          team_id: member.team_id,
          status: "maybe",
        })
      );

      await Promise.all(attendancePromises);

      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMatches", teamId] });
      setIsAddingMatch(false);
      setFormData({
        match_date: null,
        registration_deadline: null,
        opponent_type: "tbd",
        opponent_team_id: "",
        venue: "",
        description: "",
        competition_type: "friendly",
        game_type: "11vs11",
      });
      toast({
        title: "경기 일정 등록 완료",
        description: "새로운 경기 일정이 성공적으로 등록되었습니다.",
      });
    },
    onError: (error: any) => {
      console.error("경기 일정 등록 오류:", error);
      toast({
        title: "경기 일정 등록 실패",
        description:
          error.message || "경기 일정을 등록하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMatchMutation.mutate(formData);
  };

  const handleMatchDateChange = (date: Date | null) => {
    setFormData((prev) => ({
      ...prev,
      match_date: date,
      registration_deadline: date ? subHours(date, 48) : null,
    }));
  };

  if (isLoading) {
    return <TeamMatchesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 다가오는 경기 섹션 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">다가오는 경기</h2>
          {canManageMatches && (
            <div className="flex space-x-2">
              <Link href={`/matches/schedule?team=${teamId}`}>
                <Button size="sm" variant="outline">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  정기 일정 생성
                </Button>
              </Link>
              <Link href={`/matches/new?team=${teamId}`}>
                <Button size="sm">
                  <CalendarPlus className="w-4 h-4 mr-2" />새 경기 일정
                </Button>
              </Link>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : processedMatches.filter((match) => !match.is_finished).length >
          0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedMatches
              .filter((match) => !match.is_finished)
              .map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex justify-between">
                        <span>
                          vs{" "}
                          {match.is_tbd
                            ? "상대팀 미정"
                            : match.opponent_team?.name ||
                              match.opponent_guest_team?.name}
                        </span>
                        <Badge variant={getStatusBadgeVariant(match.status)}>
                          {getStatusText(match.status)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 mb-2">
                        <CalendarDays className="w-4 h-4 inline-block mr-1" />
                        {format(new Date(match.match_date), "PPP p", {
                          locale: ko,
                        })}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        <MapPin className="w-4 h-4 inline-block mr-1" />
                        {match.venue || "장소 미정"}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Users className="w-4 h-4 inline-block mr-1" />
                        참가 인원: {match.participants_count || 0}명
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
            <CalendarX className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              예정된 경기가 없습니다
            </h3>
            <p className="text-gray-500 text-center mb-4">
              새로운 경기 일정을 추가하여 팀 활동을 시작해보세요.
            </p>
            {canManageMatches && (
              <Link href={`/matches/new?team=${teamId}`}>
                <Button variant="outline">새 경기 일정 만들기</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 지난 경기 섹션 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">지난 경기</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : processedMatches.filter((match) => match.is_finished).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedMatches
              .filter((match) => match.is_finished)
              .map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex justify-between">
                        <span>
                          vs{" "}
                          {match.is_tbd
                            ? "상대팀 미정"
                            : match.opponent_team?.name ||
                              match.opponent_guest_team?.name}
                        </span>
                        <Badge variant={getStatusBadgeVariant(match.status)}>
                          {getStatusText(match.status)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 mb-2">
                        <CalendarDays className="w-4 h-4 inline-block mr-1" />
                        {format(new Date(match.match_date), "PPP p", {
                          locale: ko,
                        })}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        <MapPin className="w-4 h-4 inline-block mr-1" />
                        {match.venue || "장소 미정"}
                      </div>
                      <div className="text-sm font-medium">
                        결과: {match.home_score} - {match.away_score}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
            <CalendarCheck className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              지난 경기가 없습니다
            </h3>
            <p className="text-gray-500 text-center">
              경기가 완료되면 여기에 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
