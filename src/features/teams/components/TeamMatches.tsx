"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { TeamMatch, Stadium } from "../types";
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

interface TeamMatchesProps {
  matches: TeamMatch[];
  isLoading: boolean;
  teamId: string;
  isLeader: boolean;
}

/**
 * @ai_context
 * This component handles listing and creating matches for a team.
 */

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
  isLeader,
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
    <div className="space-y-4">
      {isLeader && (
        <div className="flex justify-end">
          <Button onClick={handleOpenDialog}>
            <Plus className="w-4 h-4 mr-2" />
            경기 일정 등록
          </Button>
        </div>
      )}

      <Dialog open={isAddingMatch} onOpenChange={setIsAddingMatch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 경기 일정 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match_date">경기 일시</Label>
                <DatePicker
                  selected={formData.match_date}
                  onChange={handleMatchDateChange}
                  showTimeSelect
                  timeIntervals={30}
                  dateFormat="yyyy.MM.dd aa h:mm"
                  timeFormat="aa h:mm"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholderText="경기 일시를 선택하세요"
                  locale={ko}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_deadline">참가 신청 마감</Label>
                <DatePicker
                  selected={formData.registration_deadline}
                  onChange={(date: Date | null) =>
                    setFormData({ ...formData, registration_deadline: date })
                  }
                  showTimeSelect
                  timeIntervals={30}
                  dateFormat="yyyy.MM.dd aa h:mm"
                  timeFormat="aa h:mm"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholderText="참가 신청 마감 시간을 선택하세요"
                  locale={ko}
                  maxDate={formData.match_date}
                />
              </div>

              <div className="space-y-2">
                <Label>상대팀 정보</Label>
                <RadioGroup
                  value={formData.opponent_type}
                  onValueChange={(value: "registered" | "guest" | "tbd") =>
                    setFormData({ ...formData, opponent_type: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="registered" id="registered" />
                    <Label htmlFor="registered">등록된 팀</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="guest" id="guest" />
                    <Label htmlFor="guest">게스트 팀</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tbd" id="tbd" />
                    <Label htmlFor="tbd">미정</Label>
                  </div>
                </RadioGroup>

                {formData.opponent_type === "guest" && (
                  <div className="space-y-2 mt-2">
                    {guestClubs && guestClubs.length > 0 ? (
                      <Select
                        value={formData.opponent_guest_team?.name || ""}
                        onValueChange={(value) => {
                          const selectedClub = guestClubs.find(
                            (club) => club.name === value
                          );
                          setFormData({
                            ...formData,
                            opponent_guest_team: {
                              name: value,
                              description: selectedClub?.description || "",
                            },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="기존 게스트 팀 선택 또는 새로 입력" />
                        </SelectTrigger>
                        <SelectContent>
                          {guestClubs.map((club) => (
                            <SelectItem key={club.id} value={club.name}>
                              {club.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}

                    <Input
                      placeholder="게스트 팀 이름"
                      value={formData.opponent_guest_team?.name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          opponent_guest_team: {
                            ...formData.opponent_guest_team,
                            name: e.target.value,
                          },
                        })
                      }
                      required
                    />
                    <Textarea
                      placeholder="게스트 팀 설명"
                      value={formData.opponent_guest_team?.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          opponent_guest_team: {
                            ...formData.opponent_guest_team,
                            description: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                )}

                {formData.opponent_type === "registered" && (
                  <div className="space-y-2">
                    <Label>등록된 팀 선택</Label>
                    <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={commandOpen}
                          className="w-full justify-between"
                        >
                          {formData.opponent_team_id
                            ? teams?.find(
                                (team) => team.id === formData.opponent_team_id
                              )?.name
                            : "팀을 선택하세요"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="팀 검색..." />
                          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                          <CommandGroup>
                            {teams?.map((team) => (
                              <CommandItem
                                key={team.id}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    opponent_team_id: team.id,
                                  });
                                  setCommandOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.opponent_team_id === team.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {team.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="competition_type">대회 유형</Label>
                <Select
                  value={formData.competition_type}
                  onValueChange={(value: "friendly" | "league" | "cup") =>
                    setFormData({ ...formData, competition_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="대회 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">친선전</SelectItem>
                    <SelectItem value="league">리그</SelectItem>
                    <SelectItem value="cup">컵</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game_type">경기 유형</Label>
                <Select
                  value={formData.game_type}
                  onValueChange={(value: "5vs5" | "6vs6" | "11vs11") =>
                    setFormData({ ...formData, game_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="경기 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5vs5">5vs5</SelectItem>
                    <SelectItem value="6vs6">6vs6</SelectItem>
                    <SelectItem value="11vs11">11vs11</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>경기장</Label>
                {stadiums && stadiums.length > 0 ? (
                  <>
                    <Select
                      value={formData.venue}
                      onValueChange={(value) =>
                        setFormData({ ...formData, venue: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="경기장을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {stadiums.map((stadium) => (
                          <SelectItem key={stadium.id} value={stadium.name}>
                            {stadium.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setIsAddingStadium(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      다른 경기장 등록
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">
                      등록된 경기장이 없습니다.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingStadium(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />새 경기장 등록
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="경기에 대한 설명을 입력하세요"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">등록</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <StadiumRegistration
        teamId={teamId}
        open={isAddingStadium}
        onOpenChange={setIsAddingStadium}
        onSuccess={(stadium) => {
          setIsAddingStadium(false);
          setStadiums((prev) => [...prev, stadium]);
          setFormData({ ...formData, venue: stadium.name });
        }}
      />

      <div className="space-y-2">
        {matches
          .filter((match) => !match.is_finished)
          .map((match) => (
            <div
              key={match.id}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/matches/${match.id}`)}
            >
              <div className="text-sm text-gray-500">
                {format(new Date(match.match_date), "PPP p", { locale: ko })}
              </div>
              <div className="font-medium">
                {match.is_tbd
                  ? "상대팀 미정"
                  : match.opponent_team?.name ||
                    match.opponent_guest_team?.name}
              </div>
              <div className="text-sm text-gray-500">{match.venue}</div>
              <div className="text-sm text-gray-500">
                {match.competition_type === "friendly"
                  ? "친선전"
                  : match.competition_type === "league"
                  ? "리그"
                  : "컵"}{" "}
                · {match.game_type}
              </div>
              {match.description && (
                <div className="text-sm text-gray-500 mt-2">
                  {match.description}
                </div>
              )}
            </div>
          ))}
        {matches.filter((match) => !match.is_finished).length === 0 && (
          <div className="text-center text-gray-500 py-4">
            예정된 경기 일정이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
