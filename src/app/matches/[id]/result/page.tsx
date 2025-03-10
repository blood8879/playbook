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
import { Loader2, Trophy, ClipboardEdit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const matchId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 경기 정보 조회
  const { data: matchData, isLoading: isMatchLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchById(supabase, matchId),
    enabled: !!matchId,
  });

  // 참석 정보 조회
  const { data: attendanceList, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["attendance", matchId],
    queryFn: () => getMatchAttendanceList(supabase, matchId),
    enabled: !!matchId,
  });

  // 결과 업데이트 뮤테이션
  const { mutate: updateResult, isPending: isUpdating } = useMutation({
    mutationFn: (data: any) => {
      console.log("경기 결과 업데이트 시작");
      console.log("경기 데이터:", matchData);
      console.log("참석자 목록:", attendanceList);

      // 홈팀과 원정팀 ID 설정
      const homeTeamId = matchData?.team_id;
      const awayTeamId = matchData?.opponent_team_id;

      console.log("홈팀 ID:", homeTeamId);
      console.log("원정팀 ID:", awayTeamId);

      return updateMatchResult(supabase, matchId, data, attendanceList, {
        homeTeamId,
        awayTeamId,
      });
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
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

  // 경기 데이터가 없는 경우
  if (!matchData) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5" />
              경기를 찾을 수 없습니다
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="mb-4">요청하신 경기 정보를 찾을 수 없습니다.</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => router.back()}
            >
              이전 페이지로 돌아가기
            </button>
          </CardContent>
        </Card>
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
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-blue-800 text-white">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            경기 결과 업데이트
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <MatchResultForm
            match={matchData}
            attendanceList={attendanceList || []}
            onSubmit={handleSubmit}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["matches"] });
              queryClient.invalidateQueries({ queryKey: ["match", matchId] });
              queryClient.invalidateQueries({
                queryKey: ["attendance", matchId],
              });
            }}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}
