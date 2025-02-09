import { Suspense } from "react";
import { TeamManagement } from "@/features/teams/components/team-management";

export default function TeamManagePage({
  params,
}: {
  params: { teamId: string };
}) {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">팀 관리</h1>
      <Suspense fallback={<div>로딩 중...</div>}>
        <TeamManagement teamId={params.teamId} />
      </Suspense>
    </div>
  );
}
