"use client";

import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { TeamCard } from "@/features/teams/components/TeamCard";
import { CreateTeamDialog } from "@/features/teams/components/CreateTeamDialog";
import { searchTeams } from "@/features/teams/api";
import { TeamCardSkeleton } from "@/features/teams/components/TeamCardSkeleton";

export default function TeamsPage() {
  const { supabase, user } = useSupabase();
  const [searchQuery, setSearchQuery] = useState("");

  // [OLD: v4 방식 - 사용 불가]
  // const { data: teams, isLoading, refetch } = useQuery(["teams", searchQuery], () => searchTeams(supabase, searchQuery))

  // [NEW: v5 방식 - 오브젝트 한 개로 전달]
  const {
    data: teams,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["teams", searchQuery],
    queryFn: () => searchTeams(supabase, searchQuery),
  });

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="팀 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {user && <CreateTeamDialog onSuccess={refetch} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <TeamCardSkeleton />
            <TeamCardSkeleton />
            <TeamCardSkeleton />
            <TeamCardSkeleton />
            <TeamCardSkeleton />
            <TeamCardSkeleton />
          </>
        ) : (
          teams?.map((team) => <TeamCard key={team.id} team={team} />)
        )}
      </div>
    </div>
  );
}