"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { POSITIONS } from "../constants/positions";

interface PositionSelectorProps {
  selectedPositions: string[];
  onPositionsChange: (positions: string[]) => void;
  className?: string;
}

export function PositionSelector({
  selectedPositions,
  onPositionsChange,
  className,
}: PositionSelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {POSITIONS.map((position) => (
        <div key={position.value} className="flex items-center space-x-2">
          <Checkbox
            id={`position-${position.value}`}
            checked={selectedPositions.includes(position.value)}
            onCheckedChange={(checked) => {
              if (checked) {
                onPositionsChange([...selectedPositions, position.value]);
              } else {
                onPositionsChange(
                  selectedPositions.filter((p) => p !== position.value)
                );
              }
            }}
          />
          <label
            htmlFor={`position-${position.value}`}
            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {position.label}
          </label>
        </div>
      ))}
    </div>
  );
}
