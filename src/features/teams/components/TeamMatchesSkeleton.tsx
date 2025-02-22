"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @ai_context
 * This file provides a skeleton loading state for TeamMatches component.
 */

export function TeamMatchesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-36" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-3 w-1/3 mb-1" />
          <Skeleton className="h-3 w-1/2 mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}