"use client";

import { Team } from "../types";
import { useSupabase } from "@/lib/supabase/client";
import { TeamMembers } from "./TeamMembers";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createJoinRequest, getTeamMembers } from "../api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionSelector } from "./PositionSelector";
import { NumberSelector } from "./NumberSelector";
import { POSITIONS } from "../constants/positions";

interface TeamDetailProps {
  team: Team;
}

export function TeamDetail({ team }: TeamDetailProps) {
  const { supabase, user } = useSupabase();
  const { toast } = useToast();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [preferredNumber, setPreferredNumber] = useState("");
  const [message, setMessage] = useState("");

  // 팀 멤버 목록 조회
  const { data: members } = useQuery({
    queryKey: ["teamMembers", team.id],
    queryFn: () => getTeamMembers(supabase, team.id),
  });

  // 현재 사용자가 팀원인지 확인
  const isMember = members?.some((member) => member.profiles?.id === user?.id);
  const isLeader = team.leader_id === user?.id;

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
      setIsJoinDialogOpen(false);
      setSelectedPositions([]);
      setPreferredNumber("");
      setMessage("");
    },
  });

  const handleJoinRequest = () => {
    if (!team.id || selectedPositions.length === 0 || !preferredNumber) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    joinMutation.mutate({
      teamId: team.id,
      userId: user?.id,
      positions: selectedPositions,
      number: parseInt(preferredNumber),
      message,
    });
  };

  // 1-99까지의 숫자 배열 생성
  const availableNumbers = Array.from({ length: 99 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground mt-2">{team.description}</p>
        </div>
        {!isMember && !isLeader && (
          <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button>가입 신청</Button>
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
                  <PositionSelector
                    selectedPositions={selectedPositions}
                    onPositionsChange={setSelectedPositions}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">선호 등번호</label>
                  <NumberSelector
                    value={preferredNumber}
                    onChange={setPreferredNumber}
                    availableNumbers={availableNumbers}
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
        )}
      </div>

      <TeamMembers teamId={team.id} isLeader={isLeader} />
    </div>
  );
}
