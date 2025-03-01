import { Profile, ProfileFormValues } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 사용자 프로필 정보를 조회합니다.
 */
export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("프로필 조회 오류:", error);
    throw error;
  }

  return data;
}

/**
 * 사용자 프로필 정보를 업데이트합니다.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  profileData: Partial<ProfileFormValues>
): Promise<Profile> {
  console.log("profileData", profileData);
  // 먼저 프로필이 존재하는지 확인
  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (checkError) {
    console.error("프로필 조회 오류:", checkError);

    // 프로필이 없는 경우 생성
    if (checkError.code === "PGRST116") {
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          ...profileData,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      return newProfile;
    }

    throw checkError;
  }

  // 프로필이 존재하면 업데이트
  const { data, error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("프로필 업데이트 오류:", error);
    throw error;
  }

  return data;
}

/*
 * 사용자 아바타(프로필 이미지)를 업로드합니다.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  // 파일 확장자 추출
  const fileExt = file.name.split(".").pop();
  // 고유한 파일명 생성 (타임스탬프 + 유저ID + 확장자)
  const fileName = `${Date.now()}_${userId}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // 아바타 이미지 버킷에 업로드
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file);

  if (uploadError) {
    console.error("아바타 업로드 오류:", uploadError);
    throw uploadError;
  }

  // 올바른 버킷에서 URL 가져오기
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const avatarUrl = data.publicUrl;

  // 프로필 정보 업데이트
  await updateProfile(supabase, userId, { avatar_url: avatarUrl });

  return avatarUrl;
}
