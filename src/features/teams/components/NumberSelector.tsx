"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NumberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableNumbers?: number[];
  usedNumbers?: Record<string, string>;
  className?: string;
}

export function NumberSelector({
  value,
  onChange,
  availableNumbers,
  usedNumbers,
  className,
}: NumberSelectorProps) {
  const numbers =
    availableNumbers || Array.from({ length: 99 }, (_, i) => i + 1);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="등번호 선택" />
      </SelectTrigger>
      <SelectContent>
        {numbers.map((num) => {
          const numStr = String(num);
          const currentUser = usedNumbers?.[numStr];
          return (
            <SelectItem
              key={num}
              value={numStr}
              className={currentUser ? "text-muted-foreground" : ""}
            >
              {num}
              {currentUser && ` - ${currentUser}`}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
