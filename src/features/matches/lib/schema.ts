"use client";

import * as z from "zod";

// 스케줄 폼 스키마
export const scheduleFormSchema = z.object({
  title: z.string().min(1, { message: "제목을 입력해주세요" }),
  startDate: z.date(),
  endDate: z.date(),
  teamId: z.string().min(1, { message: "팀을 선택해주세요" }),
  stadiumId: z.string().min(1, { message: "경기장을 선택해주세요" }),
  timeSlots: z
    .array(
      z.object({
        day: z.string(),
        time: z.string(),
      })
    )
    .min(1, { message: "최소 1개 이상의 시간대를 추가해주세요" }),
  frequency: z.enum(["weekly", "biweekly"]),
  description: z.string().optional(),
});

// 경기장 폼 스키마
export const stadiumFormSchema = z.object({
  name: z.string().min(1, { message: "경기장 이름을 입력해주세요" }),
  address: z.string().min(1, { message: "주소를 입력해주세요" }),
  teamId: z.string().min(1),
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
export type StadiumFormValues = z.infer<typeof stadiumFormSchema>;
