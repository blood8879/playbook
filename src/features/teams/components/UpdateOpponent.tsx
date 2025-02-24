"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface UpdateOpponentProps {
  matchId: string;
  teamId: string;
}

export function UpdateOpponent({ matchId, teamId }: UpdateOpponentProps) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [opponentType, setOpponentType] = useState<
    "registered" | "guest" | "existing_guest"
  >("registered");
  const [formData, setFormData] = useState({
    opponent_team_id: "",
    opponent_guest_team: {
      name: "",
      description: "",
    },
    existing_guest_team_id: "",
  });

  // 등록된 팀 목록 조회
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

  // 기존 게스트팀 목록 조회
  const { data: guestTeams } = useQuery({
    queryKey: ["guestTeams", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_clubs")
        .select("id, name, description")
        .eq("team_id", teamId);
      if (error) throw error;
      return data;
    },
  });

  // H2H 전적 조회
  const { data: h2hStats } = useQuery({
    queryKey: ["h2hStats", teamId, formData.existing_guest_team_id],
    queryFn: async () => {
      if (!formData.existing_guest_team_id) return null;
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("team_id", teamId)
        .eq("opponent_guest_team_id", formData.existing_guest_team_id);
      if (error) throw error;
      return data.length;
    },
    enabled: !!formData.existing_guest_team_id,
  });

  const updateOpponentMutation = useMutation({
    mutationFn: async () => {
      let opponent_guest_team_id = null;

      if (opponentType === "guest") {
        try {
          const { data: inserted, error: insertErr } = await supabase
            .from("guest_clubs")
            .insert({
              ...formData.opponent_guest_team,
              team_id: teamId,
            })
            .select()
            .single();

          if (!insertErr) {
            opponent_guest_team_id = inserted.id;
            queryClient.invalidateQueries({ queryKey: ["guestTeams", teamId] });
          } else {
            if (insertErr.code === "23505") {
              const { data: existingClub, error: existingError } =
                await supabase
                  .from("guest_clubs")
                  .select("id")
                  .eq("team_id", teamId)
                  .eq("name", formData.opponent_guest_team.name)
                  .single();
              if (!existingError && existingClub) {
                opponent_guest_team_id = existingClub.id;
              } else {
                throw new Error(
                  "게스트 클럽 정보를 확인하는 중 오류가 발생했습니다."
                );
              }
            } else {
              throw new Error("게스트 클럽 등록 중 오류가 발생했습니다.");
            }
          }
        } catch (e: any) {
          throw e;
        }
      } else if (opponentType === "existing_guest") {
        opponent_guest_team_id = formData.existing_guest_team_id;
      }

      const { error } = await supabase
        .from("matches")
        .update({
          opponent_team_id:
            opponentType === "registered" ? formData.opponent_team_id : null,
          opponent_guest_team_id,
          is_tbd: false,
        })
        .eq("id", matchId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["teamMatches"] });
      setOpen(false);
    },
    onSuccess: () => {
      toast({
        title: "상대팀이 업데이트되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "상대팀 업데이트 실패",
        description:
          error.message || "상대팀 정보를 업데이트하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOpponentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">상대팀 업데이트</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>상대팀 업데이트</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup
            value={opponentType}
            onValueChange={(value: "registered" | "guest" | "existing_guest") =>
              setOpponentType(value)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="registered" id="registered" />
              <Label htmlFor="registered">등록된 팀</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="guest" id="guest" />
              <Label htmlFor="guest">새 게스트팀</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing_guest" id="existing_guest" />
              <Label htmlFor="existing_guest">기존 게스트팀</Label>
            </div>
          </RadioGroup>

          {opponentType === "registered" && (
            <div className="space-y-2">
              <Label>상대팀 선택</Label>
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

          {opponentType === "guest" && (
            <div className="space-y-2">
              <Label>새 게스트팀 정보</Label>
              <Input
                placeholder="게스트팀 이름"
                value={formData.opponent_guest_team.name}
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
                placeholder="게스트팀 설명"
                value={formData.opponent_guest_team.description}
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

          {opponentType === "existing_guest" && (
            <div className="space-y-2">
              <Label>기존 게스트팀 선택</Label>
              <Select
                value={formData.existing_guest_team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, existing_guest_team_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="게스트팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {guestTeams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {h2hStats !== null && (
                <p className="text-sm text-gray-500">
                  이 팀과 {h2hStats}번 경기했습니다.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={updateOpponentMutation.isPending}>
              {updateOpponentMutation.isPending ? "업데이트 중..." : "업데이트"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
