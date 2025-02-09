"use client";

import { useQuery } from "@tanstack/react-query";
import { teamsApi } from "@/features/teams/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/features/auth/components/auth-provider";

export default function TeamsPage() {
  const { user, loading } = useAuth();
  console.log("user", user);

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: teamsApi.getTeams,
    enabled: !!user, // 로그인된 상태에서만 쿼리 실행
  });

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (!user) {
    return null; // AuthProvider가 로그인 페이지로 리다이렉트 처리
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">내 팀 목록</h1>
        <Link href="/teams/create">
          <Button>새 팀 만들기</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => (
          <div
            key={team.id}
            className="p-4 border rounded-lg hover:border-primary transition-colors"
          >
            <Link href={`/teams/${team.id}`}>
              <div className="space-y-2">
                {team.logo_url && (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-full h-40 object-cover rounded-md"
                  />
                )}
                <h2 className="text-xl font-semibold">{team.name}</h2>
                {team.description && (
                  <p className="text-gray-600">{team.description}</p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
