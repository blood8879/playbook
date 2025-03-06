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

  // 완료된 경기 목록 조회 (홈과 원정 경기 모두 포함)
  const { data: completedMatches, isLoading } = useQuery({
    queryKey: ["completedMatches", teamId],
    queryFn: async () => {
      // 우리가 홈팀인 경기 (team_id가 우리 팀인 경우)
      const { data: homeMatches, error: homeError } = await supabase
        .from("matches")
        .select(
          `
          *,
          opponent_team:teams!matches_opponent_team_id_fkey(*),
          opponent_guest_team:opponent_guest_team_id(*),
          stadium:stadiums(*)
        `
        )
        .eq("team_id", teamId)
        .eq("is_finished", true)
        .order("match_date", { ascending: false });

      if (homeError) throw homeError;

      // 우리가 원정팀인 경기 (opponent_team_id가 우리 팀인 경우)
      const { data: awayMatches, error: awayError } = await supabase
        .from("matches")
        .select(
          `
          *,
          team:teams!matches_team_id_fkey(*),
          opponent_guest_team:opponent_guest_team_id(*),
          stadium:stadiums(*)
        `
        )
        .eq("opponent_team_id", teamId)
        .eq("is_finished", true)
        .order("match_date", { ascending: false });

      if (awayError) throw awayError;

      // 홈 경기에는 is_home = true 추가
      const homeMatchesWithFlag = homeMatches.map((match) => ({
        ...match,
        is_home: true,
      }));

      // 원정 경기에는 is_home = false 추가하고 필요한 필드 조정
      const awayMatchesWithFlag = awayMatches.map((match) => ({
        ...match,
        is_home: false,
        opponent_team: match.team, // opponent_team 필드를 기존 team 값으로 설정
      }));

      // 모든 경기 결합 및 날짜순 정렬
      const allMatches = [...homeMatchesWithFlag, ...awayMatchesWithFlag].sort(
        (a, b) =>
          new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      );

      return allMatches as TeamMatch[];
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
          team:team_id(*),
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
      if (!selectedMatchId) return [];

      try {
        // First fetch just the goals without the join
        const { data, error } = await supabase
          .from("match_goals")
          .select("*")
          .eq("match_id", selectedMatchId);

        if (error) {
          console.error("Error fetching match goals:", error);
          return [];
        }

        if (data.length === 0) return [];

        // Then separately fetch profiles for the user_ids
        const userIds = [...new Set(data.map((goal) => goal.user_id))];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles for goals:", profilesError);
          return data; // Return goals without profiles
        }

        // Combine the data
        return data.map((goal) => ({
          ...goal,
          profiles: profiles.find((profile) => profile.id === goal.user_id),
        }));
      } catch (error) {
        console.error("Exception fetching match goals:", error);
        return [];
      }
    },
    enabled: !!selectedMatchId,
  });

  // 어시스트 정보 조회
  const { data: assists = [] } = useQuery({
    queryKey: ["matchAssists", selectedMatchId],
    queryFn: async () => {
      if (!selectedMatchId) return [];

      try {
        // First fetch just the assists without the join
        const { data, error } = await supabase
          .from("match_assists")
          .select("*")
          .eq("match_id", selectedMatchId);

        if (error) {
          console.error("Error fetching match assists:", error);
          return [];
        }

        if (data.length === 0) return [];

        // Then separately fetch profiles
        const userIds = [...new Set(data.map((assist) => assist.user_id))];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles for assists:", profilesError);
          return data; // Return assists without profiles
        }

        // Combine the data
        return data.map((assist) => ({
          ...assist,
          profiles: profiles.find((profile) => profile.id === assist.user_id),
        }));
      } catch (error) {
        console.error("Exception fetching match assists:", error);
        return [];
      }
    },
    enabled: !!selectedMatchId,
  });

  // MOM 정보 조회
  const { data: mom } = useQuery({
    queryKey: ["matchMom", selectedMatchId],
    queryFn: async () => {
      if (!selectedMatchId) return null;

      try {
        // First fetch just the MOM without the join
        const { data, error } = await supabase
          .from("match_mom")
          .select("*")
          .eq("match_id", selectedMatchId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching match MOM:", error);
          return null;
        }

        if (!data) return null;

        // Then fetch the profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .eq("id", data.user_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for MOM:", profileError);
          return data; // Return MOM without profile
        }

        // Combine the data
        return {
          ...data,
          profiles: profile,
        };
      } catch (error) {
        console.error("Exception fetching match MOM:", error);
        return null;
      }
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

  console.log("completedMatches", completedMatches);

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
                    : match.is_home
                    ? match.opponent_team?.name ||
                      match.opponent_guest_team?.name
                    : match.team?.name}
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
                {match.is_home
                  ? `${match.home_score} : ${match.away_score}`
                  : `${match.away_score} : ${match.home_score}`}
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
