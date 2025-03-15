"use client";

import { Suspense } from "react";
import { Loader2, Calendar, AlertCircle, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMatchForm } from "@/features/matches/components/CreateMatchForm";
import { useSupabase } from "@/lib/supabase/client";
import { useParams } from "next/navigation";


function CreateMatchContent({ teamId }: { teamId: string }) {
  const { user } = useSupabase();

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-700 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              로그인이 필요합니다
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-600">
              경기를 생성하려면 먼저 로그인해주세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-blue-800 text-white">
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />새 경기 생성
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <CreateMatchForm userId={user.id} teamId={teamId} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamNewMatchPage() {
  // useParams를 통해 라우트 파라미터 가져오기
  const params = useParams();
  const teamId = params.id as string;

  return (
    <Suspense
      fallback={
        <div className="container max-w-4xl mx-auto py-8">
          <Card className="overflow-hidden border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                경기 정보 로딩 중
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <CreateMatchContent teamId={teamId} />
    </Suspense>
  );
}
