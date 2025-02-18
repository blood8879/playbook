"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { searchTeams, createJoinRequest } from "../api";

const POSITIONS = [
  { value: "GK", label: "GK" },
  { value: "DL", label: "DL" },
  { value: "DC", label: "DC" },
  { value: "DR", label: "DR" },
  { value: "DMC", label: "DMC" },
  { value: "ML", label: "ML" },
  { value: "MC", label: "MC" },
  { value: "MR", label: "MR" },
  { value: "AML", label: "AML" },
  { value: "AMC", label: "AMC" },
  { value: "AMR", label: "AMR" },
  { value: "ST", label: "ST" },
];

export function TeamSearch() {
  const { supabase, user } = useSupabase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [preferredNumber, setPreferredNumber] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", searchTerm],
    queryFn: () => searchTeams(supabase, searchTerm),
    enabled: searchTerm.length > 0,
  });

  const joinMutation = useMutation({
    mutationFn: (data: {
      teamId: string;
      userId: string;
      positions: string[];
      number: number;
      message: string;
    }) => createJoinRequest(supabase, data),
    onSuccess: () => {
      toast({
        title: "가입 신청이 완료되었습니다",
        description: "팀 관리자의 승인을 기다려주세요",
      });
      setSelectedTeamId(null);
      setSelectedPositions([]);
      setPreferredNumber("");
      setMessage("");
    },
  });

  const handleJoinRequest = () => {
    if (!selectedTeamId || selectedPositions.length === 0 || !preferredNumber) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    joinMutation.mutate({
      teamId: selectedTeamId,
      userId: user?.id,
      positions: selectedPositions,
      number: parseInt(preferredNumber),
      message,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="팀 이름으로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
          <Card key={team.id}>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setSelectedTeamId(team.id)}
                    className="w-full"
                  >
                    가입 신청
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{team.name} 팀 가입 신청</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        선호 포지션 (복수 선택 가능)
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {POSITIONS.map((position) => (
                          <div
                            key={position.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={position.value}
                              checked={selectedPositions.includes(
                                position.value
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPositions([
                                    ...selectedPositions,
                                    position.value,
                                  ]);
                                } else {
                                  setSelectedPositions(
                                    selectedPositions.filter(
                                      (p) => p !== position.value
                                    )
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={position.value}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {position.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">선호 등번호</label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={preferredNumber}
                        onChange={(e) => setPreferredNumber(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">가입 메시지</label>
                      <textarea
                        className="w-full mt-2 p-2 border rounded-md"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleJoinRequest}
                      disabled={joinMutation.isPending}
                      className="w-full"
                    >
                      {joinMutation.isPending ? "신청 중..." : "신청하기"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
