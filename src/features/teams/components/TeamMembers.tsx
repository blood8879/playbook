"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getTeamMembers,
  updateTeamMember,
  inviteTeamMember,
  removeTeamMember,
} from "../api";
import { TeamMember, TeamMemberRole } from "../types";
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

interface TeamMembersProps {
  teamId: string;
  isLeader: boolean;
}

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
    mutationFn: (memberId: string) => removeTeamMember(supabase, memberId),
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
      case "leader":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "manager":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) return <div>로딩 중...</div>;

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
                      updateMutation.mutate({
                        memberId: member.id,
                        data: {
                          role:
                            member.role === "manager" ? "member" : "manager",
                        },
                      })
                    }
                  >
                    {member.role === "manager"
                      ? "매니저 권한 해제"
                      : "매니저로 지정"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => removeMutation.mutate(member.id)}
                  >
                    추방하기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
