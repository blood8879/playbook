"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useMatchForm } from "../hooks/useMatchForm";
import { StadiumCreationDialog } from "./StadiumCreationDialog";
import { MatchFormValues } from "../lib/schemas";
import { CalendarIcon, Loader2 } from "lucide-react";
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

interface CreateMatchFormProps {
  userId: string;
}

export function CreateMatchForm({ userId }: CreateMatchFormProps) {
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

              {/* 대회 유형 */}
              {/* <FormField
                control={form.control}
                name="competition_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대회 유형</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="대회 유형 선택" />
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

              {/* 등록된 상대팀 선택 */}
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
                            <SelectValue placeholder="상대팀 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teamData.opponentTeams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
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
                            placeholder="게스트 팀에 대한 추가 정보"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guest_club_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>소속 클럽 (선택사항)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="클럽 선택 (선택사항)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teamData.clubs.map((club) => (
                              <SelectItem key={club.id} value={club.id}>
                                {club.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
