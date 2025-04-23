"use client";

import { motion } from "framer-motion";
import { Skeleton } from "./ui/skeleton";

interface TransactionProgressProps {
  currentIndex: number;
  totalCount: number;
  isLoading?: boolean;
}

export function TransactionProgress({
  currentIndex,
  totalCount,
  isLoading = false,
}: TransactionProgressProps) {
  const progress = (currentIndex / totalCount) * 100;

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Transaction {currentIndex + 1} of {totalCount}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: `${(currentIndex / totalCount) * 100}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full bg-emerald-500 rounded-full"
        />
      </div>
    </div>
  );
}
