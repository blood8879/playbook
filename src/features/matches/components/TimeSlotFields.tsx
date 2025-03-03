"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ScheduleFormValues } from "../lib/schema";

const DAYS = [
  { value: "mon", label: "월요일" },
  { value: "tue", label: "화요일" },
  { value: "wed", label: "수요일" },
  { value: "thu", label: "목요일" },
  { value: "fri", label: "금요일" },
  { value: "sat", label: "토요일" },
  { value: "sun", label: "일요일" },
];

interface TimeSlotFieldsProps {
  form: UseFormReturn<ScheduleFormValues>;
  onRemove: (index: number) => void;
}

export function TimeSlotFields({ form, onRemove }: TimeSlotFieldsProps) {
  const timeSlots = form.watch("timeSlots") || [];

  return (
    <div className="space-y-4">
      {timeSlots.map((_, index) => (
        <div
          key={index}
          className="flex items-end gap-2 border p-4 rounded-md relative"
        >
          <FormField
            control={form.control}
            name={`timeSlots.${index}.day`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>요일</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="요일 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`timeSlots.${index}.time`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>시간</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {timeSlots.length > 1 && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onRemove(index)}
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
