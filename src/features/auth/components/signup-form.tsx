"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signUpWithEmail, signInWithOAuth } from "../api";
import { Icons } from "@/components/ui/icons";

// 회원가입 유효성 스키마 정의
const signupSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  username: z.string().min(3, "사용자 이름은 최소 3자 이상이어야 합니다"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

type MessageType = {
  text: string;
  type: "success" | "error";
};

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageType | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setIsLoading("email");
      const response = await signUpWithEmail(
        data.email,
        data.password,
        data.username
      );

      // 회원가입 성공
      setMessage({
        text: "회원가입 성공! 인증 메일을 확인해주세요.",
        type: "success",
      });

      // 3초 후에 랜딩 페이지로 이동
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (error: any) {
      console.error("회원가입 실패:", error);

      // 에러 메시지 처리
      const errorMessage = error?.message || "회원가입에 실패하였습니다.";

      setMessage({
        text: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "kakao" | "apple") => {
    try {
      setIsLoading(provider);
      await signInWithOAuth(provider);
    } catch (error) {
      console.error(`${provider} 로그인 실패:`, error);
      setMessage({
        text: `${provider} 로그인에 실패했습니다.`,
        type: "error",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <h1 className="text-2xl font-bold">회원가입</h1>
        {message && (
          <p
            className={`mt-2 text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Button
              variant="outline"
              disabled={!!isLoading}
              onClick={() => handleOAuthSignIn("google")}
            >
              {isLoading === "google" ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="mr-2 h-4 w-4" />
              )}
              Google로 계속하기
            </Button>
            <Button
              variant="outline"
              disabled={!!isLoading}
              onClick={() => handleOAuthSignIn("kakao")}
            >
              {isLoading === "kakao" ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.kakao className="mr-2 h-4 w-4" />
              )}
              Kakao로 계속하기
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                또는 이메일로 가입
              </span>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용자 이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="사용자 이름을 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input placeholder="이메일을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={!!isLoading}>
                {isLoading === "email" ? "회원가입 중..." : "회원가입"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
