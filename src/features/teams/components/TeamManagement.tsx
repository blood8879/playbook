"use client";

import { TeamMembers } from "./TeamMembers";
import { TeamJoinRequests } from "./TeamJoinRequests";
import { Card } from "@/components/ui/card";

interface TeamManagementProps {
  teamId: string;
  isLeader: boolean;
}

export function TeamManagement({ teamId, isLeader }: TeamManagementProps) {
  return (
    <div className="space-y-6">
      <Card>
        <TeamMembers teamId={teamId} isLeader={isLeader} />
      </Card>
      {isLeader && (
        <Card>
          <TeamJoinRequests teamId={teamId} />
        </Card>
      )}
    </div>
  );
}
