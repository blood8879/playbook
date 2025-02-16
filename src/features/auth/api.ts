import { SignupFormInputs, LoginFormInputs, OAuthProvider } from "./types";
import supabase from "@/lib/supabase/client";

export async function signupWithEmail(data: SignupFormInputs) {
  return await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });
}

export async function signupWithOAuth(provider: "kakao" | "google") {
  return await supabase.auth.signInWithOAuth({ provider });
}

export async function loginWithEmail(data: LoginFormInputs) {
  return await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
}

export async function loginWithOAuth(provider: OAuthProvider) {
  return await supabase.auth.signInWithOAuth({ provider });
}
