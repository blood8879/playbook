"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import {
  getMatchById,
  getMatchGoals,
  getMatchAssists,
  getMatchMom,
} from "@/features/teams/api";
import { TeamMatch } from "@/features/teams/types/index";
import { toast } from "@/hooks/use-toast";

export function useMatchDetail() {
  const params = useParams();
  const router = useRouter();
  const { supabase, user } = useSupabase();
  const queryClient = useQueryClient();
  const matchId = params.id as string;

  // 매치 정보 조회
  const {
    data: matchData,
    isLoading: isMatchLoading,
    isError: isMatchError,
  } = useQuery<TeamMatch>({
    queryKey: ["match", matchId],
    queryFn: () => getMatchById(supabase, matchId),
    enabled: !!matchId,
  });

  // 골 정보 조회
  const { data: goals } = useQuery({
    queryKey: ["matchGoals", matchId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("match_goals")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("골 정보 조회 중 오류 발생:", error);
          return [];
        }

        // 골 데이터가 있으면 프로필 정보 조회
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((goal) => goal.user_id))];

          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // 골 데이터에 프로필 정보 추가
          return data.map((goal) => {
            const profile = profiles.find((p) => p.id === goal.user_id);
            return {
              ...goal,
              profiles: profile,
            };
          });
        }

        return data || [];
      } catch (error) {
        console.error("골 정보 조회 중 예외 발생:", error);
        return [];
      }
    },
    enabled: !!matchId,
  });

  // 어시스트 정보 조회
  const { data: assists } = useQuery({
    queryKey: ["matchAssists", matchId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("match_assists")
          .select("*")
          .eq("match_id", matchId);

        if (error) {
          console.error("어시스트 정보 조회 중 오류 발생:", error);
          return [];
        }

        // 어시스트 데이터가 있으면 프로필 정보 조회
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((assist) => assist.user_id))];

          const { data: profiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // 어시스트 데이터에 프로필 정보 추가
          return data.map((assist) => {
            const profile = profiles.find((p) => p.id === assist.user_id);
            return {
              ...assist,
              profiles: profile,
            };
          });
        }

        return data || [];
      } catch (error) {
        console.error("어시스트 정보 조회 중 예외 발생:", error);
        return [];
      }
    },
    enabled: !!matchId,
  });

  // MOM 정보 조회
  const { data: mom } = useQuery({
    queryKey: ["matchMom", matchId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("match_mom")
          .select("*")
          .eq("match_id", matchId)
          .maybeSingle();

        if (error) {
          console.error("MOM 정보 조회 중 오류 발생:", error);
          return null;
        }

        // MOM 데이터가 있으면 프로필 정보 조회
        if (data) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .eq("id", data.user_id)
            .single();

          if (profileError) {
            console.error("프로필 정보 조회 오류:", profileError);
            return data;
          }

          // MOM 데이터에 프로필 정보 추가
          return {
            ...data,
            profiles: profile,
          };
        }

        return data;
      } catch (error) {
        console.error("MOM 정보 조회 중 예외 발생:", error);
        return null;
      }
    },
    enabled: !!matchId,
  });

  // 팀 멤버 조회 및 권한 확인
  const { data: teamMembers } = useQuery<any[]>({
    queryKey: ["teamMembers", matchData?.team_id],
    queryFn: async () => {
      if (!matchData?.team_id) return [];

      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          id,
          user_id,
          role,
          profiles:user_id(id, name, email)
        `
        )
        .eq("team_id", matchData.team_id);

      if (error) {
        console.error("팀 멤버 조회 오류:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!matchData?.team_id,
  });

  // 사용자 팀 멤버 권한 확인
  const { data: teamMember } = useQuery({
    queryKey: ["teamMember", matchData?.team_id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select(
          `
          role,
          user_id,
          profiles:user_id(id, name, email)
        `
        )
        .eq("team_id", matchData?.team_id)
        .eq("user_id", user?.id)
        .single();
      return data;
    },
    enabled: !!user && !!matchData?.team_id,
  });

  // 경기 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // 1. 참석 정보 삭제
      const { error: attendanceError } = await supabase
        .from("match_attendance")
        .delete()
        .eq("match_id", matchId);

      if (attendanceError) throw attendanceError;

      // 2. 경기 삭제
      const { error: matchError } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (matchError) throw matchError;
    },
    onSuccess: () => {
      router.push(`/teams/${matchData?.team_id}`);
    },
    onError: (error) => {
      console.error("경기 삭제 중 오류:", error);
      toast({
        title: "경기 삭제 실패",
        description: "경기를 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 상대팀이 미정인지 확인
  const isOpponentTeamUndecided =
    matchData?.is_tbd ||
    (!matchData?.opponent_team_id && !matchData?.opponent_guest_team_id);

  // 관리자 권한 확인
  const isAdmin =
    teamMember?.role === "owner" || teamMember?.role === "manager";

  // 페이지 로드 시 데이터 새로고침
  const refreshMatchData = () => {
    if (matchId) {
      queryClient.invalidateQueries({ queryKey: ["match", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchGoals", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchAssists", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchMom", matchId] });
    }
  };

  return {
    matchId,
    matchData,
    isMatchLoading,
    isMatchError,
    goals,
    assists,
    mom,
    teamMembers,
    teamMember,
    isAdmin,
    isOpponentTeamUndecided,
    deleteMutation,
    refreshMatchData,
    router,
    user,
  };
}
