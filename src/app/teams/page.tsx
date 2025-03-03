"use client";

import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { CreateTeamDialog } from "@/features/teams/components/CreateTeamDialog";
import { searchTeams } from "@/features/teams/api";
import { TeamCardSkeleton } from "@/features/teams/components/TeamCardSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// types.ts의 Team 인터페이스를 사용 (updated_at 포함)
import { Team } from "@/features/teams/types";

export default function TeamsPage() {
  const { supabase, user } = useSupabase();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");

  // 사용자가 가입한 팀 목록 조회
  const {
    data: myTeams,
    isLoading: isMyTeamsLoading,
    refetch: refetchMyTeams,
  } = useQuery({
    queryKey: ["myTeams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 먼저 사용자가 속한 팀 ID 목록 조회
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) {
        console.error("팀 멤버 조회 오류:", memberError);
        return [];
      }

      if (!memberData || memberData.length === 0) {
        return [];
      }

      // 팀 ID 목록 추출
      const teamIds = memberData.map((member) => member.team_id);

      // 팀 정보 조회
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      if (teamsError) {
        console.error("팀 정보 조회 오류:", teamsError);
        return [];
      }

      return teamsData as Team[];
    },
    enabled: !!user?.id,
  });

  // 모든 팀 또는 검색 결과 팀 목록 조회
  const {
    data: allTeams,
    isLoading: isAllTeamsLoading,
    refetch: refetchAllTeams,
  } = useQuery({
    queryKey: ["teams", searchQuery],
    queryFn: async () => {
      // 기존 searchTeams 함수를 직접 호출하는 대신 여기서 처리
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .ilike("name", `%${searchQuery}%`);

      if (error) {
        console.error("팀 검색 오류:", error);
        throw error;
      }

      return data as Team[];
    },
    enabled: activeTab === "all" || searchQuery.length > 0,
  });

  // 현재 탭에 따라 표시할 팀 목록과 로딩 상태 결정
  const teams = activeTab === "my" ? myTeams : allTeams;
  const isLoading = activeTab === "my" ? isMyTeamsLoading : isAllTeamsLoading;

  // 팀 생성 성공 시 두 쿼리 모두 새로고침
  const handleTeamCreated = () => {
    refetchMyTeams();
    refetchAllTeams();
  };

  // CreateTeamDialog에 renderTrigger prop이 없을 수 있으므로 일단 표준 버전 사용
  const renderCreateTeamButton = (openDialog?: () => void) => {
    if (openDialog) {
      return <Button onClick={openDialog}>팀 생성하기</Button>;
    }
    return <CreateTeamDialog onSuccess={handleTeamCreated} />;
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">팀 목록</h1>
          {user && <CreateTeamDialog onSuccess={handleTeamCreated} />}
        </div>

        <Tabs
          defaultValue="my"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "my" | "all")}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="my" className="flex items-center gap-1">
                <Users className="w-4 h-4" />내 팀
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-1">
                <UserPlus className="w-4 h-4" />
                모든 팀
              </TabsTrigger>
            </TabsList>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="팀 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <TabsContent value="my" className="mt-6">
            {isMyTeamsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <TeamCardSkeleton />
                <TeamCardSkeleton />
                <TeamCardSkeleton />
              </div>
            ) : myTeams && myTeams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myTeams.map((team) => (
                  <TeamCard key={team.id} team={team as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  가입된 팀이 없습니다
                </h3>
                <p className="text-gray-500 mb-4">
                  아직 가입한 팀이 없습니다. 새 팀을 생성하거나 기존 팀에
                  가입해보세요.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setActiveTab("all")}>
                    모든 팀 보기
                  </Button>
                  {user && <CreateTeamDialog onSuccess={handleTeamCreated} />}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {isAllTeamsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <TeamCardSkeleton />
                <TeamCardSkeleton />
                <TeamCardSkeleton />
                <TeamCardSkeleton />
                <TeamCardSkeleton />
                <TeamCardSkeleton />
              </div>
            ) : allTeams && allTeams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allTeams.map((team) => (
                  <TeamCard key={team.id} team={team as any} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">
                  {searchQuery
                    ? `"${searchQuery}" 검색 결과가 없습니다`
                    : "등록된 팀이 없습니다"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
