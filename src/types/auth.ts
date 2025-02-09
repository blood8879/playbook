import { Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
}
