"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getTeamById } from "@/features/teams/api";
import { useSupabase } from "@/lib/supabase/client";
import { TeamDetail } from "@/features/teams/components/TeamDetail";
import { TeamDetailSkeleton } from "@/features/teams/components/TeamDetailSkeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { TeamJoinRequests } from "@/features/teams/components/TeamJoinRequests";

export default function TeamDetailPage() {
  const params = useParams();
  const { supabase, user } = useSupabase();
  const teamId = params.id as string;
  const router = useRouter();

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => getTeamById(supabase, teamId),
  });

  if (!team && !isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            팀을 찾을 수 없습니다
          </h1>
          <p className="mt-2 text-gray-600">
            요청하신 팀이 존재하지 않거나 삭제되었을 수 있습니다.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/teams")}
          >
            팀 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {isLoading ? <TeamDetailSkeleton /> : <TeamDetail team={team!} />}
      {team?.leader_id === user?.id && (
        <div className="mt-8">
          <TeamJoinRequests teamId={teamId} />
        </div>
      )}
    </div>
  );
}
