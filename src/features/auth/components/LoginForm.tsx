"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginSchema, LoginFormInputs, OAuthProvider } from "../types";
import { KakaoIcon, GoogleIcon } from "./OAuthIcons";

interface LoginFormProps {
  onSubmit: (data: LoginFormInputs) => Promise<void>;
  onOAuthLogin: (provider: OAuthProvider) => Promise<void>;
  apiError: string | null;
}

export function LoginForm({
  onSubmit,
  onOAuthLogin,
  apiError,
}: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  return (
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
          onClick={() => onOAuthLogin("kakao")}
          className="w-full px-4 py-3 rounded-lg border border-neutral-200 flex items-center justify-center gap-3 hover:bg-neutral-50 transition-colors"
        >
          <KakaoIcon className="w-5 h-5" />
          <span className="text-sm font-medium">카카오로 계속하기</span>
        </button>
        <button
          type="button"
          onClick={() => onOAuthLogin("google")}
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
  );
}
