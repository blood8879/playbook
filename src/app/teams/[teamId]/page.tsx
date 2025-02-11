"use client";

import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "@/features/teams/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/features/auth/components/auth-provider";
import { use } from "react";

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const { user } = useAuth();

  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamsApi.getTeam(teamId),
    enabled: !!user,
  });

  const { data: members } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => teamsApi.getTeamMembers(teamId),
    enabled: !!user,
  });

  if (!team) return <div>로딩 중...</div>;

  // 현재 사용자가 members 목록에 포함되어 있고 역할이 admin인지 확인합니다.
  const isAdmin = members?.some(
    (member) => member.user_id === user?.id && member.role === "admin"
  );

  console.log("user", user);
  console.log("members", members);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        {isAdmin && (
          <Link href={`/teams/${teamId}/manage`}>
            <Button variant="outline">팀 관리</Button>
          </Link>
        )}
      </div>

      {team.description && (
        <p className="text-gray-600 mb-8">{team.description}</p>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">팀원 목록</h2>
        <div className="grid gap-4">
          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <p className="font-medium">{member.profiles.username}</p>
                <p className="text-sm text-gray-500">
                  {member.role} • {member.status}
                </p>
              </div>
              {member.joined_at && (
                <p className="text-sm text-gray-500">
                  가입일: {new Date(member.joined_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
