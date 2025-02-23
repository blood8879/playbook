import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { TeamMemberRole } from "../types";

export function useTeamMemberRole(teamId?: string, userId?: string) {
  const { supabase } = useSupabase();

  const { data: role } = useQuery({
    queryKey: ["teamMemberRole", teamId, userId],
    queryFn: async () => {
      if (!teamId || !userId) return null;

      const { data, error } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .single();

      if (error) return null;
      return data.role as TeamMemberRole;
    },
    enabled: !!teamId && !!userId,
  });

  return {
    isOwner: role === "owner",
    isManager: role === "manager",
    role,
  };
}
