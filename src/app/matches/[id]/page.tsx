"use client";

import { useParams } from "next/navigation";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getMatchById } from "@/features/teams/api";
import { MatchDetail } from "@/features/teams/components/MatchDetail";
import { MatchDetailSkeleton } from "@/features/teams/components/MatchDetailSkeleton";

/**
 * @ai_context
 * Match detail page
 */
export default function MatchDetailPage() {
  const params = useParams() as { id: string };
  const { supabase } = useSupabase();

  const {
    data: match,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["matchDetail", params.id],
    queryFn: () => getMatchById(supabase, params.id),
    enabled: !!params.id,
  });

  if (isLoading) {
    return <MatchDetailSkeleton />;
  }

  if (isError) {
    return <div className="text-center py-8">오류가 발생했습니다.</div>;
  }

  if (!match) {
    return (
      <div className="text-center py-8">
        해당 경기를 찾을 수 없습니다.
      </div>
    );
  }

  return <MatchDetail match={match} />;
}