"use client";

import { useState, useMemo } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getTeamJoinRequests,
  respondToJoinRequest,
  getTeamNumbers,
} from "../api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface TeamJoinRequestsProps {
  teamId: string;
}

export function TeamJoinRequests({ teamId }: TeamJoinRequestsProps) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

  const { data: requests, isLoading } = useQuery({
    queryKey: ["teamJoinRequests", teamId],
    queryFn: () => getTeamJoinRequests(supabase, teamId),
  });

  const { data: usedNumbers } = useQuery({
    queryKey: ["teamNumbers", teamId],
    queryFn: () => getTeamNumbers(supabase, teamId),
  });

  const availableNumbers = useMemo(() => {
    const numbers = Array.from({ length: 99 }, (_, i) => i + 1);
    return numbers.filter((num) => !usedNumbers?.includes(num));
  }, [usedNumbers]);

  const respondMutation = useMutation({
    mutationFn: ({
      requestId,
      accepted,
      positions,
      number,
    }: {
      requestId: string;
      accepted: boolean;
      positions?: string[];
      number?: number;
    }) =>
      respondToJoinRequest(supabase, requestId, {
        accepted,
        positions,
        number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamJoinRequests", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
      setIsApproveDialogOpen(false);
      setSelectedPositions([]);
      setSelectedNumber("");
      setSelectedRequestId(null);
    },
  });

  const handleApprove = (requestId: string) => {
    setSelectedRequestId(requestId);
    setSelectedPositions([]);
    setSelectedNumber("");
    setIsApproveDialogOpen(true);
  };

  const handleReject = (requestId: string) => {
    respondMutation.mutate({
      requestId,
      accepted: false,
    });
  };

  const handleConfirmApprove = () => {
    if (
      !selectedRequestId ||
      !selectedNumber ||
      selectedPositions.length === 0
    ) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    respondMutation.mutate({
      requestId: selectedRequestId,
      accepted: true,
      positions: selectedPositions,
      number: parseInt(selectedNumber),
    });

    toast({
      title: "가입 승인 처리 완료",
      description: "가입 신청이 승인되었습니다",
    });

    setIsApproveDialogOpen(false);
    setSelectedPositions([]);
    setSelectedNumber("");
    setSelectedRequestId(null);
  };

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">가입 신청 목록</h2>
      {requests?.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          새로운 가입 신청이 없습니다
        </p>
      ) : (
        <div className="grid gap-4">
          {requests?.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={request.profiles?.avatar_url} />
                    <AvatarFallback>
                      {request.profiles?.name?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{request.profiles?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {request.profiles?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">선호 포지션:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.preferred_positions.map((pos) => (
                        <span
                          key={pos}
                          className="text-xs bg-muted px-2 py-1 rounded"
                        >
                          {POSITIONS.find((p) => p.value === pos)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">선호 등번호:</p>
                    <p className="text-sm text-muted-foreground">
                      {request.preferred_number}
                    </p>
                  </div>
                  {request.message && (
                    <div>
                      <p className="text-sm font-medium">가입 메시지:</p>
                      <p className="text-sm text-muted-foreground">
                        {request.message}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      className="flex-1"
                    >
                      승인하기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      className="flex-1"
                    >
                      거절하기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가입 승인</DialogTitle>
            <p className="text-sm text-muted-foreground">
              이 팀원이 실제로 활동할 포지션과 등번호를 지정해주세요.
              <br />
              (신청자 선호:{" "}
              {requests
                ?.find((r) => r.id === selectedRequestId)
                ?.preferred_positions.map(
                  (pos) => POSITIONS.find((p) => p.value === pos)?.label
                )
                .join(", ")}{" "}
              /{" "}
              {
                requests?.find((r) => r.id === selectedRequestId)
                  ?.preferred_number
              }
              번)
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">포지션 지정</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {POSITIONS.map((position) => (
                  <div
                    key={position.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={position.value}
                      checked={selectedPositions.includes(position.value)}
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
                      className="text-sm leading-none"
                    >
                      {position.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">등번호 지정</label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="등번호 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableNumbers.map((number) => (
                    <SelectItem key={number} value={number.toString()}>
                      {number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                현재 사용 가능한 등번호 중에서 선택해주세요
              </p>
            </div>

            <Button
              onClick={handleConfirmApprove}
              disabled={respondMutation.isPending}
              className="w-full"
            >
              {respondMutation.isPending ? "처리 중..." : "가입 승인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
