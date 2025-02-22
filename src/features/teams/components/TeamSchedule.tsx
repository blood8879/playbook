"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TeamScheduleProps {
  teamId: string;
  upcoming?: boolean;
}

export function TeamSchedule({ teamId, upcoming = false }: TeamScheduleProps) {
  const { supabase } = useSupabase();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["teamMatches", teamId, upcoming],
    queryFn: async () => {
      const query = supabase
        .from("matches")
        .select("*")
        .eq("team_id", teamId)
        .order("match_date", { ascending: true });

      if (upcoming) {
        query.gte("match_date", new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {!upcoming && (
        <div className="flex justify-end">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            경기 일정 등록
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {matches?.map((match) => (
          <div
            key={match.id}
            className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="text-sm text-gray-500">
              {format(new Date(match.match_date), "PPP", { locale: ko })}
            </div>
            <div className="font-medium">{match.opponent_team}</div>
            <div className="text-sm text-gray-500">{match.venue}</div>
          </div>
        ))}
        {matches?.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            {upcoming ? "다가오는 일정이 없습니다" : "등록된 일정이 없습니다"}
          </div>
        )}
      </div>
    </div>
  );
}
