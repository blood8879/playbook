"use client";

import { useSupabase } from "@/lib/supabase/client";

export default function TeamsPage() {
  const { supabase, user } = useSupabase();

  console.log("user", user);
  return <div>Teams</div>;
}
