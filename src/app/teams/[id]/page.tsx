"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getTeamById, getMatchById } from "@/features/teams/api";
import { useSupabase } from "@/lib/supabase/client";
import { TeamDetail } from "@/features/teams/components/TeamDetail";
import { TeamDetailSkeleton } from "@/features/teams/components/TeamDetailSkeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManagement } from "@/features/teams/components/TeamManagement";
import { TeamSchedule } from "@/features/teams/components/TeamSchedule";
import { TeamStadiums } from "@/features/teams/components/TeamStadiums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Team } from "@/features/teams/types";
import { TeamMatches } from "@/features/teams/components/TeamMatches";
import {
  getTeamMembers,
  getTeamById as fetchTeamById,
  searchTeams,
} from "@/features/teams/api";
import { getAllMatchesForTeam } from "@/features/teams/lib/getAllMatchesForTeam"; /* We'll create this helper (see below) */
import { TeamMatchResults } from "@/features/teams/components/TeamMatchResults";

export default function TeamDetailPage() {
  const params = useParams();
  const { supabase, user } = useSupabase();
  const teamId = params.id as string;
  const router = useRouter();

  // 팀 정보 조회
  const {
    data: team,
    isLoading: isTeamLoading,
    isError: isTeamError,
  } = useQuery<Team>({
    queryKey: ["team", teamId],
    queryFn: () => fetchTeamById(supabase, teamId),
  });

  // 팀 멤버권한 확인
  const { data: teamMember } = useQuery({
    queryKey: ["teamMember", teamId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user?.id)
        .single();
      return data;
    },
    enabled: !!user && !!teamId,
  });
  const isAdmin = teamMember?.role === "owner" || teamMember?.role === "admin";
  const isLeader = team?.leader_id === user?.id;
  const canManageMatches = isLeader || isAdmin;

  // 모든 경기 일정 한 번에 조회
  const {
    data: matches,
    isLoading: isMatchesLoading,
    isError: isMatchesError,
  } = useQuery({
    queryKey: ["teamMatches", teamId],
    queryFn: () => getAllMatchesForTeam(supabase, teamId),
    enabled: !!teamId,
  });

  if ((!team && !isTeamLoading) || isTeamError) {
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

  if (isTeamLoading) {
    return <TeamDetailSkeleton />;
  }

  return (
    <div className="container py-8">
      {/* 팀 상세 정보 헤더 */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
          {team?.emblem_url ? (
            <img
              src={team.emblem_url}
              alt={`${team.name} 로고`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Shield className="w-12 h-12 text-slate-400" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{team?.name}</h1>
          <p className="mt-2 text-gray-600">{team?.description}</p>
        </div>
      </div>

      <Separator className="my-6" />

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 좌측: 다가오는 일정 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              다가오는 일정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeamSchedule
              matches={matches || []}
              isLoading={isMatchesLoading}
              upcoming={true}
            />
          </CardContent>
        </Card>

        {/* 우측: 탭 콘텐츠 */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList>
              <TabsTrigger value="schedule">일정 관리</TabsTrigger>
              <TabsTrigger value="members">팀원 관리</TabsTrigger>
              <TabsTrigger value="results">경기 결과</TabsTrigger>
              <TabsTrigger value="stadiums">경기장 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <TeamMatches
                matches={matches || []}
                isLoading={isMatchesLoading}
                teamId={teamId}
                canManageMatches={canManageMatches}
              />
            </TabsContent>

            <TabsContent value="members">
              <TeamManagement teamId={teamId} isLeader={isLeader} />
            </TabsContent>

            <TabsContent value="results">
              <TeamMatchResults teamId={teamId} />
            </TabsContent>

            <TabsContent value="stadiums">
              <TeamStadiums teamId={teamId} isLeader={isAdmin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
