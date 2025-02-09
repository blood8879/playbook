"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

export default function LandingPage() {
  const { session, profile } = useAuthStore();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-6 px-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Playbook</h1>
        <nav>
          <ul className="flex items-center space-x-4">
            <li>
              <Link href="/login">
                <Button variant="link">로그인</Button>
              </Link>
            </li>
            <li>
              <Link href="/signup">
                <Button>회원가입</Button>
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex flex-grow flex-col items-center justify-center px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">
          아마추어 축구 동호인을 위한 기록 관리 서비스
        </h2>
        <p className="mb-6 text-lg text-muted-foreground">
          Playbook은 경기 결과, 개인 기록 및 팀 통계를 한눈에 확인하고 관리할 수
          있는 스마트한 서비스입니다.
        </p>
        <p className="mb-4 text-lg font-medium">
          {session
            ? `${profile?.username || profile?.email}님 로그인중`
            : "비로그인"}
        </p>
        <div className="space-x-4">
          <Link href="/login">
            <Button className="px-6 py-3">로그인</Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="px-6 py-3">
              회원가입
            </Button>
          </Link>
        </div>
      </main>
      <footer className="py-4 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Playbook. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
