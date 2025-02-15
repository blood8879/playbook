"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import supabase from "@/lib/supabase/client";
import { AuthLayout } from "@/components/ui/auth-layout";

// 유효성 검증 스키마 (회원가입)
// 이름, 이메일, 비밀번호, 비밀번호 확인 (비밀번호 일치 여부 검증)
const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해주세요"),
    email: z.string().email("이메일 형식이 올바르지 않습니다"),
    password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormInputs>({ resolver: zodResolver(signupSchema) });
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  // 이메일/비밀번호 회원가입 처리
  const onSubmit = async (data: SignupFormInputs) => {
    setApiError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });

    if (error) {
      setApiError(error.message);
    } else {
      router.push("/login?message=회원가입이 완료되었습니다. 로그인해주세요.");
    }
  };

  // OAuth 회원가입 처리 (로그인과 동일 로직으로 진행. 계정이 없으면 자동 생성됨)
  const handleOAuthSignUp = async (provider: "kakao" | "google") => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      setApiError(error.message);
    }
  };

  return (
    <AuthLayout
      title="회원가입"
      subtitle="아마추어 축구 스탯 관리를 시작해보세요"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              이름
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="홍길동"
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

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
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-red-500">
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-sm text-red-500">
                {errors.confirmPassword.message}
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
          className="w-full bg-primary-500 text-white py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
        >
          회원가입
        </button>

        <p className="text-center text-sm text-neutral-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary-500 hover:underline">
            로그인
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
