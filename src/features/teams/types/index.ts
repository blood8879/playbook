import { z } from "zod";

export const teamSchema = z.object({
  name: z
    .string()
    .min(2, "2글자 이상 입력해주세요")
    .max(50, "50글자 이하로 입력해주세요"),
  description: z.string().max(500, "500자 이하로 입력해주세요").optional(),
  city: z.string().min(1, "시/도를 선택해주세요"),
  gu: z.string().min(1, "구를 선택해주세요"),
});

export type TeamFormData = z.infer<typeof teamSchema>;

export interface Team {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  emblem_url: string | null;
  city: string;
  gu: string;
  leader_id: string;
}
