"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { match } from "ts-pattern";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarIcon, Plus, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import DaumPostcode from "react-daum-postcode";

// 경기장 생성 폼 스키마
const stadiumFormSchema = z.object({
  name: z.string().min(1, "경기장 이름을 입력해주세요."),
  address: z.string().min(1, "경기장 주소를 입력해주세요."),
  description: z.string().optional(),
});

type StadiumFormValues = z.infer<typeof stadiumFormSchema>;

// 경기 생성 폼 스키마
const matchFormSchema = z
  .object({
    match_date: z.date({
      required_error: "경기 날짜를 선택해주세요.",
    }),
    match_time: z.string({
      required_error: "경기 시간을 선택해주세요.",
    }),
    registration_deadline: z.date({
      required_error: "참가 신청 마감일을 선택해주세요.",
    }),
    opponent_type: z.enum(["registered", "guest", "tbd"], {
      required_error: "상대팀 유형을 선택해주세요.",
    }),
    opponent_team_id: z.string().optional(),
    opponent_guest_team_name: z.string().optional(),
    opponent_guest_team_description: z.string().optional(),
    guest_club_id: z.string().optional(),
    venue: z.string().min(1, "경기장 정보를 입력해주세요."),
    stadium_id: z.string().optional(),
    description: z.string().optional(),
    competition_type: z.enum(["friendly", "league", "cup"], {
      required_error: "경기 유형을 선택해주세요.",
    }),
    game_type: z.enum(["5vs5", "6vs6", "11vs11"], {
      required_error: "경기 방식을 선택해주세요.",
    }),
    is_home: z
      .boolean({
        required_error: "홈/원정 여부를 선택해주세요.",
      })
      .default(true),
    team_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.opponent_type === "registered") {
        return !!data.opponent_team_id;
      }
      if (data.opponent_type === "guest") {
        return !!data.opponent_guest_team_name;
      }
      return true;
    },
    {
      message: "상대팀 정보를 입력해주세요.",
      path: ["opponent_team_id"],
    }
  );

type MatchFormValues = z.infer<typeof matchFormSchema>;

export default function CreateMatchPage() {
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const queryClient = useQueryClient();
  const [teams, setTeams] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [stadiums, setStadiums] = useState<any[]>([]);
  const [guestClubs, setGuestClubs] = useState<any[]>([]);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isAddingStadium, setIsAddingStadium] = useState(false);
  const [newStadium, setNewStadium] = useState({
    name: "",
    address: "",
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const { toast } = useToast();
  const [filteredOtherTeams, setFilteredOtherTeams] = useState<any[]>([]);

  // URL에서 팀 ID 가져오기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get("team");
    if (teamId) {
      setSelectedTeamId(teamId);
    }
  }, []);

  // 폼 초기화
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      match_date: new Date(),
      match_time: "12:00",
      registration_deadline: new Date(),
      opponent_type: "tbd",
      venue: "",
      guest_club_id: "none",
      stadium_id: "none",
      description: "",
      competition_type: "friendly",
      game_type: "5vs5",
      is_home: true,
      opponent_guest_team_name: "",
      opponent_guest_team_description: "",
    },
  });

  // 사용자의 팀 목록 조회
  const { data: userTeams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["userTeams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          team_id,
          role,
          teams (
            id,
            name,
            emblem_url
          )
        `
        )
        .eq("user_id", user?.id)
        .in("role", ["leader", "owner", "admin"])
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 다른 팀 목록 조회 (상대팀으로 선택 가능한 팀)
  const { data: otherTeams, isLoading: isLoadingOtherTeams } = useQuery({
    queryKey: ["otherTeams"],
    queryFn: async () => {
      if (!userTeams || userTeams.length === 0) return [];

      const userTeamIds = userTeams.map((t) => t.team_id);

      const { data, error } = await supabase
        .from("teams")
        .select("id, name, emblem_url, city, gu")
        .not("id", "in", `(${userTeamIds.join(",")})`);

      if (error) throw error;
      return data;
    },
    enabled: !!userTeams && userTeams.length > 0,
  });

  // otherTeams가 로드될 때 filteredOtherTeams 초기화
  useEffect(() => {
    // 검색 결과는 사용자가 검색할 때만 표시하도록 초기화하지 않음
    // if (otherTeams) {
    //   setFilteredOtherTeams(otherTeams);
    // }
  }, [otherTeams]);

  // 선택된 팀의 경기장 및 게스트팀 정보 조회
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!userTeams || userTeams.length === 0) return;

      // URL 파라미터로 전달된 팀 ID가 있으면 해당 팀 사용, 없으면 첫 번째 팀 사용
      const teamId = selectedTeamId || userTeams[0].team_id;

      // 팀 정보 설정
      setTeams(
        userTeams.map((team) => ({
          id: team.team_id,
          name: (team.teams as any)?.name,
          role: team.role,
        }))
      );

      try {
        // 경기장 정보 조회 - 우리 팀의 경기장만 조회
        const { data: stadiumData, error: stadiumError } = await supabase
          .from("stadiums")
          .select("*")
          .eq("team_id", teamId)
          .order("name");

        if (!stadiumError && stadiumData) {
          setStadiums(stadiumData);
        }

        // 게스트팀 정보 조회
        const { data: guestData, error: guestError } = await supabase
          .from("guest_clubs")
          .select("*")
          .eq("team_id", teamId)
          .order("name");

        if (!guestError && guestData) {
          setGuestClubs(guestData);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTeamData();
  }, [userTeams, supabase, selectedTeamId]);

  // 상대팀 선택 시 해당 팀의 경기장 정보 조회 (등록된 팀인 경우에만)
  useEffect(() => {
    const fetchOpponentTeamStadiums = async () => {
      const opponentType = form.watch("opponent_type");
      const opponentTeamId = form.watch("opponent_team_id");
      const homeTeamId = selectedTeamId || (userTeams && userTeams[0]?.team_id);

      if (!homeTeamId) return;

      try {
        const stadiumQuery = supabase
          .from("stadiums")
          .select("*")
          .eq("team_id", homeTeamId)
          .order("name");

        // 등록된 상대팀인 경우, 상대팀의 경기장도 함께 조회
        if (opponentType === "registered" && opponentTeamId) {
          const { data: opponentStadiums, error: opponentError } =
            await supabase
              .from("stadiums")
              .select("*")
              .eq("team_id", opponentTeamId)
              .order("name");

          if (!opponentError && opponentStadiums) {
            // 우리 팀 경기장 조회
            const { data: homeStadiums, error: homeError } = await stadiumQuery;

            if (!homeError && homeStadiums) {
              // 두 팀의 경기장을 합쳐서 설정
              setStadiums([
                ...homeStadiums.map((stadium) => ({
                  ...stadium,
                  team_name:
                    teams.find((t) => t.id === homeTeamId)?.name || "우리 팀",
                })),
                ...opponentStadiums.map((stadium) => ({
                  ...stadium,
                  team_name:
                    otherTeams?.find((t) => t.id === opponentTeamId)?.name ||
                    "상대 팀",
                })),
              ]);
            }
          }
        } else {
          // 게스트팀이거나 미정인 경우, 우리 팀 경기장만 조회
          const { data: homeStadiums, error: homeError } = await stadiumQuery;

          if (!homeError && homeStadiums) {
            setStadiums(
              homeStadiums.map((stadium) => ({
                ...stadium,
                team_name:
                  teams.find((t) => t.id === homeTeamId)?.name || "우리 팀",
              }))
            );
          }
        }
      } catch (err) {
        console.error("경기장 정보 조회 오류:", err);
      }
    };

    fetchOpponentTeamStadiums();
  }, [
    form.watch("opponent_type"),
    form.watch("opponent_team_id"),
    selectedTeamId,
    supabase,
    teams,
    otherTeams,
  ]);

  // 경기 생성 뮤테이션
  const createMatchMutation = useMutation({
    mutationFn: async (data: MatchFormValues) => {
      console.log("mutationFn 시작", data);
      // 필수 날짜 필드 확인
      if (!data.match_date || !data.registration_deadline) {
        throw new Error("경기 날짜와 참가 신청 마감일을 모두 선택해주세요.");
      }

      // 선택된 팀 ID 가져오기
      if (!userTeams || userTeams.length === 0) {
        throw new Error("팀을 선택해주세요.");
      }

      // URL 파라미터로 전달된 팀 ID가 있으면 해당 팀 사용, 없으면 첫 번째 팀 사용
      const teamId = data.team_id || selectedTeamId || userTeams[0].team_id;
      console.log("사용할 팀 ID:", teamId);

      // 사용자가 해당 팀의 관리자인지 확인
      const isTeamAdmin = userTeams.some(
        (team) =>
          team.team_id === teamId &&
          ["leader", "owner", "admin"].includes(team.role)
      );
      console.log("팀 관리자 여부:", isTeamAdmin);

      if (!isTeamAdmin) {
        throw new Error(
          "해당 팀의 관리자, 소유자 또는 리더만 경기를 생성할 수 있습니다."
        );
      }

      let opponent_guest_team_id = null;

      // 게스트팀 처리
      if (data.opponent_type === "guest" && data.opponent_guest_team_name) {
        try {
          // 기존 게스트팀 확인
          const { data: existingTeam, error } = await supabase
            .from("guest_clubs")
            .select("id")
            .eq("team_id", teamId)
            .eq("name", data.opponent_guest_team_name)
            .single();

          if (!error && existingTeam) {
            opponent_guest_team_id = existingTeam.id;
          } else {
            // 새 게스트팀 생성
            const { data: newTeam, error: insertError } = await supabase
              .from("guest_clubs")
              .insert({
                name: data.opponent_guest_team_name,
                description: data.opponent_guest_team_description,
                team_id: teamId,
              })
              .select()
              .single();

            if (insertError) throw insertError;
            opponent_guest_team_id = newTeam.id;
          }
        } catch (error) {
          console.error("게스트팀 처리 오류:", error);
          throw error;
        }
      }

      // 경기 생성
      console.log("경기 생성 시작", {
        team_id: teamId,
        match_date: format(data.match_date, "yyyy-MM-dd"),
        match_time: data.match_time,
        registration_deadline: format(data.registration_deadline, "yyyy-MM-dd"),
        opponent_team_id:
          data.opponent_type === "registered" ? data.opponent_team_id : null,
        opponent_guest_team_id,
        is_tbd: data.opponent_type === "tbd",
        venue: data.venue,
        stadium_id: data.stadium_id === "none" ? null : data.stadium_id,
        description: data.description || null,
        competition_type: "friendly",
        game_type: "11vs11",
        is_home: data.is_home,
      });

      // match_date와 match_time을 결합하여 하나의 timestamp로 변환
      const [hours, minutes] = data.match_time.split(":").map(Number);
      const matchDateTime = new Date(data.match_date);
      matchDateTime.setHours(hours, minutes, 0, 0);

      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          team_id: teamId,
          match_date: matchDateTime.toISOString(),
          registration_deadline: format(
            data.registration_deadline,
            "yyyy-MM-dd"
          ),
          opponent_team_id:
            data.opponent_type === "registered" ? data.opponent_team_id : null,
          opponent_guest_team_id,
          is_tbd: data.opponent_type === "tbd",
          venue: data.venue,
          stadium_id: data.stadium_id === "none" ? null : data.stadium_id,
          description: data.description || null,
          // competition_type: data.competition_type,
          // game_type: data.game_type,
          competition_type: "friendly",
          game_type: "11vs11",
          is_home: data.is_home,
        })
        .select()
        .single();

      if (error) {
        console.error("경기 생성 오류:", error);
        throw error;
      }

      console.log("경기 생성 성공:", match);

      // 홈팀 멤버 조회
      const { data: homeTeamMembers, error: homeError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", teamId);

      if (homeError) throw homeError;

      // 어웨이팀 멤버 조회 (등록된 팀인 경우에만)
      let awayTeamMembers: any[] = [];
      if (data.opponent_type === "registered" && data.opponent_team_id) {
        const { data: awayMembers, error: awayError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", data.opponent_team_id);

        if (awayError) throw awayError;
        awayTeamMembers = awayMembers || [];
      }

      // 모든 팀원들의 참석 상태를 "maybe"로 초기화
      const allMembers = [...(homeTeamMembers || []), ...awayTeamMembers];
      const attendancePromises = allMembers.map((member) =>
        supabase.from("match_attendance").insert({
          match_id: match.id,
          user_id: member.user_id,
          status: "maybe",
        })
      );

      await Promise.all(attendancePromises);

      return match;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });

      // 특정 팀의 경기 목록도 함께 갱신
      if (selectedTeamId) {
        queryClient.invalidateQueries({
          queryKey: ["teamMatches", selectedTeamId],
        });
      }

      // 팀 ID가 있으면 해당 팀의 상세 페이지로 리다이렉트, 없으면 경기 상세 페이지로 이동
      if (selectedTeamId) {
        router.push(`/teams/${selectedTeamId}`);
        toast({
          title: "경기 일정 생성 완료",
          description: "새로운 경기 일정이 성공적으로 생성되었습니다.",
        });
      } else {
        router.push(`/matches/${data.id}`);
      }
    },
    onError: (error) => {
      console.error("경기 생성 오류:", error);
      toast({
        title: "경기 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 폼 제출 처리
  const onSubmit = (values: MatchFormValues) => {
    console.log("onSubmit");
    console.log("values", values);
    if (!values.stadium_id || values.stadium_id === "none") {
      toast({
        title: "경기장 정보 오류",
        description: "경기장을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    // 필수 날짜 필드 확인
    if (!values.match_date || !values.registration_deadline) {
      toast({
        title: "필수 정보 누락",
        description: "경기 날짜와 참가 신청 마감일을 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 팀 ID 확인
    const teamId = selectedTeamId || (teams.length > 0 ? teams[0].id : null);
    if (!teamId) {
      toast({
        title: "팀 정보 오류",
        description:
          "소속된 팀이 없습니다. 팀에 가입한 후 경기를 생성해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 사용자가 선택한 팀의 관리자인지 확인
    const selectedTeam = teams.find((team) => team.id === teamId);
    if (
      !selectedTeam ||
      !["admin", "owner", "leader"].includes(selectedTeam.role)
    ) {
      toast({
        title: "권한 오류",
        description:
          "경기를 생성할 권한이 없습니다. 팀 관리자, 소유자 또는 리더만 경기를 생성할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    // 경기 생성 뮤테이션 실행
    try {
      console.log("경기 생성 뮤테이션 실행:", {
        ...values,
        team_id: teamId,
      });
      createMatchMutation.mutate({
        ...values,
        team_id: teamId,
      });
    } catch (error) {
      console.error("경기 생성 중 오류 발생:", error);
      toast({
        title: "경기 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 사용자가 팀 리더/소유자/관리자가 아닌 경우
  if (userTeams && userTeams.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>경기 일정 생성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-muted-foreground mb-4">
                팀의 리더, 소유자 또는 관리자만 경기 일정을 생성할 수 있습니다.
              </p>
              <Button onClick={() => router.push("/teams")}>
                팀 페이지로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>새 경기 일정 생성</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTeams ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* 경기 날짜 */}
                <FormField
                  control={form.control}
                  name="match_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>경기 날짜</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 경기 시간 */}
                <FormField
                  control={form.control}
                  name="match_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>경기 시간</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="시간 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, hour) =>
                            [0, 30].map((minute) => (
                              <SelectItem
                                key={`${hour}:${minute}`}
                                value={`${hour
                                  .toString()
                                  .padStart(2, "0")}:${minute
                                  .toString()
                                  .padStart(2, "0")}`}
                              >
                                {`${hour.toString().padStart(2, "0")}:${minute
                                  .toString()
                                  .padStart(2, "0")}`}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 참가 신청 마감일 */}
                <FormField
                  control={form.control}
                  name="registration_deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>참가 신청 마감일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜 선택</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 홈/원정 선택 */}
                <FormField
                  control={form.control}
                  name="is_home"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>홈/원정</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "home")
                        }
                        defaultValue={field.value ? "home" : "away"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="홈/원정 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value="home"
                            className="text-blue-600 font-medium"
                          >
                            홈
                          </SelectItem>
                          <SelectItem
                            value="away"
                            className="text-orange-600 font-medium"
                          >
                            원정
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        홈 경기는 우리 팀이 주최하는 경기, 원정 경기는 상대 팀이
                        주최하는 경기입니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 상대팀 유형 */}
                <FormField
                  control={form.control}
                  name="opponent_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>상대팀 유형</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="registered" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              등록된 팀
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="guest" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              게스트 팀
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="tbd" />
                            </FormControl>
                            <FormLabel className="font-normal">미정</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 등록된 팀 선택 */}
                {form.watch("opponent_type") === "registered" && (
                  <FormField
                    control={form.control}
                    name="opponent_team_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상대팀 선택</FormLabel>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="팀 이름으로 검색"
                            className="mb-2"
                            onChange={(e) => {
                              const searchTerm = e.target.value.toLowerCase();
                              if (searchTerm.trim() === "") {
                                setFilteredOtherTeams([]);
                              } else {
                                const filteredTeams = otherTeams?.filter(
                                  (team) =>
                                    team.name.toLowerCase().includes(searchTerm)
                                );
                                setFilteredOtherTeams(filteredTeams || []);
                              }
                            }}
                          />
                          {(filteredOtherTeams.length > 0 ||
                            isLoadingOtherTeams) && (
                            <div className="max-h-60 overflow-auto border rounded-md">
                              {isLoadingOtherTeams ? (
                                <div className="flex justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : filteredOtherTeams.length > 0 ? (
                                filteredOtherTeams.map((team) => (
                                  <div
                                    key={team.id}
                                    className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 ${
                                      field.value === team.id
                                        ? "bg-gray-100"
                                        : ""
                                    }`}
                                    onClick={() => field.onChange(team.id)}
                                  >
                                    {team.emblem_url ? (
                                      <img
                                        src={team.emblem_url}
                                        alt={`${team.name} 엠블럼`}
                                        className="w-6 h-6 mr-2 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 mr-2 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                        {team.name.charAt(0)}
                                      </div>
                                    )}
                                    <span>
                                      {team.name}{" "}
                                      <span className="text-xs text-gray-500">
                                        ({team.city} {team.gu})
                                      </span>
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  검색 결과가 없습니다
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {field.value && (
                          <div className="mt-2 p-2 border rounded-md bg-gray-50">
                            <div className="flex items-center">
                              {otherTeams?.find((t) => t.id === field.value)
                                ?.emblem_url ? (
                                <img
                                  src={
                                    otherTeams?.find(
                                      (t) => t.id === field.value
                                    )?.emblem_url
                                  }
                                  alt="팀 엠블럼"
                                  className="w-8 h-8 mr-2 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 mr-2 rounded-full bg-gray-200 flex items-center justify-center">
                                  {otherTeams
                                    ?.find((t) => t.id === field.value)
                                    ?.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <div className="font-medium">
                                  {
                                    otherTeams?.find(
                                      (t) => t.id === field.value
                                    )?.name
                                  }
                                </div>
                                <div className="text-xs text-gray-500">
                                  {
                                    otherTeams?.find(
                                      (t) => t.id === field.value
                                    )?.city
                                  }{" "}
                                  {
                                    otherTeams?.find(
                                      (t) => t.id === field.value
                                    )?.gu
                                  }
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="ml-auto"
                                onClick={() => field.onChange("")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* 게스트 팀 정보 */}
                {form.watch("opponent_type") === "guest" && (
                  <>
                    <FormField
                      control={form.control}
                      name="guest_club_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>기존 게스트 팀 선택 (선택사항)</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value && value !== "none") {
                                const selectedClub = guestClubs.find(
                                  (club) => club.id === value
                                );
                                if (selectedClub) {
                                  form.setValue(
                                    "opponent_guest_team_name",
                                    selectedClub.name || ""
                                  );
                                  form.setValue(
                                    "opponent_guest_team_description",
                                    selectedClub.description || ""
                                  );
                                }
                              } else {
                                // 직접 입력 선택 시 필드 초기화
                                form.setValue("opponent_guest_team_name", "");
                                form.setValue(
                                  "opponent_guest_team_description",
                                  ""
                                );
                              }
                            }}
                            defaultValue="none"
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="기존 게스트 팀 선택 (선택사항)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">
                                신규 게스트팀
                              </SelectItem>
                              {guestClubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                  {club.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            기존 게스트 팀을 선택하거나 새로운 팀 정보를
                            입력하세요.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="opponent_guest_team_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>게스트 팀 이름</FormLabel>
                          <FormControl>
                            <Input placeholder="게스트 팀 이름" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="opponent_guest_team_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>게스트 팀 설명 (선택사항)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="게스트 팀에 대한 설명"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* 경기장 */}
                <FormField
                  control={form.control}
                  name="stadium_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기장 선택</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value && value !== "none") {
                              const selectedStadium = stadiums.find(
                                (stadium) => stadium.id === value
                              );
                              if (selectedStadium) {
                                form.setValue("venue", selectedStadium.address);
                              }
                            } else {
                              form.setValue("venue", "");
                            }
                          }}
                          defaultValue="none"
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="경기장을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">직접 입력</SelectItem>
                            {stadiums.length > 0 ? (
                              stadiums.map((stadium) => (
                                <SelectItem key={stadium.id} value={stadium.id}>
                                  {stadium.name} ({stadium.team_name})
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                등록된 경기장이 없습니다
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddingStadium(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          경기장 등록
                        </Button>
                      </div>
                      {stadiums.length === 0 && (
                        <FormDescription className="text-yellow-600">
                          등록된 경기장이 없습니다. 경기장을 등록해주세요.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 경기장 주소 (숨겨진 필드) */}
                <div className="hidden">
                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 경기장 생성 다이얼로그 */}
                {selectedTeamId && (
                  <StadiumCreationDialog
                    isOpen={isAddingStadium}
                    onClose={() => setIsAddingStadium(false)}
                    onSave={(stadium) => {
                      setStadiums((prev) => [...prev, stadium]);
                      form.setValue("stadium_id", stadium.id);
                      form.setValue("venue", stadium.address);
                      toast({
                        title: "경기장이 추가되었습니다.",
                        description: `${stadium.name}이(가) 경기장 목록에 추가되었습니다.`,
                      });
                    }}
                    teamId={selectedTeamId}
                  />
                )}

                {/* 경기 설명 */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기 설명 (선택사항)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="경기에 대한 추가 정보"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 경기 유형 */}
                {/* <FormField
                  control={form.control}
                  name="competition_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기 유형</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="경기 유형 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="friendly">친선 경기</SelectItem>
                          <SelectItem value="league">리그 경기</SelectItem>
                          <SelectItem value="cup">컵 경기</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

                {/* 경기 방식 */}
                {/* <FormField
                  control={form.control}
                  name="game_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기 방식</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="경기 방식 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5vs5">5 vs 5</SelectItem>
                          <SelectItem value="6vs6">6 vs 6</SelectItem>
                          <SelectItem value="11vs11">11 vs 11</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

                {/* 제출 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMatchMutation.isPending}
                >
                  {createMatchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    "경기 일정 생성"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// 경기장 생성 다이얼로그 컴포넌트
function StadiumCreationDialog({
  isOpen,
  onClose,
  onSave,
  teamId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stadium: any) => void;
  teamId: string;
}) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StadiumFormValues>({
    resolver: zodResolver(stadiumFormSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
    },
  });

  const handleSubmit = async (values: StadiumFormValues) => {
    if (!teamId) {
      toast({
        title: "오류",
        description: "팀 정보가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("stadiums")
        .insert({
          name: values.name,
          address: values.address,
          description: values.description,
          team_id: teamId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "경기장 등록 완료",
        description: "새로운 경기장이 성공적으로 등록되었습니다.",
      });

      onSave(data);
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "경기장 등록 실패",
        description:
          error.message || "경기장을 등록하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 경기장 등록</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경기장 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="경기장 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경기장 주소</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="경기장 주소" {...field} readOnly />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddressDialogOpen(true)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      주소 검색 버튼을 클릭하여 경기장 주소를 입력하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경기장 설명 (선택사항)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="경기장에 대한 추가 정보"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={onClose}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    "경기장 등록"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AddressSearchDialog
        isOpen={isAddressDialogOpen}
        onClose={() => setIsAddressDialogOpen(false)}
        onSelect={(address) => {
          form.setValue("address", address);
        }}
      />
    </>
  );
}

// 주소 검색 다이얼로그 컴포넌트
function AddressSearchDialog({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>주소 검색</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <DaumPostcode
            onComplete={(data) => {
              onSelect(data.address);
              onClose();
            }}
            style={{ height: 400 }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
