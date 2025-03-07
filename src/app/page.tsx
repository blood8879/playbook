import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Trophy,
  Users,
  TrendingUp,
  Star,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인한 경우 사용자 정보 및 대표 클럽 정보 조회
  if (user) {
    // 사용자 프로필 정보 조회
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // 대표 클럽 ID가 있는 경우
    if (profile?.primary_team_id) {
      // 대표 클럽 정보 조회
      const { data: team } = await supabase
        .from("teams")
        .select("*")
        .eq("id", profile.primary_team_id)
        .single();

      // 팀 멤버 정보 조회 (역할 확인용)
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", profile.primary_team_id)
        .eq("user_id", user.id)
        .single();

      // 팀 정보가 없으면 대시보드로 리다이렉트
      if (!team) {
        return redirect("/dashboard");
      }

      // 시즌 전체 통계 조회
      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, is_finished, home_score, away_score, is_home, team_id")
        .eq("team_id", team.id)
        .eq("is_finished", true);

      const matches = matchesData || [];

      const wins = matches.filter(
        (match) =>
          (match.is_home && match.home_score > match.away_score) ||
          (!match.is_home && match.away_score > match.home_score)
      ).length;

      const draws = matches.filter(
        (match) => match.home_score === match.away_score
      ).length;

      const losses = matches.filter(
        (match) =>
          (match.is_home && match.home_score < match.away_score) ||
          (!match.is_home && match.away_score < match.home_score)
      ).length;

      const totalGoalsScored = matches.reduce(
        (acc, match) =>
          acc + (match.is_home ? match.home_score : match.away_score),
        0
      );

      const totalGoalsConceded = matches.reduce(
        (acc, match) =>
          acc + (match.is_home ? match.away_score : match.home_score),
        0
      );

      const seasonStats = {
        matches: matches.length,
        wins,
        draws,
        losses,
        goalsScored: totalGoalsScored,
        goalsConceded: totalGoalsConceded,
      };

      // 멤버인 경우 개인 통계 조회
      let memberStats = null;
      if (
        teamMember &&
        teamMember.role !== "owner" &&
        teamMember.role !== "admin"
      ) {
        // 참석 통계
        const { data: attendanceData } = await supabase
          .from("match_attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("team_id", team.id);

        const totalAttendance = attendanceData?.length || 0;
        const attending =
          attendanceData?.filter((a) => a.status === "attending")?.length || 0;

        // 득점 통계
        const { data: goalsData } = await supabase
          .from("match_goals")
          .select("*")
          .eq("player_id", user.id)
          .eq("team_id", team.id);

        // MOM 통계
        const { data: momData } = await supabase
          .from("match_mom")
          .select("*")
          .eq("player_id", user.id)
          .eq("team_id", team.id);

        memberStats = {
          totalMatches: matches.length,
          attended: attending,
          attendanceRate:
            matches.length > 0
              ? Math.round((attending / matches.length) * 100)
              : 0,
          goals: goalsData?.length || 0,
          mom: momData?.length || 0,
        };
      }

      return (
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
              <div className="flex max-w-[980px] flex-col items-start gap-2">
                <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
                  안녕하세요, {profile?.name || user.email}님!
                </h1>
                <div className="flex items-center">
                  <p className="max-w-[700px] text-lg text-muted-foreground">
                    {team.name} 대시보드에 오신 것을 환영합니다.
                  </p>
                  <Link
                    href={`/teams/${team.id}/dashboard`}
                    className="ml-2 flex items-center text-primary-500 hover:underline"
                  >
                    <span className="mr-1">상세 대시보드</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* 운영자 또는 관리자인 경우 팀 통계 표시 */}
              {teamMember &&
                (teamMember.role === "owner" ||
                  teamMember.role === "admin") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          경기 결과
                        </CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {seasonStats.wins}승 {seasonStats.draws}무{" "}
                          {seasonStats.losses}패
                        </div>
                        <p className="text-xs text-muted-foreground">
                          총 {seasonStats.matches}경기 | 승률{" "}
                          {seasonStats.matches > 0
                            ? Math.round(
                                (seasonStats.wins / seasonStats.matches) * 100
                              )
                            : 0}
                          %
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          득점/실점
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {seasonStats.goalsScored} /{" "}
                          {seasonStats.goalsConceded}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          평균{" "}
                          {seasonStats.matches > 0
                            ? (
                                seasonStats.goalsScored / seasonStats.matches
                              ).toFixed(1)
                            : 0}{" "}
                          골 득점 |{" "}
                          {seasonStats.matches > 0
                            ? (
                                seasonStats.goalsConceded / seasonStats.matches
                              ).toFixed(1)
                            : 0}{" "}
                          골 실점
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          팀 관리
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <Link href={`/teams/${team.id}`}>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              <Shield className="mr-2 h-4 w-4" />팀 정보 관리
                            </Button>
                          </Link>
                          <Link href={`/teams/${team.id}/matches`}>
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              경기 일정 관리
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              {/* 일반 멤버인 경우 개인 통계 표시 */}
              {teamMember &&
                teamMember.role !== "owner" &&
                teamMember.role !== "admin" &&
                memberStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          참석 통계
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {memberStats.attended} / {memberStats.totalMatches}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          참석률 {memberStats.attendanceRate}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          득점
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {memberStats.goals}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          경기당{" "}
                          {memberStats.totalMatches > 0
                            ? (
                                memberStats.goals / memberStats.totalMatches
                              ).toFixed(2)
                            : 0}{" "}
                          골
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                          MOM
                        </CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {memberStats.mom}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          MOM 선정 횟수
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

              <div className="mt-6">
                <Link href="/dashboard">
                  <Button>전체 대시보드로 이동</Button>
                </Link>
              </div>
            </section>
          </main>
        </div>
      );
    } else {
      // 대표 클럽이 없는 경우
      return (
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
              <div className="flex max-w-[980px] flex-col items-start gap-2">
                <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
                  안녕하세요, {user.email}님!
                </h1>
                <p className="max-w-[700px] text-lg text-muted-foreground">
                  대표 클럽을 설정하면 더 많은 정보를 대시보드에서 확인할 수
                  있습니다.
                </p>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>대표 클럽 설정하기</CardTitle>
                  <CardDescription>
                    대표 클럽을 설정하면 로그인 시 바로 해당 클럽의 대시보드를
                    확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <p>
                      프로필 페이지에서 대표 클럽을 설정해보세요. 대표 클럽을
                      설정하면:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>로그인 시 바로 클럽 대시보드를 확인할 수 있습니다</li>
                      <li>팀 통계와 개인 기록을 한눈에 볼 수 있습니다</li>
                      <li>경기 일정과 결과를 빠르게 확인할 수 있습니다</li>
                    </ul>
                    <div className="flex gap-4 mt-2">
                      <Link href="/profile">
                        <Button>프로필에서 설정하기</Button>
                      </Link>
                      <Link href="/dashboard">
                        <Button variant="outline">대시보드로 이동</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      );
    }
  }

  // 비로그인 상태 화면
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
          <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
              당신의 축구 팀을 전문적으로 관리하세요
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              아마추어 축구팀을 위한 최고의 스탯 관리 및 리그 운영 플랫폼
            </p>
            <div className="space-x-4">
              <Link href="/login">
                <Button size="lg">시작하기</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" size="lg">
                  회원가입
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Image
                  src="https://picsum.photos/seed/teams/400/300"
                  alt="팀 관리"
                  width={400}
                  height={300}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="relative z-20 text-white">
                  <h3 className="font-bold">팀 관리</h3>
                  <p>팀을 생성하고 팀원들을 초대하세요</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Image
                  src="https://picsum.photos/seed/matches/400/300"
                  alt="경기 관리"
                  width={400}
                  height={300}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="relative z-20 text-white">
                  <h3 className="font-bold">경기 관리</h3>
                  <p>경기 일정과 스탯을 기록하세요</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Image
                  src="https://picsum.photos/seed/leagues/400/300"
                  alt="리그 관리"
                  width={400}
                  height={300}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="relative z-20 text-white">
                  <h3 className="font-bold">리그 관리</h3>
                  <p>리그를 만들고 운영하세요</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
