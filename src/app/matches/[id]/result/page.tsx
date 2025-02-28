"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getMatchById,
  getMatchAttendanceList,
  updateMatchResult,
} from "@/features/teams/api";
import { MatchResultForm } from "@/features/teams/components/MatchResultForm";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const matchId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matchData, isLoading: isMatchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchById(supabase, matchId),
  });

  const { data: attendanceList, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["attendance", matchId],
    queryFn: () => getMatchAttendanceList(supabase, matchId),
  });

  const { mutate: updateResult, isPending: isUpdating } = useMutation({
    mutationFn: (data: any) =>
      updateMatchResult(supabase, matchId, data, attendanceList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchGoals", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchAssists", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchMom", matchId] });
      queryClient.invalidateQueries({ queryKey: ["attendance", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });

      toast({
        title: "경기 결과가 저장되었습니다.",
        variant: "default",
      });
      router.push(`/matches/${matchId}`);
    },
    onError: (error) => {
      toast({
        title: "저장 중 오류가 발생했습니다.",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isMatchLoading || isAttendanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // updateResult 함수를 래핑하여 Promise를 반환하는 함수로 만듭니다
  const handleSubmit = (data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      updateResult(data, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">경기 결과 업데이트</h1>
      <MatchResultForm
        match={matchData}
        attendanceList={attendanceList}
        onSubmit={handleSubmit}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["matches"] });
          queryClient.invalidateQueries({ queryKey: ["match", matchId] });
          queryClient.invalidateQueries({ queryKey: ["attendance", matchId] });
        }}
        isUpdating={isUpdating}
      />
    </div>
  );
}
