"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/supabase/client";
import { TeamDetailSkeleton } from "@/features/teams/components/TeamDetailSkeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManagement } from "@/features/teams/components/TeamManagement";
import { TeamSchedule } from "@/features/teams/components/TeamSchedule";
import { TeamStadiums } from "@/features/teams/components/TeamStadiums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Users,
  Shield,
  Plus,
  Trophy,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Team } from "@/features/teams/types/index";
import { TeamMatches } from "@/features/teams/components/TeamMatches";
import { getTeamById as fetchTeamById } from "@/features/teams/api";
import { getAllMatchesForTeam } from "@/features/teams/lib/getAllMatchesForTeam";
import { TeamMatchResults } from "@/features/teams/components/TeamMatchResults";

export default function TeamDetailPage() {
  const params = useParams();
  const { supabase, user } = useSupabase();
  const teamId = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

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
    refetchOnMount: true, // 컴포넌트 마운트 시 항상 데이터 새로고침
    staleTime: 0, // 데이터를 항상 stale로 취급하여 자동 리페치
  });

  const handleCreateMatch = () => {
    router.push(`/matches/new?team=${teamId}`);
  };

  if ((!team && !isTeamLoading) || isTeamError) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              팀을 찾을 수 없습니다
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="mb-4 text-gray-600">
              요청하신 팀이 존재하지 않거나 삭제되었을 수 있습니다.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/teams")}
              className="hover:bg-gray-100 transition-colors"
            >
              팀 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isTeamLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />팀 정보 로딩 중
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8">
      {/* 팀 상세 정보 헤더 */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-blue-800 text-white p-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
              {team?.emblem_url ? (
                <img
                  src={team.emblem_url}
                  alt={`${team.name} 로고`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Shield className="w-12 h-12 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{team?.name}</h1>
              <p className="mt-2 text-white/80">{team?.description}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 좌측: 다가오는 일정 및 팀 정보 */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                다가오는 일정
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <TeamSchedule
                matches={(matches as any) || []}
                isLoading={isMatchesLoading}
                upcoming={true}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-700 to-green-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />팀 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">멤버:</span>
                  <span>{teamMember ? "소속 중" : "미소속"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Trophy className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">경기:</span>
                  <span>{matches?.length || 0}경기</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">생성일:</span>
                  <span>{new Date(team?.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 탭 콘텐츠 */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border-0 shadow-md">
            <CardContent className="p-0">
              <Tabs defaultValue="schedule" className="w-full">
                <div className="border-b">
                  <TabsList className="w-full justify-start rounded-none h-14 bg-white px-4">
                    <TabsTrigger
                      value="schedule"
                      className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md"
                    >
                      일정 관리
                    </TabsTrigger>
                    <TabsTrigger
                      value="members"
                      className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md"
                    >
                      팀원 관리
                    </TabsTrigger>
                    <TabsTrigger
                      value="results"
                      className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md"
                    >
                      경기 결과
                    </TabsTrigger>
                    <TabsTrigger
                      value="stadiums"
                      className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 rounded-md"
                    >
                      경기장 관리
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="schedule" className="p-6 m-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">
                      경기 일정
                    </h2>
                    {canManageMatches && (
                      <Button
                        onClick={handleCreateMatch}
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md transition-all"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        경기 생성
                      </Button>
                    )}
                  </div>
                  <TeamMatches
                    matches={(matches as any) || []}
                    isLoading={isMatchesLoading}
                    teamId={teamId}
                    canManageMatches={canManageMatches}
                  />
                </TabsContent>

                <TabsContent value="members" className="p-6 m-0">
                  <TeamManagement teamId={teamId} isLeader={isLeader} />
                </TabsContent>

                <TabsContent value="results" className="p-6 m-0">
                  <TeamMatchResults teamId={teamId} />
                </TabsContent>

                <TabsContent value="stadiums" className="p-6 m-0">
                  <TeamStadiums teamId={teamId} isLeader={isAdmin} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
