"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingCard() {
  return (
    <div className="border border-border/40 bg-card/50 rounded-lg p-3 shadow-sm transition-all hover:shadow-md">
      {/* Loading State */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex flex-col">
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="bg-background/60 rounded-md p-2">
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="flex items-center justify-center">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>

        <div className="bg-background/60 rounded-md p-2">
          <Skeleton className="h-3 w-10 mb-1" />
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}
