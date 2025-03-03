"use client";

import * as z from "zod";

// 경기장 생성 폼 스키마
export const stadiumFormSchema = z.object({
  name: z.string().min(1, "경기장 이름을 입력해주세요."),
  address: z.string().min(1, "경기장 주소를 입력해주세요."),
  description: z.string().optional(),
});

export type StadiumFormValues = z.infer<typeof stadiumFormSchema>;

// 경기 생성 폼 스키마
export const matchFormSchema = z
  .object({
    match_date: z.date({
      required_error: "경기 날짜를 선택해주세요.",
    }),
    match_time: z.string({
      required_error: "경기 시간을 선택해주세요.",
    }),
    registration_deadline: z.date({
      required_error: "참가 신청 마감일을 선택해주세요.",
    }),
    opponent_type: z.enum(["registered", "guest", "tbd"], {
      required_error: "상대팀 유형을 선택해주세요.",
    }),
    opponent_team_id: z.string().optional(),
    opponent_guest_team_name: z.string().optional(),
    opponent_guest_team_description: z.string().optional(),
    guest_club_id: z.string().optional(),
    venue: z.string().min(1, "경기장 정보를 입력해주세요."),
    stadium_id: z.string().optional(),
    description: z.string().optional(),
    competition_type: z.enum(["friendly", "league", "cup"], {
      required_error: "대회 유형을 선택해주세요.",
    }),
    match_type: z.enum(["home", "away", "neutral"], {
      required_error: "경기 유형을 선택해주세요.",
    }),
  })
  .refine(
    (data) => {
      if (data.opponent_type === "registered") {
        return !!data.opponent_team_id;
      }
      return true;
    },
    {
      message: "등록된 팀을 선택해주세요.",
      path: ["opponent_team_id"],
    }
  )
  .refine(
    (data) => {
      if (data.opponent_type === "guest") {
        return !!data.opponent_guest_team_name;
      }
      return true;
    },
    {
      message: "게스트 팀 이름을 입력해주세요.",
      path: ["opponent_guest_team_name"],
    }
  );

export type MatchFormValues = z.infer<typeof matchFormSchema>;
