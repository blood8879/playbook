"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { profileSchema, ProfileFormValues } from "../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AvatarUpload } from "./AvatarUpload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ProfileEditFormProps {
  profile: any;
  onSubmit: (data: ProfileFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ProfileEditForm({
  profile,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProfileEditFormProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url || null
  );

  // 폼 초기화
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name || "",
      email: profile.email || "",
      avatar_url: profile.avatar_url || null,
    },
  });

  const handleSubmit = async (data: ProfileFormValues) => {
    console.log("data", data);
    // avatarUrl이 업데이트 되었다면 form 값에 포함
    if (avatarUrl !== profile.avatar_url) {
      data.avatar_url = avatarUrl;
    }

    await onSubmit(data);
  };

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
    form.setValue("avatar_url", url);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-8">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            name={form.watch("name")}
            onAvatarUploaded={handleAvatarUploaded}
          />

          <div className="flex-1 space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input placeholder="이름" {...field} />
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
                    <Input placeholder="이메일" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
