import { supabase } from "@/lib/supabase/client";
import { Provider } from "@supabase/supabase-js";

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log("data", data);
  console.log("error", error);
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  username: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  console.log("signUpWithEmail data", data);
  console.log("signUpWithEmail error", error);

  // 기타 에러가 있는 경우
  if (error) throw error;

  // 이미 가입된 이메일인 경우 (session이 null이고 user가 있는 경우)
  if (!data.session && data.user) {
    throw new Error("이미 가입된 이메일입니다.");
  }

  // 회원가입 성공했지만 사용자 데이터가 없는 경우
  if (!data.user) throw new Error("회원가입에 실패했습니다.");

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback/reset-password`,
  });

  if (error) throw error;
};

export const signInWithOAuth = async (provider: Provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

  if (error) throw error;
  return data;
};
