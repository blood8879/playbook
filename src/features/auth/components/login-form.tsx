"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signInWithEmail, signInWithOAuth } from "../api";
import { Icons } from "@/components/ui/icons";
import { useAuthStore } from "@/stores/auth";

const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type MessageType = {
  text: string;
  type: "success" | "error";
};

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageType | null>(null);
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading("email");
      const response = await signInWithEmail(data.email, data.password);

      if (response.session) {
        setSession(response.session);
        const userMetadata = response.user.user_metadata;
        setProfile({
          id: response.user.id,
          email: response.user.email,
          username: userMetadata.username,
          full_name: userMetadata.full_name || null,
          avatar_url: userMetadata.avatar_url || null,
          created_at: response.user.created_at,
          updated_at: response.user.updated_at,
        });
        router.push("/");
      }
    } catch (error: any) {
      console.error("로그인 실패:", error);
      setMessage({
        text: "이메일 또는 비밀번호가 올바르지 않습니다.",
        type: "error",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "kakao") => {
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
        <h1 className="text-2xl font-bold">로그인</h1>
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
                또는 이메일로 로그인
              </span>
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Button type="submit" className="w-full" disabled={!!isLoading}>
                  {isLoading === "email" ? "로그인 중..." : "로그인"}
                </Button>
              </div>
            </form>
          </Form>
          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
