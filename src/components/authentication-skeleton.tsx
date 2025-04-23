"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function AuthenticationSkeleton() {
  return (
    <div className="w-full space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center gap-2 text-center"
      >
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-36 mx-auto" />
      </motion.div>
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
