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
import { TeamJoinRequestsSkeleton } from "./TeamJoinRequestsSkeleton";
import {
  UserPlus,
  Users,
  Hash,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";

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

/**
 * @ai_context
 * This file manages displaying and handling team join requests.
 */

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

  if (isLoading) return <TeamJoinRequestsSkeleton />;

  return (
    <div className="space-y-6">
      {requests?.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">새로운 가입 신청이 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests?.map((request) => (
            <Card
              key={request.id}
              className="overflow-hidden border-2 hover:shadow-md transition-shadow"
            >
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 border-2 border-gray-200">
                    <AvatarImage src={request.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {request.profiles?.name?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {request.profiles?.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {request.profiles?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        선호 포지션
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {request.preferred_positions.map((pos) => (
                          <span
                            key={pos}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                          >
                            {POSITIONS.find((p) => p.value === pos)?.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Hash className="h-4 w-4 text-blue-500" />
                        선호 등번호
                      </p>
                      <p className="text-sm">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full w-6 h-6">
                          {request.preferred_number}
                        </span>
                      </p>
                    </div>
                  </div>

                  {request.message && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        가입 메시지
                      </p>
                      <p className="text-sm bg-gray-50 p-3 rounded-md border">
                        {request.message}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      승인하기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      className="flex-1 border-2"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">가입 승인</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              이 팀원이 실제로 활동할 포지션과 등번호를 지정해주세요.
              <br />
              (신청자 선호:{" "}
              {requests
                ?.find((r) => r.id === selectedRequestId)
                ?.preferred_positions.join(", ")}
              , 등번호:{" "}
              {
                requests?.find((r) => r.id === selectedRequestId)
                  ?.preferred_number
              }
              )
            </p>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">포지션 지정</label>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => (
                  <div
                    key={pos.value}
                    className={`flex items-center space-x-2 rounded-md border p-2 ${
                      selectedPositions.includes(pos.value)
                        ? "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-200"
                        : ""
                    }`}
                  >
                    <Checkbox
                      id={`pos-${pos.value}`}
                      checked={selectedPositions.includes(pos.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPositions([
                            ...selectedPositions,
                            pos.value,
                          ]);
                        } else {
                          setSelectedPositions(
                            selectedPositions.filter((p) => p !== pos.value)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`pos-${pos.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {pos.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">등번호 지정</label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger className="border-2 focus:ring-blue-500">
                  <SelectValue placeholder="등번호 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableNumbers.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsApproveDialogOpen(false)}
                className="flex-1 border-2"
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmApprove}
                disabled={!selectedNumber || selectedPositions.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              >
                승인 완료
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
