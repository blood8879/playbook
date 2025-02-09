"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { teamsApi } from "../api";
import { useRouter } from "next/navigation";

const createTeamSchema = z.object({
  name: z.string().min(2, "팀 이름은 2글자 이상이어야 합니다"),
  description: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
});

export function CreateTeamForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      logo_url: "",
    },
  });

  async function onSubmit(values: z.infer<typeof createTeamSchema>) {
    try {
      const team = await teamsApi.createTeam(
        values.name,
        values.description,
        values.logo_url || undefined
      );
      router.push(`/teams/${team.id}`);
    } catch (error) {
      console.error("팀 생성 실패:", error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>팀 이름</FormLabel>
              <FormControl>
                <Input placeholder="팀 이름을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>팀 소개</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="팀에 대한 소개를 입력하세요"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>로고 URL</FormLabel>
              <FormControl>
                <Input placeholder="로고 이미지 URL을 입력하세요" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">팀 생성</Button>
      </form>
    </Form>
  );
}
