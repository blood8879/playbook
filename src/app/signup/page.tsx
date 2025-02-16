"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/ui/auth-layout";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { SignupFormInputs } from "@/features/auth/types";
import { signupWithEmail } from "@/features/auth/api";

export default function SignupPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (data: SignupFormInputs) => {
    setApiError(null);
    const { error } = await signupWithEmail(data);

    if (error) {
      setApiError(error.message);
    } else {
      router.push("/login?message=회원가입이 완료되었습니다. 로그인해주세요.");
    }
  };

  return (
    <AuthLayout
      title="회원가입"
      subtitle="아마추어 축구 스탯 관리를 시작해보세요"
    >
      <SignupForm onSubmit={handleSubmit} apiError={apiError} />
    </AuthLayout>
  );
}
