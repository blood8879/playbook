"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import supabase from "@/lib/supabase/client";
import { AuthLayout } from "@/components/ui/auth-layout";

// Kakao 아이콘 컴포넌트
function KakaoIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg {...props} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#FEE500"
        d="M24 4C12.954 4 4 10.745 4 18c0 4.859 3.128 9.138 7.867 12.04C11.8 33.991 8 38.666 8 44c0 1.657 1.343 3 3 3 4.482 0 8.515-2.803 10.87-6.99C24.307 41.601 28.426 44 33 44c1.657 0 3-1.343 3-3 0-5.334-3.8-10.009-3.867-13.96C40.872 27.138 44 22.859 44 18 44 10.745 35.046 4 24 4z"
      />
    </svg>
  );
}

// Google 아이콘 컴포넌트
function GoogleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg {...props} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#EA4335"
        d="M24 9.5c3.35 0 6.4 1.13 8.78 3.01l6.6-6.6C35.96 4.75 30.38 2 24 2 14.88 2 6.85 7.05 2.94 14.04l7.66 5.95C12.73 14.21 17.78 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.01 24.48c0-1.66-.15-3.27-.43-4.81H24v9.14h12.34c-.53 2.86-2.1 5.26-4.5 6.88l7.08 5.48C43.1 36.14 46.01 30.6 46.01 24.48z"
      />
      <path
        fill="#FBBC05"
        d="M10.6 28.69a13.99 13.99 0 0 1 0-9.38v-5.95H2.94a22.02 22.02 0 0 0 0 21.28l7.66-5.95z"
      />
      <path
        fill="#34A853"
        d="M24 46c6.38 0 11.73-2.12 15.63-5.73l-7.08-5.48A14.16 14.16 0 0 1 24 38a14.14 14.14 0 0 1-13.55-9.32L3.8 37.68A21.94 21.94 0 0 0 24 46z"
      />
      <path fill="none" d="M2 2h44v44H2z" />
    </svg>
  );
}

// 유효성 검증 스키마 (로그인)
const loginSchema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  // 이메일/비밀번호 로그인 처리
  const onSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setApiError(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  // OAuth 로그인 처리 (Kakao, Google)
  const handleOAuthSignIn = async (provider: "kakao" | "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
    });
    if (error) {
      setApiError(error.message);
    }
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="아마추어 축구 스탯 관리 서비스에 오신 것을 환영합니다"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="name@example.com"
              aria-invalid={errors.email ? "true" : "false"}
            />
            {touchedFields.email && errors.email && (
              <p className="mt-1.5 text-sm text-red-500" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {apiError && (
          <div className="p-3 rounded-lg bg-red-50 text-sm text-red-500">
            {apiError}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary-500 text-black py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors border border-neutral-200"
        >
          로그인
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-50 text-neutral-500">또는</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthSignIn("kakao")}
            className="w-full px-4 py-3 rounded-lg border border-neutral-200 flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors"
          >
            <KakaoIcon className="w-5 h-5" />
            <span className="text-sm font-medium">카카오로 계속하기</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            className="w-full px-4 py-3 rounded-lg border border-neutral-200 flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors"
          >
            <GoogleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Google로 계속하기</span>
          </button>
        </div>

        <p className="text-center text-sm text-neutral-600">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary-500 hover:underline">
            회원가입
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
