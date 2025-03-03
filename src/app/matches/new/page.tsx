"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { CreateMatchForm } from "@/features/matches/components/CreateMatchForm";
import { useSupabase } from "@/lib/supabase/client";

function CreateMatchContent() {
  const { user } = useSupabase();

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
        <p className="text-muted-foreground">
          경기를 생성하려면 먼저 로그인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">새 경기 생성</h1>
      <CreateMatchForm userId={user.id} />
    </div>
  );
}

export default function CreateMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[600px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <CreateMatchContent />
    </Suspense>
  );
}
