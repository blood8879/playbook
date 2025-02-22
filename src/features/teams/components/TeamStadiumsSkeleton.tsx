"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @ai_context
 * This file provides a skeleton loading state for TeamStadiums component.
 */

export function TeamStadiumsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border rounded p-4">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-3 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mb-4" />
            <div className="flex justify-end gap-2 mt-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}