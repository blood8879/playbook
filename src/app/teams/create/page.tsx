"use client";

import { CreateTeamForm } from "@/features/teams/components/create-team-form";

export default function CreateTeamPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">새 팀 만들기</h1>
      <div className="max-w-2xl">
        <CreateTeamForm />
      </div>
    </div>
  );
}
