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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  ChevronRight,
  Share2,
  CalendarDays,
  Info,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Team } from "@/features/teams/types/index";
import { TeamMatches } from "@/features/teams/components/TeamMatches";
import { getTeamById as fetchTeamById } from "@/features/teams/api";
import { getAllMatchesForTeam } from "@/features/teams/lib/getAllMatchesForTeam";
import { TeamMatchResults } from "@/features/teams/components/TeamMatchResults";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const isAdmin =
    teamMember?.role === "owner" || teamMember?.role === "manager";
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
    router.push(`/teams/${teamId}/matches/new`);
  };

  // 팀이 없거나 에러가 발생한 경우
  if ((!team && !isTeamLoading) || isTeamError) {
    return (
      <div className="container max-w-5xl mx-auto py-10">
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-rose-700 to-rose-500 text-white p-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-white/90" />
              <CardTitle className="text-2xl font-bold">
                팀을 찾을 수 없습니다
              </CardTitle>
            </div>
            <CardDescription className="text-white/80 mt-2 text-base">
              요청하신 팀이 존재하지 않거나 삭제되었을 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <p className="mb-6 text-gray-600 leading-relaxed">
              다음과 같은 이유로 팀을 찾을 수 없을 수 있습니다:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-600">
              <li>존재하지 않는 팀 ID</li>
              <li>삭제된 팀</li>
              <li>접근 권한이 없는 팀</li>
            </ul>
            <Button
              variant="outline"
              onClick={() => router.push("/teams")}
              className="border-2 hover:bg-gray-50 transition-all"
            >
              <ChevronRight className="h-4 w-4 mr-2" />팀 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 중인 경우
  if (isTeamLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-10">
        <Card className="overflow-hidden border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-white/90" />
              <CardTitle className="text-2xl font-bold">
                팀 정보 로딩 중
              </CardTitle>
            </div>
            <CardDescription className="text-white/80 mt-2 text-base">
              잠시만 기다려주세요. 팀 정보를 불러오고 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex items-center justify-center h-60">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-sm text-gray-500">데이터를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 팀 목록에서 사용할 임시 데이터 계산
  const upcomingMatches =
    (matches as any)?.filter(
      (match: any) =>
        !match.is_finished && new Date(match.match_date) > new Date()
    ) || [];

  const totalMatches = (matches as any)?.length || 0;
  const finishedMatches =
    (matches as any)?.filter((match: any) => match.is_finished)?.length || 0;

  return (
    <div className="container max-w-6xl mx-auto py-10">
      {/* 팀 상세 정보 헤더 */}
      <Card className="overflow-hidden border-0 shadow-lg mb-10">
        <CardHeader className="bg-gradient-to-r from-purple-800 via-indigo-700 to-blue-700 text-white p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-24 h-24 bg-white/15 backdrop-blur-md rounded-xl overflow-hidden flex items-center justify-center shadow-lg ring-4 ring-white/20">
              {team?.emblem_url ? (
                <img
                  src={team.emblem_url}
                  alt={`${team.name} 로고`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Shield className="w-14 h-14 text-white/90" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h1 className="text-3xl md:text-4xl font-bold">{team?.name}</h1>
                <Badge className="bg-white/20 hover:bg-white/30 text-white w-fit">
                  {teamMember?.role === "owner"
                    ? "소유자"
                    : teamMember?.role === "admin"
                    ? "관리자"
                    : teamMember?.role === "manager"
                    ? "매니저"
                    : "멤버"}
                </Badge>
              </div>
              <p className="mt-3 text-white/80 max-w-3xl">
                {team?.description || "팀 소개가 없습니다."}
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                  <Calendar className="w-4 h-4 text-white/70" />
                  <span>
                    생성일: {new Date(team?.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                  <Trophy className="w-4 h-4 text-white/70" />
                  <span>총 {totalMatches}경기</span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                  <Users className="w-4 h-4 text-white/70" />
                  <span>{teamMember ? "소속중" : "미소속"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 메인 콘텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 좌측: 다가오는 일정 및 팀 정보 */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="w-5 h-5" />
                다가오는 일정
              </CardTitle>
              <CardDescription className="text-white/80">
                {upcomingMatches.length > 0
                  ? `${upcomingMatches.length}개의 예정된 경기`
                  : "예정된 경기가 없습니다"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              <TeamSchedule
                matches={(matches as any) || []}
                isLoading={isMatchesLoading}
                upcoming={true}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-5">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5" />팀 정보
              </CardTitle>
              <CardDescription className="text-white/80">
                {team?.name}의 요약 정보
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">멤버 상태</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium rounded-full px-2.5 py-1",
                      teamMember
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {teamMember ? "소속 중" : "미소속"}
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">총 경기</span>
                  </div>
                  <span className="font-medium">{totalMatches}경기</span>
                </div>

                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">생성일</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(team?.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="font-medium">경기장</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    등록 가능
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 탭 콘텐츠 */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardContent className="p-0">
              <Tabs defaultValue="schedule" className="w-full">
                <div className="border-b">
                  <TabsList className="w-full justify-start rounded-none h-16 bg-white px-4">
                    <TabsTrigger
                      value="schedule"
                      className="rounded-md  data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 transition-all"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      일정 관리
                    </TabsTrigger>
                    <TabsTrigger
                      value="members"
                      className="rounded-md  data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 transition-all"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      팀원 관리
                    </TabsTrigger>
                    <TabsTrigger
                      value="results"
                      className="rounded-md  data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 transition-all"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      경기 결과
                    </TabsTrigger>
                    <TabsTrigger
                      value="stadiums"
                      className="rounded-md  data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 transition-all"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      경기장 관리
                    </TabsTrigger>
                    <TabsTrigger
                      value="dashboard"
                      className="rounded-md data-[state=active]:to-indigo-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 transition-all"
                      onClick={() => router.push(`/teams/${teamId}/dashboard`)}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      대시보드
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="schedule" className="p-6 m-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        경기 일정
                      </h2>
                      <p className="text-gray-500 mt-1">
                        전체 {totalMatches}경기 중 {finishedMatches}경기 완료
                      </p>
                    </div>
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
