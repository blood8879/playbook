"use client";

import { useSupabase } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Shield,
  Users,
  Calendar,
  Plus,
  Trophy,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function DashboardPage() {
  const { supabase, user } = useSupabase();

  // 사용자 프로필 정보 조회
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 사용자가 속한 팀 목록 조회
  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ["userTeams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          team_id,
          role,
          status,
          teams:teams (
            id,
            name,
            emblem_url,
            created_at
          )
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 초대 목록 조회
  const { data: invitations } = useQuery({
    queryKey: ["invitations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_invitations")
        .select(
          `
          id,
          team_id,
          created_at,
          teams:teams (
            id,
            name,
            emblem_url
          )
        `
        )
        .eq("invitee_email", user.email)
        .eq("status", "pending");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  // 최근 경기 목록 조회
  const { data: recentMatches } = useQuery({
    queryKey: ["recentMatches", user?.id],
    queryFn: async () => {
      if (!user || !teams || teams.length === 0) return [];

      // 사용자가 속한 모든 팀 ID 추출
      const teamIds = teams.map((t) => t.team_id);

      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          id,
          match_date,
          location,
          home_score,
          away_score,
          is_finished,
          is_home,
          team_id,
          teams:teams!matches_team_id_fkey(id, name, emblem_url),
          opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url),
          opponent_guest_team:guest_clubs(id, name)
        `
        )
        .in("team_id", teamIds)
        .order("match_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teams && teams.length > 0,
  });

  // 로딩 중 표시
  if (isTeamsLoading || !user) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 사용자 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>내 정보</CardTitle>
            <CardDescription>{profile?.name || user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.name || user.email || ""}
                />
                <AvatarFallback>
                  {profile?.name?.substring(0, 2).toUpperCase() ||
                    user.email?.substring(0, 2).toUpperCase() ||
                    "사용자"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">
                  소속 팀: {teams?.length || 0}개
                </p>
                {profile?.primary_team_id && (
                  <p className="text-sm text-muted-foreground">
                    대표 클럽:{" "}
                    {teams?.find((t) => t.team_id === profile.primary_team_id)
                      ?.teams?.name || "알 수 없음"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/profile">프로필 관리</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* 팀 요약 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>내 팀</CardTitle>
            <CardDescription>소속된 팀 목록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teams && teams.length > 0 ? (
                teams.slice(0, 3).map((teamMember) => (
                  <div
                    key={teamMember.team_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage
                          src={teamMember.teams?.emblem_url || ""}
                          alt={teamMember.teams?.name || ""}
                        />
                        <AvatarFallback>
                          {teamMember.teams?.name
                            ?.substring(0, 2)
                            .toUpperCase() || "팀"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{teamMember.teams?.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {teamMember.role === "owner"
                        ? "소유자"
                        : teamMember.role === "admin"
                        ? "관리자"
                        : teamMember.role === "coach"
                        ? "코치"
                        : "멤버"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  소속된 팀이 없습니다.
                </p>
              )}

              {teams && teams.length > 3 && (
                <p className="text-xs text-muted-foreground text-right">
                  외 {teams.length - 3}개 팀
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/teams">
                <Users className="mr-2 h-4 w-4" />팀 관리
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/teams/new">
                <Plus className="mr-2 h-4 w-4" />팀 생성
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* 초대 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>팀 초대</CardTitle>
            <CardDescription>받은 초대 목록</CardDescription>
          </CardHeader>
          <CardContent>
            {invitations && invitations.length > 0 ? (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage
                          src={invitation.teams?.emblem_url || ""}
                          alt={invitation.teams?.name || ""}
                        />
                        <AvatarFallback>
                          {invitation.teams?.name
                            ?.substring(0, 2)
                            .toUpperCase() || "팀"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">{invitation.teams?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(invitation.created_at),
                            "yyyy.MM.dd",
                            { locale: ko }
                          )}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link href="/invitations">확인</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                받은 초대가 없습니다.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/invitations">초대 관리</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 최근 경기 섹션 */}
      <h2 className="text-2xl font-bold mb-4">최근 경기</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {recentMatches && recentMatches.length > 0 ? (
          recentMatches.map((match) => {
            const opponentName = match.is_home
              ? match.opponent_team?.[0]?.name ||
                match.opponent_guest_team?.[0]?.name ||
                "상대팀"
              : match.teams?.name || "우리팀";
            const ourTeamName = match.is_home
              ? match.teams?.name || "우리팀"
              : match.opponent_team?.[0]?.name ||
                match.opponent_guest_team?.[0]?.name ||
                "상대팀";

            const ourScore = match.is_home
              ? match.home_score
              : match.away_score;
            const theirScore = match.is_home
              ? match.away_score
              : match.home_score;

            let resultClass = "bg-gray-100 text-gray-800";
            let resultText = "예정";

            if (match.is_finished) {
              if (ourScore > theirScore) {
                resultClass = "bg-green-100 text-green-800";
                resultText = "승리";
              } else if (ourScore < theirScore) {
                resultClass = "bg-red-100 text-red-800";
                resultText = "패배";
              } else {
                resultClass = "bg-yellow-100 text-yellow-800";
                resultText = "무승부";
              }
            }

            return (
              <Card key={match.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      {format(new Date(match.match_date), "yyyy.MM.dd (EEE)", {
                        locale: ko,
                      })}
                    </CardTitle>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${resultClass}`}
                    >
                      {resultText}
                    </span>
                  </div>
                  <CardDescription>
                    {match.location || "장소 미정"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col items-center">
                      <Avatar className="h-12 w-12 mb-1">
                        <AvatarImage
                          src={match.teams?.emblem_url || ""}
                          alt={ourTeamName}
                        />
                        <AvatarFallback>
                          {ourTeamName.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-center">{ourTeamName}</span>
                    </div>

                    <div className="text-center">
                      {match.is_finished ? (
                        <div className="text-2xl font-bold">
                          {ourScore} : {theirScore}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(match.match_date), "HH:mm", {
                            locale: ko,
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      <Avatar className="h-12 w-12 mb-1">
                        <AvatarImage
                          src={match.opponent_team?.[0]?.emblem_url || ""}
                          alt={opponentName}
                        />
                        <AvatarFallback>
                          {opponentName.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-center">
                        {opponentName}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/matches/${match.id}`}>경기 상세</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">최근 경기가 없습니다.</p>
                <Button className="mt-4" asChild>
                  <Link href="/matches/new">경기 생성하기</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 빠른 링크 섹션 */}
      <h2 className="text-2xl font-bold mb-4">빠른 링크</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Shield className="h-10 w-10 text-primary-500 mb-2" />
            <h3 className="font-medium">팀 관리</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              팀 생성 및 관리
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/teams">이동</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Calendar className="h-10 w-10 text-primary-500 mb-2" />
            <h3 className="font-medium">경기 관리</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              경기 일정 및 결과 관리
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/matches">이동</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <Trophy className="h-10 w-10 text-primary-500 mb-2" />
            <h3 className="font-medium">리그 관리</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              리그 생성 및 관리
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/leagues">이동</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <TrendingUp className="h-10 w-10 text-primary-500 mb-2" />
            <h3 className="font-medium">통계</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              개인 및 팀 통계 확인
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/stats">이동</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
