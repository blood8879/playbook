"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StadiumRegistration } from "./StadiumRegistration";
import { Stadium } from "../types";

interface TeamMatchesProps {
  teamId: string;
  isLeader: boolean;
}

interface Match {
  id: string;
  team_id: string;
  match_date: string;
  registration_deadline: string;
  opponent_team_id: string | null;
  opponent_guest_team_id: string | null;
  is_tbd: boolean;
  venue: string;
  description: string | null;
  competition_type: "friendly" | "league" | "cup";
  game_type: "5vs5" | "6vs6" | "11vs11";
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

interface GuestClub {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
}

interface MatchFormData {
  match_date: string;
  registration_deadline: string;
  opponent_type: "registered" | "guest" | "tbd";
  opponent_team_id?: string;
  opponent_guest_team?: {
    name: string;
    description?: string;
  };
  venue: string;
  description: string;
  competition_type: "friendly" | "league" | "cup";
  game_type: "5vs5" | "6vs6" | "11vs11";
}

export function TeamMatches({ teamId, isLeader }: TeamMatchesProps) {
  const { supabase } = useSupabase();
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingStadium, setIsAddingStadium] = useState(false);
  const [formData, setFormData] = useState<MatchFormData>({
    match_date: "",
    registration_deadline: "",
    opponent_type: "tbd",
    venue: "",
    description: "",
    competition_type: "friendly",
    game_type: "11vs11",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["teamMatches", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          opponent_team:teams!matches_opponent_team_id_fkey(*),
          opponent_guest_team:guest_clubs!matches_opponent_guest_team_id_fkey(*)
        `
        )
        .eq("team_id", teamId)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: guestClubs } = useQuery<GuestClub[]>({
    queryKey: ["teamGuestClubs", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_clubs")
        .select("*")
        .eq("team_id", teamId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: stadiums } = useQuery<Stadium[]>({
    queryKey: ["teamStadiums", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stadiums")
        .select("*")
        .eq("team_id", teamId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMatchMutation = useMutation({
    mutationFn: async (data: MatchFormData) => {
      let opponent_guest_team_id = null;

      // 게스트 팀인 경우 먼저 게스트 팀을 생성
      if (data.opponent_type === "guest" && data.opponent_guest_team) {
        const { data: guestTeam, error: guestError } = await supabase
          .from("guest_clubs")
          .insert({
            ...data.opponent_guest_team,
            team_id: teamId,
          })
          .select()
          .single();

        if (guestError) {
          // 이미 존재하는 게스트 클럽인 경우 해당 클럽의 ID를 사용
          if (guestError.code === "23505") {
            const { data: existingClub, error: existingClubError } =
              await supabase
                .from("guest_clubs")
                .select("id")
                .eq("team_id", teamId)
                .eq("name", data.opponent_guest_team.name)
                .single();

            if (existingClubError) {
              throw new Error(
                "게스트 클럽 정보를 확인하는 중 오류가 발생했습니다."
              );
            }

            if (existingClub) {
              opponent_guest_team_id = existingClub.id;
            }
          } else {
            throw new Error("게스트 클럽을 등록하는 중 오류가 발생했습니다.");
          }
        } else {
          opponent_guest_team_id = guestTeam.id;
        }
      }

      // 경기 생성
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

      if (error) {
        if (error.code === "23503") {
          throw new Error("선택한 상대 팀이 존재하지 않습니다.");
        } else if (error.code === "23514") {
          throw new Error("경기 일정이 등록 마감일보다 빠를 수 없습니다.");
        } else {
          throw new Error("경기 일정을 등록하는 중 오류가 발생했습니다.");
        }
      }

      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMatches", teamId] });
      setIsAddingMatch(false);
      setFormData({
        match_date: "",
        registration_deadline: "",
        opponent_type: "tbd",
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

  if (isLoading) {
    return <div className="text-center py-8">경기 일정을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      {isLeader && (
        <div className="flex justify-end">
          <Button onClick={() => setIsAddingMatch(true)}>
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
                <Input
                  id="match_date"
                  type="datetime-local"
                  value={formData.match_date}
                  onChange={(e) =>
                    setFormData({ ...formData, match_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_deadline">참가 신청 마감</Label>
                <Input
                  id="registration_deadline"
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_deadline: e.target.value,
                    })
                  }
                  required
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

      {/* 경기장 등록 다이얼로그 */}
      <StadiumRegistration
        teamId={teamId}
        open={isAddingStadium}
        onOpenChange={setIsAddingStadium}
        onSuccess={(stadium) => {
          setIsAddingStadium(false);
          setFormData({ ...formData, venue: stadium.name });
        }}
      />

      <div className="space-y-2">
        {matches?.map((match) => (
          <div
            key={match.id}
            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="text-sm text-gray-500">
              {format(new Date(match.match_date), "PPP p", { locale: ko })}
            </div>
            <div className="font-medium">
              {match.is_tbd
                ? "상대팀 미정"
                : match.opponent_team?.name || match.opponent_guest_team?.name}
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
        {matches?.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            등록된 경기 일정이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
