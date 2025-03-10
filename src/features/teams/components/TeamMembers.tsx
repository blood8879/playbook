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
import {
  MoreVertical,
  UserPlus,
  Shield,
  User,
  Pencil,
  UserMinus,
} from "lucide-react";
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
import { Users } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        {isLeader && (
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                <UserPlus className="mr-2 h-4 w-4" />
                팀원 초대
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">
                  팀원 초대
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <Input
                  type="email"
                  placeholder="초대할 사용자의 이메일"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-2 focus-visible:ring-blue-500"
                />
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                >
                  {inviteMutation.isPending ? "초대 중..." : "초대하기"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border">
        {members && members.length > 0 ? (
          <div className="divide-y">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 border-2 border-gray-200">
                    <AvatarImage
                      src={member.profiles?.avatar_url || undefined}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {member.profiles?.name?.[0] ||
                        member.profiles?.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">
                        {member.profiles?.name}
                      </span>
                      <div className="flex items-center">
                        {getRoleIcon(member.role)}
                        <span className="text-xs text-slate-500 ml-1">
                          {member.role === "owner"
                            ? "소유자"
                            : member.role === "manager"
                            ? "매니저"
                            : "일반 멤버"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {member.number && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                          #{member.number}
                        </Badge>
                      )}
                      {member.positions && getPositionBadges(member.positions)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {member.profiles?.email}
                    </span>
                  </div>
                </div>

                {isLeader && member.role !== "leader" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() =>
                          setEditMember({
                            id: member.id,
                            positions: member.positions || [],
                            number: member.number || "",
                          })
                        }
                        className="cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
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
                        className="cursor-pointer"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {member.role === "manager"
                          ? "매니저 권한 해제"
                          : "매니저로 지정"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() =>
                          handleRemoveClick(
                            member.profiles?.id,
                            member.profiles?.name
                          )
                        }
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        추방하기
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">등록된 팀원이 없습니다.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              포지션/등번호 수정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">포지션</label>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => (
                  <div
                    key={pos.value}
                    className={`flex items-center space-x-2 rounded-md border p-2 ${
                      editMember?.positions?.includes(pos.value)
                        ? `bg-gradient-to-r from-${
                            pos.color.split("-")[1]
                          }-100 to-${pos.color.split("-")[1]}-50 border-${
                            pos.color.split("-")[1]
                          }-200`
                        : ""
                    }`}
                  >
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
                      className={`${pos.color}`}
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
                <SelectTrigger className="border-2 focus:ring-blue-500">
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
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
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
        <AlertDlgContent className="border-2 border-red-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl text-red-600">
              팀원 추방
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              정말 {memberToRemove?.name}님을 팀에서 추방하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
            >
              추방하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDlgContent>
      </AlertDialog>
    </div>
  );
}
