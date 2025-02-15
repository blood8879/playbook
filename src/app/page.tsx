import { createServerClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {user ? (
          // 로그인 상태 화면
          <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
            <div className="flex max-w-[980px] flex-col items-start gap-2">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
                안녕하세요, {user.email}님!
              </h1>
              <p className="max-w-[700px] text-lg text-muted-foreground">
                대시보드에서 팀과 경기를 관리하실 수 있습니다.
              </p>
              <Link href="/dashboard">
                <Button>대시보드로 이동</Button>
              </Link>
            </div>
          </section>
        ) : (
          // 비로그인 상태 화면
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
