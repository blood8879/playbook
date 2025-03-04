"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, isAfter, isBefore, isSameDay } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

import { ScheduleFormValues, scheduleFormSchema } from "../lib/schema";
import { createSchedule, fetchStadiums, saveMatches } from "../api";

export function useSchedule(teamId: string) {
  const router = useRouter();
  const [stadiums, setStadiums] = useState<any[]>([]);
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: "",
      startDate: new Date(),
      endDate: addDays(new Date(), 30),
      teamId: teamId,
      stadiumId: "",
      timeSlots: [{ day: "mon", time: "19:00" }],
      frequency: "weekly",
      description: "",
    },
  });

  const loadStadiums = async () => {
    try {
      const data = await fetchStadiums(teamId);
      setStadiums(data);
    } catch (error) {
      toast({
        title: "경기장 정보를 가져오는데 실패했습니다.",
        description: "다시 시도해주세요.",
      });
      console.error(error);
    }
  };

  const addTimeSlot = () => {
    const currentTimeSlots = form.getValues("timeSlots") || [];
    form.setValue("timeSlots", [
      ...currentTimeSlots,
      { day: "mon", time: "19:00" },
    ]);
  };

  const removeTimeSlot = (index: number) => {
    const currentTimeSlots = form.getValues("timeSlots") || [];
    if (currentTimeSlots.length > 1) {
      form.setValue(
        "timeSlots",
        currentTimeSlots.filter((_, i) => i !== index)
      );
    }
  };

  const generateMatches = (data: ScheduleFormValues) => {
    setIsGenerating(true);

    try {
      const { startDate, endDate, timeSlots, frequency } = data;
      const matches: any[] = [];
      const interval = frequency === "weekly" ? 7 : 14;

      let currentDate = new Date(startDate);

      while (
        isBefore(currentDate, endDate) ||
        isSameDay(currentDate, endDate)
      ) {
        const dayOfWeek = format(currentDate, "EEE").toLowerCase();

        // 해당 요일에 예약된 시간 슬롯들을 찾음
        const slotsForDay = timeSlots.filter(
          (slot) => slot.day.substring(0, 3).toLowerCase() === dayOfWeek
        );

        if (slotsForDay.length > 0) {
          slotsForDay.forEach((slot) => {
            const [hours, minutes] = slot.time.split(":").map(Number);
            const matchDateTime = new Date(currentDate);
            matchDateTime.setHours(hours, minutes, 0, 0);

            matches.push({
              date: matchDateTime.toISOString(),
              status: "scheduled",
            });
          });
        }

        // 다음 일자로 이동
        currentDate = addDays(currentDate, 1);
      }

      setGeneratedMatches(matches);
      toast({
        title: `총 ${matches.length}개의 경기 일정이 생성되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "경기 일정 생성 중 오류가 발생했습니다.",
      });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = (values: ScheduleFormValues) => {
    if (isAfter(values.startDate, values.endDate)) {
      toast({
        title: "시작일이 종료일보다 늦을 수 없습니다.",
      });
      return;
    }

    generateMatches(values);
  };

  const saveGeneratedMatches = async () => {
    if (!generatedMatches.length) {
      toast({
        title: "저장할 경기 일정이 없습니다.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const scheduleData = form.getValues();
      const createdSchedule = await createSchedule(scheduleData);

      await saveMatches(generatedMatches, createdSchedule.id);

      toast({
        title: "경기 일정이 성공적으로 저장되었습니다.",
      });
      router.push("/matches");
    } catch (error) {
      toast({
        title: "경기 일정 저장 중 오류가 발생했습니다.",
      });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    form,
    stadiums,
    loadStadiums,
    addTimeSlot,
    removeTimeSlot,
    generatedMatches,
    isGenerating,
    isSaving,
    onSubmit,
    saveGeneratedMatches,
  };
}
