"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMatchForm, useTeamSearch } from "../hooks/useMatchForm";
import { StadiumCreationDialog } from "./StadiumCreationDialog";
import { MatchFormValues } from "../lib/schemas";
import {
  CalendarIcon,
  Loader2,
  Check,
  ChevronsUpDown,
  Search,
  Shield,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface CreateMatchFormProps {
  userId: string;
}

export function CreateMatchForm({ userId }: CreateMatchFormProps) {
  const { supabase } = useSupabase();
  const {
    form,
    teamData,
    isLoading,
    isSubmitting,
    opponentTeamStadiums,
    isStadiumDialogOpen,
    setIsStadiumDialogOpen,
    onSubmit,
    handleStadiumSaved,
  } = useMatchForm(userId);

  // 팀 검색 훅 사용
  const { searchTerm, setSearchTerm, searchResults, isSearching, error } =
    useTeamSearch();

  const [teamSearchOpen, setTeamSearchOpen] = useState(false);
  const [guestTeamType, setGuestTeamType] = useState<"existing" | "new">(
    "existing"
  );

  // 기존 게스트팀 목록 조회
  const { data: guestTeams, isLoading: isLoadingGuestTeams } = useQuery({
    queryKey: ["guestTeams", teamData?.team?.id],
    queryFn: async () => {
      if (!teamData?.team?.id) return [];

      const { data, error } = await supabase
        .from("guest_clubs")
        .select("id, name, description")
        .eq("team_id", teamData.team.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamData?.team?.id,
  });

  // 게스트팀 유형 변경 처리
  const handleGuestTeamTypeChange = (type: "existing" | "new") => {
    setGuestTeamType(type);

    // 게스트팀 유형이 변경될 때 관련 필드 초기화
    if (type === "existing") {
      // 기존 게스트팀 선택 모드로 전환 시 새 게스트팀 필드 초기화
      form.setValue("opponent_guest_team_name", "");
      form.setValue("opponent_guest_team_description", "");
    } else {
      // 새 게스트팀 모드로 전환 시 기존 게스트팀 ID 초기화
      form.setValue("opponent_guest_team_id", "");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!teamData?.team) {
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
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* 경기 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>경기 기본 정보</CardTitle>
              <CardDescription>
                경기 일정과 기본 정보를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                          locale={ko}
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
                  <FormItem>
                    <FormLabel>경기 시간</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
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
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                            date > form.getValues("match_date") ||
                            date < new Date()
                          }
                          initialFocus
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      경기 당일 또는 이전 날짜만 선택 가능합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 경기 유형 (홈/원정) */}
              <FormField
                control={form.control}
                name="match_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>경기 유형</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="home" />
                          </FormControl>
                          <FormLabel className="font-normal">홈 경기</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="away" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            원정 경기
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 상대팀 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>상대팀 정보</CardTitle>
              <CardDescription>
                경기 상대팀에 대한 정보를 입력해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 상대팀 유형 */}
              <FormField
                control={form.control}
                name="opponent_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>상대팀 유형</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          // 게스트팀으로 변경 시 기본값을 existing으로 설정
                          if (value === "guest") {
                            setGuestTeamType("existing");
                            // 게스트팀 관련 필드 초기화
                            form.setValue("opponent_guest_team_id", "");
                            form.setValue("opponent_guest_team_name", "");
                            form.setValue(
                              "opponent_guest_team_description",
                              ""
                            );
                          }
                        }}
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
                          <FormLabel className="font-normal">
                            나중에 결정
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 등록된 상대팀 선택 - 검색 기능 적용 */}
              {form.watch("opponent_type") === "registered" && (
                <FormField
                  control={form.control}
                  name="opponent_team_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>상대팀 검색</FormLabel>
                      <Popover
                        open={teamSearchOpen}
                        onOpenChange={setTeamSearchOpen}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={teamSearchOpen}
                              className="w-full justify-between"
                              onClick={() => {
                                // 팝업 열릴 때 검색어 초기화 방지
                                if (!teamSearchOpen && !searchTerm) {
                                  // 기존 선택된 팀이 있으면 검색어에 해당 팀 이름 설정
                                  const selectedTeam = field.value
                                    ? searchResults.find(
                                        (team) => team.id === field.value
                                      ) ||
                                      teamData.opponentTeams.find(
                                        (team) => team.id === field.value
                                      )
                                    : null;

                                  if (selectedTeam) {
                                    setSearchTerm(selectedTeam.name);
                                  }
                                }
                              }}
                            >
                              {field.value
                                ? searchResults.find(
                                    (team) => team.id === field.value
                                  )?.name ||
                                  teamData.opponentTeams.find(
                                    (team) => team.id === field.value
                                  )?.name ||
                                  "상대팀 검색"
                                : "상대팀 검색"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <div className="w-full rounded-md border border-input bg-transparent">
                            <div className="flex items-center border-b px-3">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <input
                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="팀 이름 입력 (1글자 이상)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {isSearching ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span>검색 중...</span>
                                </div>
                              ) : searchResults.length === 0 &&
                                searchTerm.length > 0 ? (
                                <div className="py-6 text-center text-sm">
                                  검색 결과가 없습니다
                                </div>
                              ) : searchTerm.length === 0 ? (
                                <div className="py-6 text-center text-sm">
                                  팀 이름을 입력하세요
                                </div>
                              ) : null}

                              {error && (
                                <div className="py-2 px-4 text-sm text-red-500">
                                  {error}
                                </div>
                              )}

                              {!isSearching && searchResults.length > 0 && (
                                <div className="p-1">
                                  {searchResults.map((team) => (
                                    <div
                                      key={team.id}
                                      onClick={() => {
                                        form.setValue(
                                          "opponent_team_id",
                                          team.id
                                        );
                                        setTeamSearchOpen(false);
                                      }}
                                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    >
                                      {team.emblem_url ? (
                                        <div className="w-6 h-6 relative rounded-full overflow-hidden mr-2">
                                          <img
                                            src={team.emblem_url}
                                            alt={team.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                                          <Shield className="w-3 h-3 text-gray-400" />
                                        </div>
                                      )}
                                      <span>{team.name}</span>
                                      {field.value === team.id && (
                                        <Check className="ml-auto h-4 w-4" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        팀 이름을 입력하면 검색 결과가 표시됩니다.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 게스트 팀 정보 - 개선된 부분 */}
              {form.watch("opponent_type") === "guest" && (
                <>
                  {/* 게스트팀 유형 선택 */}
                  <div className="space-y-2 mb-4">
                    <FormLabel>게스트팀 유형</FormLabel>
                    <div className="flex space-x-4">
                      <Button
                        type="button"
                        variant={
                          guestTeamType === "existing" ? "default" : "outline"
                        }
                        onClick={() => handleGuestTeamTypeChange("existing")}
                        className="flex-1"
                      >
                        기존 게스트팀
                      </Button>
                      <Button
                        type="button"
                        variant={
                          guestTeamType === "new" ? "default" : "outline"
                        }
                        onClick={() => handleGuestTeamTypeChange("new")}
                        className="flex-1"
                      >
                        새 게스트팀
                      </Button>
                    </div>
                  </div>

                  {/* 기존 게스트팀 선택 */}
                  {guestTeamType === "existing" && (
                    <FormField
                      control={form.control}
                      name="opponent_guest_team_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>게스트팀 선택</FormLabel>
                          {isLoadingGuestTeams ? (
                            <div className="flex items-center space-x-2 py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>게스트팀 목록을 불러오는 중...</span>
                            </div>
                          ) : guestTeams && guestTeams.length > 0 ? (
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);

                                // 선택된 게스트팀의 정보를 참조용으로만 설정 (실제 사용하지 않음)
                                // 이 정보는 폼 제출 시 무시되어야 함
                                const selectedTeam = guestTeams.find(
                                  (team) => team.id === value
                                );

                                // 새 게스트팀 필드 초기화 (중요: 이 필드들은 폼 제출 시 사용되지 않아야 함)
                                form.setValue("opponent_guest_team_name", "");
                                form.setValue(
                                  "opponent_guest_team_description",
                                  ""
                                );
                              }}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="게스트팀 선택" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {guestTeams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50">
                              <p>등록된 게스트팀이 없습니다.</p>
                              <Button
                                type="button"
                                variant="link"
                                onClick={() => handleGuestTeamTypeChange("new")}
                                className="p-0 h-auto mt-1"
                              >
                                새 게스트팀 등록하기
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* 새 게스트팀 입력 */}
                  {guestTeamType === "new" && (
                    <>
                      <FormField
                        control={form.control}
                        name="opponent_guest_team_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>게스트 팀 이름</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="게스트 팀 이름"
                                {...field}
                                value={field.value || ""}
                              />
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
                                placeholder="게스트 팀에 대한 추가 정보"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 경기장 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>경기장 정보</CardTitle>
              <CardDescription>
                경기가 열릴 장소를 선택해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 경기장 선택 (홈 경기 또는 중립 경기인 경우) */}
              {(form.watch("match_type") === "home" ||
                form.watch("match_type") === "neutral") && (
                <div className="space-y-4">
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
                              // 선택된 경기장 이름을 venue 필드에 설정
                              const selectedStadium = teamData.stadiums.find(
                                (s) => s.id === value
                              );
                              if (selectedStadium) {
                                form.setValue("venue", selectedStadium.name);
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="경기장 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teamData.stadiums.map((stadium) => (
                                <SelectItem key={stadium.id} value={stadium.id}>
                                  {stadium.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            onClick={() => setIsStadiumDialogOpen(true)}
                          >
                            새 경기장 추가
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 원정 경기인 경우 상대팀 경기장 선택 */}
              {form.watch("match_type") === "away" &&
                form.watch("opponent_type") === "registered" &&
                form.watch("opponent_team_id") && (
                  <FormField
                    control={form.control}
                    name="stadium_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>상대팀 경기장 선택</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // 선택된 경기장 이름을 venue 필드에 설정
                            const selectedStadium = opponentTeamStadiums.find(
                              (s) => s.id === value
                            );
                            if (selectedStadium) {
                              form.setValue("venue", selectedStadium.name);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="경기장 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {opponentTeamStadiums.map((stadium) => (
                              <SelectItem key={stadium.id} value={stadium.id}>
                                {stadium.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

              {/* 직접 입력 필드 (원정 게스트팀이거나 TBD인 경우) */}
              {((form.watch("match_type") === "away" &&
                form.watch("opponent_type") !== "registered") ||
                form.watch("opponent_type") === "tbd") && (
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경기장 정보</FormLabel>
                      <FormControl>
                        <Input placeholder="경기장 이름 또는 주소" {...field} />
                      </FormControl>
                      <FormDescription>
                        경기장 이름이나 주소를 직접 입력해주세요.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
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
                        placeholder="경기에 대한 추가 정보를 입력하세요."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "경기 생성하기"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* 경기장 생성 다이얼로그 */}
      {isStadiumDialogOpen && teamData?.team && (
        <StadiumCreationDialog
          isOpen={isStadiumDialogOpen}
          onClose={() => setIsStadiumDialogOpen(false)}
          onSave={handleStadiumSaved}
          teamId={teamData.team.id}
        />
      )}
    </>
  );
}
