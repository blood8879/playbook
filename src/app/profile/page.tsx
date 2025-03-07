"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Shield, User, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function ProfilePage() {
  const { supabase, user } = useSupabase();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [primaryTeamId, setPrimaryTeamId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 사용자 프로필 정보 조회
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 사용자가 속한 팀 목록 조회
  const { data: teams, isLoading: isTeamsLoading } = useQuery<any>({
    queryKey: ["userTeams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          team_id,
          role,
          teams:teams (
            id,
            name,
            emblem_url
          )
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 프로필 업데이트 뮤테이션
  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      primary_team_id: string | null;
    }) => {
      if (!user) throw new Error("사용자 정보가 없습니다.");

      const { error } = await supabase
        .from("profiles")
        .update(data)
        .eq("id", user.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "프로필이 업데이트되었습니다.",
        description: "변경사항이 성공적으로 저장되었습니다.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "오류가 발생했습니다.",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 프로필 정보 로드 시 상태 업데이트
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPrimaryTeamId(profile.primary_team_id);
    }
  }, [profile]);

  // 프로필 업데이트 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name,
      primary_team_id: primaryTeamId,
    });
  };

  // 로딩 중 표시
  if (isProfileLoading || !user) {
    return (
      <div className="container py-8">
        <div className="flex justify-center items-center h-64">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <User className="mr-2 h-8 w-8" />내 프로필
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 프로필 정보 카드 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>프로필 정보</CardTitle>
            <CardDescription>
              개인 정보 및 대표 클럽을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={profile?.avatar_url || ""}
                      alt={profile?.name || user.email || ""}
                    />
                    <AvatarFallback>
                      {profile?.name?.substring(0, 2).toUpperCase() ||
                        user.email?.substring(0, 2).toUpperCase() ||
                        "사용자"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-grow space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          value={user.email || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">이름</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!isEditing}
                        placeholder="이름을 입력하세요"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryTeam">대표 클럽</Label>
                      <div className="flex items-center">
                        <Shield className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Select
                          disabled={!isEditing}
                          value={primaryTeamId || "none"}
                          onValueChange={(value) =>
                            setPrimaryTeamId(value === "none" ? null : value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="대표 클럽을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">선택 안함</SelectItem>
                            {teams?.map((teamMember) => (
                              <SelectItem
                                key={teamMember.team_id}
                                value={teamMember.team_id}
                              >
                                {teamMember.teams?.name || "알 수 없는 팀"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!isEditing && primaryTeamId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          대표 클럽을 설정하면 로그인 시 해당 클럽의 대시보드가
                          표시됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        // 원래 값으로 되돌리기
                        setName(profile?.name || "");
                        setPrimaryTeamId(profile?.primary_team_id);
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    수정
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 계정 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>계정 상태 및 가입 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">계정 상태</span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  활성
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">가입일</span>
                <span className="text-sm text-muted-foreground">
                  {user.created_at
                    ? format(new Date(user.created_at), "yyyy년 MM월 dd일", {
                        locale: ko,
                      })
                    : "알 수 없음"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">소속 팀 수</span>
                <span className="text-sm text-muted-foreground">
                  {teams?.length || 0}개
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => supabase.auth.signOut()}
            >
              로그아웃
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 소속 팀 목록 */}
      {teams && teams.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">소속 팀</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {teams.map((teamMember) => (
              <Card
                key={teamMember.team_id}
                className={`${
                  teamMember.team_id === primaryTeamId
                    ? "border-primary-500 border-2"
                    : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {teamMember.teams?.name || "알 수 없는 팀"}
                    </CardTitle>
                    {teamMember.team_id === primaryTeamId && (
                      <div className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">
                        대표 클럽
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-2">
                      <AvatarImage
                        src={teamMember.teams?.emblem_url || ""}
                        alt={teamMember.teams?.name || ""}
                      />
                      <AvatarFallback>
                        {teamMember.teams?.name
                          ?.substring(0, 1)
                          .toUpperCase() || "팀"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        역할:{" "}
                        {teamMember.role === "owner"
                          ? "소유자"
                          : teamMember.role === "admin"
                          ? "관리자"
                          : teamMember.role === "coach"
                          ? "코치"
                          : "멤버"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/teams/${teamMember.team_id}`}>
                      팀 페이지로 이동
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
