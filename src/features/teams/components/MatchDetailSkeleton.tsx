"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * @ai_context
 * Loading skeleton for match detail
 */
export function MatchDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}