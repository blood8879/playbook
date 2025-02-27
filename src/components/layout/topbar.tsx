"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { getMyInvitations } from "@/features/teams/api";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamInvitation } from "@/features/teams/types/index";

export function Topbar() {
  const { supabase, user } = useSupabase();

  const { data: invitations } = useQuery({
    queryKey: ["invitations"],
    queryFn: () =>
      user?.id
        ? getMyInvitations(supabase, user.id)
        : Promise.resolve([] as TeamInvitation[]),
    enabled: !!user?.id,
  });

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/invitations">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {invitations && invitations.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {invitations.length}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
