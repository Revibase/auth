"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";

// Memoized skeleton component
export const LoadingDisplay = memo(() => {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          <div className="border border-border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="border border-border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
});
LoadingDisplay.displayName = "LoadingDisplay";
