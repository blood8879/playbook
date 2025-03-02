"use client";

import { useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileEditForm } from "@/features/profile/components/ProfileEditForm";
import { Loader2, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { supabase, user } = useSupabase();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // 사용자 프로필 정보 조회
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // 프로필 업데이트 mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: any) => {
      // 프로필이 있는지 먼저 확인
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id);

      if (checkError) {
        console.error("프로필 확인 오류:", checkError);
        throw checkError;
      }

      // 프로필이 없으면 생성, 있으면 업데이트
      if (!existingProfile || existingProfile.length === 0) {
        console.log("프로필이 없어 새로 생성합니다.");
        const { data, error } = await supabase
          .from("profiles")
          .insert({ ...updatedProfile, id: user?.id })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // 프로필이 있으면 업데이트
        console.log("기존 프로필을 업데이트합니다.");
        const { data, error } = await supabase
          .from("profiles")
          .update(updatedProfile)
          .eq("id", user?.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // 성공 로직은 동일하게 유지
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setIsEditing(false);
      toast({
        title: "프로필 업데이트 완료",
        description: "프로필 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: (error) => {
      console.error("프로필 업데이트 오류:", error);
      toast({
        title: "프로필 업데이트 실패",
        description: "프로필 정보 업데이트에 실패했습니다.",
      });
    },
  });

  const handleProfileUpdate = async (data: any) => {
    if (!user?.id) return;

    try {
      const payload = {
        name: data.name,
        email: data.email,
      };

      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      console.error("프로필 업데이트 오류:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                프로필 정보를 불러올 수 없습니다.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["profile", user?.id],
                  })
                }
              >
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">내 프로필</CardTitle>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              프로필 수정
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <ProfileEditForm
              profile={profile}
              onSubmit={handleProfileUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={updateProfileMutation.isPending}
            />
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative w-24 h-24">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name || "사용자"}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        console.error("이미지 로드 실패:", profile.avatar_url);
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.setAttribute(
                          "style",
                          "display: flex"
                        );
                      }}
                    />
                  ) : null}
                  <div
                    className={`${
                      profile.avatar_url ? "hidden" : "flex"
                    } w-24 h-24 rounded-full bg-primary/10 items-center justify-center text-2xl font-semibold text-primary`}
                  >
                    {profile.name?.charAt(0) ||
                      profile.user_name?.charAt(0) ||
                      "U"}
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h2 className="text-2xl font-semibold">
                    {profile.name || profile.user_name}
                  </h2>
                  {profile.user_name && profile.user_name !== profile.name && (
                    <p className="text-muted-foreground">
                      @{profile.user_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span>
                    {profile.email || user?.email || "이메일 정보 없음"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span>
                    {profile.created_at
                      ? `가입일: ${format(
                          new Date(profile.created_at),
                          "yyyy년 MM월 dd일",
                          { locale: ko }
                        )}`
                      : "가입일 정보 없음"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
