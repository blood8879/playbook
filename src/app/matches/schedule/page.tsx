"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, addHours, setHours, setMinutes } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarIcon, Plus, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import DaumPostcode from "react-daum-postcode";

// 경기 일정 생성 스키마
const scheduleFormSchema = z.object({
  team_id: z.string({
    required_error: "팀을 선택해주세요.",
  }),
  venue: z.string().min(1, "경기장 정보를 입력해주세요."),
  stadium_id: z.string().optional(),
  competition_type: z.enum(["friendly", "league", "cup"], {
    required_error: "경기 유형을 선택해주세요.",
  }),
  game_type: z.enum(["5vs5", "6vs6", "11vs11"], {
    required_error: "경기 방식을 선택해주세요.",
  }),
  description: z.string().optional(),
  start_date: z.date({
    required_error: "시작 날짜를 선택해주세요.",
  }),
  end_date: z.date({
    required_error: "종료 날짜를 선택해주세요.",
  }),
  days_of_week: z.array(z.string()).min(1, "최소 하나의 요일을 선택해주세요."),
  time_slots: z
    .array(
      z.object({
        start_time: z.string(),
        end_time: z.string(),
      })
    )
    .min(1, "최소 하나의 시간대를 선택해주세요."),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export default function CreateSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("team");
  const { supabase, user } = useSupabase();
  const queryClient = useQueryClient();
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stadiums, setStadiums] = useState<any[]>([]);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const { toast } = useToast();

  // 폼 초기화
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      team_id: teamId || "",
      venue: "",
      stadium_id: "",
      competition_type: "friendly",
      game_type: "11vs11",
      description: "",
      start_date: new Date(),
      end_date: addDays(new Date(), 30),
      days_of_week: ["월", "수", "금"],
      time_slots: [
        {
          start_time: "19:00",
          end_time: "21:00",
        },
      ],
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

  // 팀 ID가 URL에서 제공되었을 때 폼 값 설정
  useEffect(() => {
    if (teamId) {
      form.setValue("team_id", teamId);
    }
  }, [teamId, form]);

  // 선택된 팀의 경기장 정보 조회
  useEffect(() => {
    const fetchStadiums = async () => {
      const selectedTeamId = form.getValues("team_id");
      if (!selectedTeamId) return;

      try {
        const { data, error } = await supabase
          .from("stadiums")
          .select("*")
          .eq("team_id", selectedTeamId)
          .order("name");

        if (!error && data) {
          setStadiums(data);
        }
      } catch (err) {
        console.error("경기장 정보 조회 오류:", err);
      }
    };

    fetchStadiums();
  }, [form.watch("team_id"), supabase]);

  // 시간대 추가
  const addTimeSlot = () => {
    const currentTimeSlots = form.getValues("time_slots");
    form.setValue("time_slots", [
      ...currentTimeSlots,
      { start_time: "19:00", end_time: "21:00" },
    ]);
  };

  // 시간대 제거
  const removeTimeSlot = (index: number) => {
    const currentTimeSlots = form.getValues("time_slots");
    if (currentTimeSlots.length > 1) {
      form.setValue(
        "time_slots",
        currentTimeSlots.filter((_, i) => i !== index)
      );
    }
  };

  // 요일 옵션
  const daysOfWeek = [
    { value: "월", label: "월요일" },
    { value: "화", label: "화요일" },
    { value: "수", label: "수요일" },
    { value: "목", label: "목요일" },
    { value: "금", label: "금요일" },
    { value: "토", label: "토요일" },
    { value: "일", label: "일요일" },
  ];

  // 경기 일정 생성 함수
  const generateMatches = (data: ScheduleFormValues) => {
    setIsGenerating(true);

    try {
      const matches = [];
      const currentDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      // 요일 매핑 (한글 -> 숫자)
      const dayMapping: Record<string, number> = {
        월: 1,
        화: 2,
        수: 3,
        목: 4,
        금: 5,
        토: 6,
        일: 0,
      };

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0: 일요일, 1: 월요일, ...
        const koreanDay = Object.keys(dayMapping).find(
          (key) => dayMapping[key] === dayOfWeek
        );

        if (koreanDay && data.days_of_week.includes(koreanDay)) {
          // 선택된 요일에 해당하면 시간대별로 경기 생성
          for (const timeSlot of data.time_slots) {
            const [startHour, startMinute] = timeSlot.start_time
              .split(":")
              .map(Number);
            const [endHour, endMinute] = timeSlot.end_time
              .split(":")
              .map(Number);

            const matchDate = new Date(currentDate);
            setHours(matchDate, startHour);
            setMinutes(matchDate, startMinute);

            const registrationDeadline = new Date(matchDate);
            registrationDeadline.setHours(registrationDeadline.getHours() - 48);

            matches.push({
              team_id: data.team_id,
              match_date: matchDate.toISOString(),
              registration_deadline: registrationDeadline.toISOString(),
              is_tbd: true, // 상대팀 미정
              venue: data.venue,
              stadium_id: data.stadium_id || null,
              description: data.description,
              competition_type: data.competition_type,
              game_type: data.game_type,
              day_of_week: koreanDay,
              start_time: timeSlot.start_time,
              end_time: timeSlot.end_time,
            });
          }
        }

        // 다음 날짜로 이동
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setGeneratedMatches(matches);
    } catch (error) {
      console.error("경기 일정 생성 오류:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 경기 일정 저장 뮤테이션
  const saveScheduleMutation = useMutation({
    mutationFn: async (matches: any[]) => {
      // 경기 일정 저장
      const { data, error } = await supabase
        .from("matches")
        .insert(matches)
        .select();

      if (error) throw error;

      // 각 경기에 대해 팀원들의 참석 상태를 "maybe"로 초기화
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", matches[0].team_id);

      if (membersError) throw membersError;

      const attendancePromises = [];
      for (const match of data) {
        for (const member of teamMembers) {
          attendancePromises.push(
            supabase.from("match_attendance").insert({
              match_id: match.id,
              user_id: member.user_id,
              status: "maybe",
            })
          );
        }
      }

      await Promise.all(attendancePromises);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teamMatches", form.getValues("team_id")],
      });
      router.push(`/teams/${form.getValues("team_id")}/matches`);
    },
  });

  // 폼 제출 처리
  const onSubmit = (values: ScheduleFormValues) => {
    generateMatches(values);
  };

  // 생성된 경기 일정 저장
  const saveGeneratedMatches = () => {
    if (generatedMatches.length > 0) {
      saveScheduleMutation.mutate(generatedMatches);
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>정기 경기 일정 생성</CardTitle>
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
                {/* 팀 선택 */}
                <FormField
                  control={form.control}
                  name="team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>팀</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="팀을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userTeams?.map((team) => (
                            <SelectItem key={team.team_id} value={team.team_id}>
                              {(team.teams as any)?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 경기장 */}
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기장</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
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
                          <SelectTrigger>
                            <SelectValue placeholder="등록된 경기장 선택 (선택사항)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">직접 입력</SelectItem>
                            {stadiums.map((stadium) => (
                              <SelectItem key={stadium.id} value={stadium.id}>
                                {stadium.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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

                {/* 시작 날짜 */}
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>시작 날짜</FormLabel>
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

                {/* 종료 날짜 */}
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>종료 날짜</FormLabel>
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
                            disabled={(date) =>
                              date < form.getValues("start_date")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 요일 선택 */}
                <FormField
                  control={form.control}
                  name="days_of_week"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">요일 선택</FormLabel>
                        <FormDescription>
                          경기를 진행할 요일을 선택하세요.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {daysOfWeek.map((day) => (
                          <FormField
                            key={day.value}
                            control={form.control}
                            name="days_of_week"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              day.value,
                                            ])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== day.value
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {day.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 시간대 선택 */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-base">시간대 선택</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeSlot}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      시간대 추가
                    </Button>
                  </div>
                  <FormDescription>
                    경기를 진행할 시간대를 선택하세요.
                  </FormDescription>

                  {form.watch("time_slots").map((_, index) => (
                    <div
                      key={index}
                      className="flex items-end gap-2 border p-3 rounded-md"
                    >
                      <FormField
                        control={form.control}
                        name={`time_slots.${index}.start_time`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>시작 시간</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`time_slots.${index}.end_time`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>종료 시간</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeSlot(index)}
                        disabled={form.watch("time_slots").length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* 제출 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      일정 생성 중...
                    </>
                  ) : (
                    "경기 일정 생성하기"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* 생성된 경기 일정 미리보기 */}
      {generatedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              생성된 경기 일정 ({generatedMatches.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {generatedMatches.map((match, index) => (
                  <div
                    key={index}
                    className="border rounded-md p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {format(new Date(match.match_date), "PPP", {
                            locale: ko,
                          })}{" "}
                          ({match.day_of_week}요일)
                        </h3>
                        <p className="text-sm text-gray-500">
                          {match.start_time} - {match.end_time}
                        </p>
                      </div>
                      <Badge variant="outline">{match.game_type}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <p>
                        <span className="font-medium">장소:</span> {match.venue}
                      </p>
                      <p>
                        <span className="font-medium">경기 유형:</span>{" "}
                        {match.competition_type === "friendly"
                          ? "친선 경기"
                          : match.competition_type === "league"
                          ? "리그 경기"
                          : "컵 경기"}
                      </p>
                      <p>
                        <span className="font-medium">경기 방식:</span>{" "}
                        {match.game_type}
                      </p>
                      {match.description && (
                        <p>
                          <span className="font-medium">설명:</span>{" "}
                          {match.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-6 flex justify-end space-x-4">
              <Button variant="outline" onClick={() => setGeneratedMatches([])}>
                취소
              </Button>
              <Button
                onClick={saveGeneratedMatches}
                disabled={saveScheduleMutation.isPending}
              >
                {saveScheduleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "일정 저장하기"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
