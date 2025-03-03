"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { ScheduleForm } from "@/features/matches/components/ScheduleForm";
import { useSupabase } from "@/lib/supabase/client";

function SchedulePageContent() {
  const { user } = useSupabase();

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">
          일정을 관리하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">경기 일정 관리</h1>
      <ScheduleForm userId={user.id} />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <SchedulePageContent />
    </Suspense>
  );
}
