"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/ui/auth-layout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginFormInputs, OAuthProvider } from "@/features/auth/types";
import { loginWithEmail, loginWithOAuth } from "@/features/auth/api";

export default function LoginPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    const { error } = await loginWithEmail(data);
    if (error) {
      setApiError(error.message);
    } else {
      router.push("/teams");
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    const { error } = await loginWithOAuth(provider);
    if (error) {
      setApiError(error.message);
    }
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="아마추어 축구 스탯 관리 서비스에 오신 것을 환영합니다"
    >
      <LoginForm
        onSubmit={handleSubmit}
        onOAuthLogin={handleOAuthLogin}
        apiError={apiError}
      />
    </AuthLayout>
  );
}
