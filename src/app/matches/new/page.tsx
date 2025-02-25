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
import { Loader2, CalendarIcon, Plus, Search } from "lucide-react";
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

// 경기 생성 폼 스키마
const matchFormSchema = z
  .object({
    match_date: z.date({
      required_error: "경기 날짜를 선택해주세요.",
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
  const [teams, setTeams] = useState<any[]>([]);
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
      registration_deadline: new Date(),
      opponent_type: "tbd",
      venue: "",
      guest_club_id: "",
      stadium_id: "",
      description: "",
      competition_type: "friendly",
      game_type: "5vs5",
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
        .select("*")
        .not("id", "in", `(${userTeamIds.join(",")})`);

      if (error) throw error;
      return data;
    },
    enabled: !!userTeams && userTeams.length > 0,
  });

  // 선택된 팀의 경기장 및 게스트팀 정보 조회
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!userTeams || userTeams.length === 0) return;

      // URL 파라미터로 전달된 팀 ID가 있으면 해당 팀 사용, 없으면 첫 번째 팀 사용
      const teamId = selectedTeamId || userTeams[0].team_id;

      try {
        // 경기장 정보 조회
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

  // 상대팀 선택 시 해당 팀의 경기장 정보 조회
  useEffect(() => {
    const fetchOpponentTeamData = async (teamId: string) => {
      try {
        // 경기장 정보 조회
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

    const selectedTeamId = form.watch("opponent_team_id");
    if (selectedTeamId) {
      fetchOpponentTeamData(selectedTeamId);
    }
  }, [form.watch("opponent_team_id"), supabase]);

  // 경기 생성 뮤테이션
  const createMatchMutation = useMutation({
    mutationFn: async (data: MatchFormValues) => {
      // 선택된 팀 ID 가져오기
      if (!userTeams || userTeams.length === 0) {
        throw new Error("팀을 선택해주세요.");
      }

      // URL 파라미터로 전달된 팀 ID가 있으면 해당 팀 사용, 없으면 첫 번째 팀 사용
      const teamId = selectedTeamId || userTeams[0].team_id;

      // 사용자가 해당 팀의 관리자인지 확인
      const isTeamAdmin = userTeams.some(
        (team) =>
          team.team_id === teamId &&
          ["leader", "owner", "admin"].includes(team.role)
      );

      if (!isTeamAdmin) {
        throw new Error("해당 팀의 관리자만 경기를 생성할 수 있습니다.");
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
      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          team_id: teamId,
          match_date: data.match_date.toISOString(),
          registration_deadline: data.registration_deadline.toISOString(),
          opponent_team_id:
            data.opponent_type === "registered" ? data.opponent_team_id : null,
          opponent_guest_team_id,
          is_tbd: data.opponent_type === "tbd",
          venue: data.venue,
          stadium_id: data.stadium_id || null,
          description: data.description || null,
          competition_type: data.competition_type,
          game_type: data.game_type,
        })
        .select()
        .single();

      if (error) throw error;

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

      // 팀 ID가 있으면 해당 팀의 매치 목록으로 리다이렉트, 없으면 경기 상세 페이지로 이동
      if (selectedTeamId) {
        router.push(`/teams/${selectedTeamId}/matches`);
        toast({
          title: "경기 일정 생성 완료",
          description: "새로운 경기 일정이 성공적으로 생성되었습니다.",
        });
      } else {
        router.push(`/matches/${data.id}`);
      }
    },
  });

  // 폼 제출 처리
  const onSubmit = (values: MatchFormValues) => {
    createMatchMutation.mutate(values);
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="상대팀을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingOtherTeams ? (
                              <div className="flex justify-center p-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : (
                              otherTeams?.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
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
                                    selectedClub.name
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
                            value={field.value || "none"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stadium_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>등록된 경기장 선택 (선택사항)</FormLabel>
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
                              // 직접 입력 선택 시 필드 초기화
                              form.setValue("venue", "");
                            }
                          }}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="등록된 경기장 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">직접 입력</SelectItem>
                            {stadiums.map((stadium) => (
                              <SelectItem key={stadium.id} value={stadium.id}>
                                {stadium.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          등록된 경기장을 선택하거나 새로운 경기장 정보를
                          입력하세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>경기장 주소</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="경기장 이름 또는 주소"
                              {...field}
                            />
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 주소 검색 다이얼로그 */}
                <AddressSearchDialog
                  isOpen={isAddressDialogOpen}
                  onClose={() => setIsAddressDialogOpen(false)}
                  onSelect={(address) => {
                    form.setValue("venue", address);
                    toast({
                      title: "주소가 선택되었습니다.",
                      description: address,
                    });
                  }}
                />

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
                <FormField
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
                />

                {/* 경기 방식 */}
                <FormField
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
                />

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
