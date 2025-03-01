"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useSupabase } from "@/lib/supabase/client";
import { uploadAvatar } from "../api";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  name?: string | null;
  onAvatarUploaded?: (url: string) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  name,
  onAvatarUploaded,
}: AvatarUploadProps) {
  const { supabase, user } = useSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !user?.id) return;

    // 파일 확장자 검사
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "지원되지 않는 파일 형식",
        description: "이미지 파일(JPEG, PNG, GIF)만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    // 파일 크기 검사 (최대 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "파일 크기 초과",
        description: "최대 5MB 크기의 이미지만 업로드 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    // 파일 미리보기 생성
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setIsUploading(true);
      const avatarUrl = await uploadAvatar(supabase, user.id, file);

      toast({
        title: "프로필 이미지 업로드 완료",
        description: "프로필 이미지가 성공적으로 업데이트되었습니다.",
      });

      if (onAvatarUploaded) {
        onAvatarUploaded(avatarUrl);
      }
    } catch (error: any) {
      console.error("업로드 오류:", error);
      toast({
        title: "업로드 실패",
        description: error?.message
          ? `오류: ${error.message}`
          : "프로필 이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      // 업로드 실패 시 미리보기 이미지를 이전 이미지로 복원
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const nameFallback = name?.charAt(0) || "U";

  return (
    <div className="flex flex-col items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileChange}
      />

      <div className="relative group">
        <Avatar className="w-24 h-24">
          <AvatarImage src={previewUrl || ""} alt={name || "프로필"} />
          <AvatarFallback className="text-2xl">{nameFallback}</AvatarFallback>
        </Avatar>

        <div
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-white" />
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerFileInput}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            업로드 중...
          </>
        ) : (
          "이미지 변경"
        )}
      </Button>
    </div>
  );
}
