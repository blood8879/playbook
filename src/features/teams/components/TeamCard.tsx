import { Team } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Card>
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
