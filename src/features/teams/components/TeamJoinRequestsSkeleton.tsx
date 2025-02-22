"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @ai_context
 * This file provides a skeleton loading state for TeamJoinRequests component.
 */

export function TeamJoinRequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border rounded p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-9 w-1/2" />
            <Skeleton className="h-9 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}