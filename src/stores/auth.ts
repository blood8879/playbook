import { create } from "zustand";
import { Session } from "@supabase/supabase-js";
import { Profile } from "@/types/auth";
import { supabase } from "@/lib/supabase/client";

interface AuthState {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoading: true,
  session: null,
  profile: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// 인증 상태 초기화 함수
export const initializeAuth = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      useAuthStore.getState().setSession(session);
      useAuthStore.getState().setProfile(profile);
      useAuthStore.getState().setLoading(false);
    } else {
      useAuthStore.getState().setSession(null);
      useAuthStore.getState().setProfile(null);
      useAuthStore.getState().setLoading(false);
    }
  } catch (error) {
    console.error("인증 초기화 오류:", error);
    useAuthStore.getState().setLoading(false);
  }
};
