"use client";

import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "@/features/teams/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/components/auth-provider";

export default function InvitesPage() {
  const { user } = useAuth();

  const { data: invites } = useQuery({
    queryKey: ["team-invites"],
    queryFn: teamsApi.getMyInvites,
    enabled: !!user,
  });

  const handleAccept = async (inviteId: string) => {
    try {
      await teamsApi.acceptInvite(inviteId);
    } catch (error) {
      console.error("초대 수락 실패:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">팀 초대 목록</h1>
      <div className="grid gap-4">
        {invites?.map((invite) => (
          <div
            key={invite.id}
            className="p-4 border rounded-lg flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{invite.teams.name}</p>
              <p className="text-sm text-gray-500">
                초대자: {invite.profiles.username}
              </p>
            </div>
            <Button onClick={() => handleAccept(invite.id)}>수락</Button>
          </div>
        ))}
        {invites?.length === 0 && (
          <p className="text-gray-500">받은 초대가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
