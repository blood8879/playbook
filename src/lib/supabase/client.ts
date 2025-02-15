"use client";

// 클라이언트용
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";

const createClient = (url: string, anonKey: string) => {
  return createBrowserClient(url, anonKey);
};

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { supabase, user };
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default supabase;
