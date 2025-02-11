"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { signOut } from "@/features/auth/api";

export default function LandingPage() {
  const { session, profile } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/"; // 로그아웃 후 새로고침
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex flex-grow flex-col items-center justify-center px-4 text-center">
        <h2 className="text-4xl font-bold mb-4">
          아마추어 축구 동호인을 위한 기록 관리 서비스
        </h2>
        <p className="mb-6 text-lg text-muted-foreground">
          Playbook은 경기 결과, 개인 기록 및 팀 통계를 한눈에 확인하고 관리할 수
          있는 스마트한 서비스입니다.
        </p>

        {!session && (
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
        )}
      </main>
      <footer className="py-4 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Playbook. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
