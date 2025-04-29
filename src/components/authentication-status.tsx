"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

interface AuthenticationStatusProps {
  countdown: number;
  onRedirectNow: () => void;
  isLoading: boolean;
}

export function AuthenticationStatus({
  countdown,
  onRedirectNow,
  isLoading,
}: AuthenticationStatusProps) {
  if (isLoading) {
    return <AuthenticationSkeleton />;
  }
  return (
    <div className="w-full space-y-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="flex flex-col items-center justify-center gap-2 text-center"
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Authentication Successful
        </h3>
      </motion.div>

      <AnimatePresence>
        {countdown === 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              onClick={onRedirectNow}
              className="w-full"
              variant="outline"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Redirect Now
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function AuthenticationSkeleton() {
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
