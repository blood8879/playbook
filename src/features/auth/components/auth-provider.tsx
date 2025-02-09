"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase/client";

interface AuthContextType {
  user: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, loading, setSession, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // 로그인이 필요한 페이지 목록
  const protectedRoutes = ["/teams", "/teams/create"];

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          setSession(initialSession);
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });

        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setSession, setLoading]);

  useEffect(() => {
    if (!loading) {
      if (
        !session &&
        protectedRoutes.some((route) => pathname.startsWith(route))
      ) {
        router.push("/login");
      }
    }
  }, [session, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
