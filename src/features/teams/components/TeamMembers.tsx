"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getTeamMembers,
  updateTeamMember,
  inviteTeamMember,
  removeTeamMember,
  swapTeamNumbers,
} from "../api";
import { TeamMember, TeamMemberRole } from "../types/index";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical, UserPlus, Shield, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertDlgContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TeamMembersSkeleton } from "./TeamMembersSkeleton";

interface TeamMembersProps {
  teamId: string;
  isLeader: boolean;
}

/**
 * @ai_context
 * This file is used to display and manage team members.
 */

const POSITIONS = [
  { value: "GK", label: "GK", color: "bg-yellow-500" },
  { value: "DL", label: "DL", color: "bg-blue-500" },
  { value: "DC", label: "DC", color: "bg-green-500" },
  { value: "DR", label: "DR", color: "bg-red-500" },
  { value: "DMC", label: "DMC", color: "bg-yellow-500" },
  { value: "ML", label: "ML", color: "bg-yellow-500" },
  { value: "MC", label: "MC", color: "bg-blue-500" },
  { value: "MR", label: "MR", color: "bg-green-500" },
  { value: "AML", label: "AML", color: "bg-red-500" },
  { value: "AMC", label: "AMC", color: "bg-yellow-500" },
  { value: "AMR", label: "AMR", color: "bg-blue-500" },
  { value: "ST", label: "ST", color: "bg-green-500" },
] as const;

export function TeamMembers({ teamId, isLeader }: TeamMembersProps) {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { user } = useSupabase();
  const { data: members, isLoading } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => getTeamMembers(supabase, teamId),
  });
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editMember, setEditMember] = useState<{
    id: string;
    positions: string[];
    number: string;
  } | null>(null);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: any }) =>
      updateTeamMember(supabase, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      inviteTeamMember(supabase, teamId, email, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId, teamId }: { userId: string; teamId: string }) =>
      removeTeamMember(supabase, userId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    },
  });

  const updateMemberDetailsMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: any }) =>
      updateTeamMember(supabase, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
      setEditMember(null);
    },
  });

  const updatePositionsMutation = useMutation({
    mutationFn: ({
      memberId,
      positions,
    }: {
      memberId: string;
      positions: string[];
    }) => updateTeamMember(supabase, memberId, { positions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate(inviteEmail);
  };

  const getRoleIcon = (role: TeamMemberRole) => {
    switch (role) {
      case "owner":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "manager":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRemoveClick = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      removeMutation.mutate({
        userId: memberToRemove.id,
        teamId,
      });
      setMemberToRemove(null);
    }
  };

  const getPositionBadges = (positions: string[]) => {
    if (!positions || positions.length === 0) return null;
    return (
      <div className="flex gap-1">
        {positions.map((position) => {
          const pos = POSITIONS.find((p) => p.value === position);
          if (!pos) return null;
          return (
            <Badge
              key={position}
              variant="secondary"
              className={`${pos.color} text-white`}
            >
              {pos.label}
            </Badge>
          );
        })}
      </div>
    );
  };

  const usedNumbers = members?.reduce((acc, member) => {
    if (member.number) {
      acc[member.number] = member.profiles?.name || "";
    }
    return acc;
  }, {} as Record<string, string>);

  const handleNumberChange = async (
    memberId: string,
    newNumber: string,
    oldNumber: string | undefined
  ) => {
    const memberWithNewNumber = members?.find(
      (m) => m.number === parseInt(newNumber)
    );

    const updates = [{ memberId, number: parseInt(newNumber) }];

    if (memberWithNewNumber) {
      updates.push({
        memberId: memberWithNewNumber.id,
        number: oldNumber ? parseInt(oldNumber) : null,
      });
    }

    try {
      await swapTeamNumbers(supabase, teamId, updates);
      queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    } catch (error) {
      console.error("Failed to swap numbers:", error);
    }
  };

  if (isLoading) {
    return <TeamMembersSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">팀원 목록</h2>
        {isLeader && (
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                팀원 초대
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>팀원 초대</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <Input
                  type="email"
                  placeholder="초대할 사용자의 이메일"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "초대 중..." : "초대하기"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="divide-y">
        {members?.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between py-3"
          >
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {member.profiles?.name?.[0] ||
                    member.profiles?.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{member.profiles?.name}</span>
                  {getRoleIcon(member.role)}
                  {member.positions && getPositionBadges(member.positions)}
                  {member.number && (
                    <span className="text-sm text-muted-foreground">
                      #{member.number}
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {member.profiles?.email}
                </span>
              </div>
            </div>

            {isLeader && member.role !== "leader" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setEditMember({
                        id: member.id,
                        positions: member.positions || [],
                        number: member.number || "",
                      })
                    }
                  >
                    포지션/등번호 수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateTeamMember(supabase, member.id, {
                          role:
                            member.role === "manager"
                              ? "member"
                              : ("manager" as TeamMemberRole),
                        });

                        queryClient.invalidateQueries({
                          queryKey: ["teamMembers", teamId],
                        });

                        toast({
                          title:
                            member.role === "manager"
                              ? "매니저 권한이 해제되었습니다"
                              : "매니저로 지정되었습니다",
                          description: `${member.profiles?.name}님의 권한이 변경되었습니다.`,
                          variant: "default",
                        });
                      } catch (error) {
                        toast({
                          title: "권한 변경 실패",
                          description:
                            "권한을 변경하는 중 오류가 발생했습니다.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {member.role === "manager"
                      ? "매니저 권한 해제"
                      : "매니저로 지정"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() =>
                      handleRemoveClick(
                        member.profiles?.id,
                        member.profiles?.name
                      )
                    }
                  >
                    추방하기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>포지션/등번호 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">포지션</label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => (
                  <div key={pos.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={pos.value}
                      checked={editMember?.positions?.includes(pos.value)}
                      onCheckedChange={(checked) => {
                        setEditMember((prev) => {
                          if (!prev) return null;
                          const newPositions = checked
                            ? [...prev.positions, pos.value]
                            : prev.positions.filter((p) => p !== pos.value);

                          updatePositionsMutation.mutate({
                            memberId: prev.id,
                            positions: newPositions,
                          });

                          return {
                            ...prev,
                            positions: newPositions,
                          };
                        });
                      }}
                    />
                    <label
                      htmlFor={pos.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {pos.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">등번호</label>
              <Select
                value={editMember?.number || ""}
                onValueChange={(value) => {
                  if (editMember) {
                    handleNumberChange(editMember.id, value, editMember.number);
                    setEditMember((prev) =>
                      prev ? { ...prev, number: value } : null
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="등번호 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => {
                    const numStr = String(num);
                    const currentUser = usedNumbers?.[numStr];
                    return (
                      <SelectItem
                        key={num}
                        value={numStr}
                        className={currentUser ? "text-muted-foreground" : ""}
                      >
                        {num}
                        {currentUser && ` - ${currentUser}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditMember(null)}>
                취소
              </Button>
              <Button
                onClick={() => {
                  if (editMember) {
                    if (editMember.number) {
                      updateMemberDetailsMutation.mutate({
                        memberId: editMember.id,
                        data: {
                          number: editMember.number,
                        },
                      });
                    }
                    setEditMember(null);
                  }
                }}
              >
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDlgContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀원 추방</AlertDialogTitle>
            <AlertDialogDescription>
              정말 {memberToRemove?.name}님을 팀에서 추방하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              추방하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDlgContent>
      </AlertDialog>
    </div>
  );
}
