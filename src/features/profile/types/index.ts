import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("이메일 형식이 올바르지 않습니다").optional(),
  avatar_url: z.string().nullable().optional(),
});

export type Profile = z.infer<typeof profileSchema> & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type ProfileFormValues = z.infer<typeof profileSchema>;
