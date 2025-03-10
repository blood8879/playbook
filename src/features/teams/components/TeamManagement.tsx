"use client";

import { TeamMembers } from "./TeamMembers";
import { TeamJoinRequests } from "./TeamJoinRequests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";

interface TeamManagementProps {
  teamId: string;
  isLeader: boolean;
}

export function TeamManagement({ teamId, isLeader }: TeamManagementProps) {
  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-2 hover:shadow-md transition-all">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            팀원 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          <TeamMembers teamId={teamId} isLeader={isLeader} />
        </CardContent>
      </Card>

      {isLeader && (
        <Card className="overflow-hidden border-2 hover:shadow-md transition-all">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="h-5 w-5 text-primary" />
              신규 가입 요청
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <TeamJoinRequests teamId={teamId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
