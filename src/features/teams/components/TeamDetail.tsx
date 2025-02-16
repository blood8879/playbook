"use client";

import { Team } from "../types";

interface TeamDetailProps {
  team: Team;
}

export function TeamDetail({ team }: TeamDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {team.emblem_url && (
          <img
            src={team.emblem_url}
            alt={`${team.name} 엠블럼`}
            className="w-20 h-20 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">
            {team.city} {team.gu}
          </p>
        </div>
      </div>

      {team.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">팀 소개</h2>
          <p className="text-muted-foreground">{team.description}</p>
        </div>
      )}

      {/* 추후 팀원 목록, 경기 기록 등 추가 */}
    </div>
  );
}
