"use client";

import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function TeamManagement({ teamId }: { teamId: string }) {
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamsApi.getTeam(teamId),
  });

  const { data: members } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => teamsApi.getTeamMembers(teamId),
  });

  const handleInvite = async () => {
    try {
      await teamsApi.inviteTeamMember(teamId, inviteEmail);
      setInviteEmail("");
    } catch (error) {
      console.error("초대 실패:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await teamsApi.removeTeamMember(teamId, userId);
    } catch (error) {
      console.error("멤버 제거 실패:", error);
    }
  };

  if (!team || !members) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">팀원 초대</h2>
        <div className="flex gap-4">
          <Input
            type="email"
            placeholder="이메일 주소"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button onClick={handleInvite}>초대하기</Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">팀원 목록</h2>
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{member.profiles.username}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
              {member.role !== "admin" && (
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveMember(member.user_id)}
                >
                  강퇴
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
