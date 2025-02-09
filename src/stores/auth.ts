import { create } from "zustand";
import { Session } from "@supabase/supabase-js";
import { Profile } from "@/types/auth";
import { supabase } from "@/lib/supabase/client";

interface AuthState {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setProfile: (profile: Profile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  profile: null,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setProfile: (profile) => set({ profile }),
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
      useAuthStore.getState().setLoading(false);
      useAuthStore.getState().setProfile(profile);
    } else {
      useAuthStore.getState().setSession(null);
      useAuthStore.getState().setLoading(false);
      useAuthStore.getState().setProfile(null);
    }
  } catch (error) {
    console.error("인증 초기화 오류:", error);
    useAuthStore.getState().setLoading(false);
  }
};
