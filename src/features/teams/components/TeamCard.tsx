"use client";

import { Team } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/teams/${team.id}`)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {team.emblem_url && (
            <img
              src={team.emblem_url}
              alt={`${team.name} 엠블럼`}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          {team.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{team.description}</p>
        <p className="text-sm">
          지역: {team.city} {team.gu}
        </p>
      </CardContent>
    </Card>
  );
}
