"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @ai_context
 * This file provides a skeleton loading state for TeamMembers component.
 */

export function TeamMembersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="rounded-lg overflow-hidden border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b last:border-b-0"
          >
            <div className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
