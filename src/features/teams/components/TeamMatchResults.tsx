"use client";

import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users } from "lucide-react";
import { MatchTimeline } from "./MatchTimeline";
import { TeamMatch } from "../types";

interface TeamMatchResultsProps {
  teamId: string;
}

export function TeamMatchResults({ teamId }: TeamMatchResultsProps) {
  const { supabase } = useSupabase();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // 완료된 경기 목록 조회
  const { data: completedMatches, isLoading } = useQuery({
    queryKey: ["completedMatches", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          opponent_team:opponent_team_id(*),
          opponent_guest_team:opponent_guest_team_id(*)
        `
        )
        .eq("team_id", teamId)
        .eq("is_finished", true)
        .order("match_date", { ascending: false });

      if (error) throw error;
      return data as TeamMatch[];
    },
    enabled: !!teamId,
  });

  // 선택된 경기 정보 조회
  const { data: selectedMatch } = useQuery({
    queryKey: ["selectedMatch", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          opponent_team:opponent_team_id(*),
          opponent_guest_team:opponent_guest_team_id(*)
        `
        )
        .eq("id", selectedMatchId)
        .single();

      if (error) throw error;
      return data as TeamMatch;
    },
    enabled: !!selectedMatchId,
  });

  // 골 정보 조회
  const { data: goals = [] } = useQuery({
    queryKey: ["matchGoals", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_goals")
        .select(
          `
          *,
          profiles:user_id(id, name, email)
        `
        )
        .eq("match_id", selectedMatchId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMatchId,
  });

  // 어시스트 정보 조회
  const { data: assists = [] } = useQuery({
    queryKey: ["matchAssists", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_assists")
        .select(
          `
          *,
          profiles:user_id(id, name, email)
        `
        )
        .eq("match_id", selectedMatchId);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedMatchId,
  });

  // MOM 정보 조회
  const { data: mom } = useQuery({
    queryKey: ["matchMom", selectedMatchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_mom")
        .select(
          `
          *,
          profiles:user_id(id, name, email)
        `
        )
        .eq("match_id", selectedMatchId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!selectedMatchId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 animate-pulse rounded-lg"></div>
        <div className="h-24 bg-gray-100 animate-pulse rounded-lg"></div>
        <div className="h-24 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!completedMatches || completedMatches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">완료된 경기가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {completedMatches.map((match) => (
          <Card
            key={match.id}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              selectedMatchId === match.id ? "border-primary" : ""
            }`}
            onClick={() => setSelectedMatchId(match.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                <span>
                  vs{" "}
                  {match.is_tbd
                    ? "상대팀 미정"
                    : match.opponent_team?.name ||
                      match.opponent_guest_team?.name}
                </span>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  경기 종료
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500 mb-2">
                <CalendarDays className="w-4 h-4 inline-block mr-1" />
                {format(new Date(match.match_date), "PPP p", {
                  locale: ko,
                })}
              </div>
              <div className="text-sm text-gray-500 mb-2">
                <Users className="w-4 h-4 inline-block mr-1" />
                {match.participants_count || 0}명 참가
              </div>
              <div className="font-bold text-lg mt-2">
                {match.home_score} : {match.away_score}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedMatch && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">경기 타임라인</h3>
          <MatchTimeline
            match={selectedMatch}
            goals={goals}
            assists={assists}
            mom={mom}
          />
        </div>
      )}
    </div>
  );
}
