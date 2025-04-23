"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Data } from "@/types";
import { motion } from "framer-motion";
import { ArrowRightLeft, FileText } from "lucide-react";

interface TransactionDetailsProps {
  data: Data;
  parsedMessage: string | null;
}

export function TransactionDetails({
  data,
  parsedMessage,
}: TransactionDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        {data.type === "transaction" ? (
          <ArrowRightLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
        ) : (
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-500" />
        )}
        <span>
          {data.type === "transaction"
            ? data.transactionActionType
              ? `Transaction Type: ${data.transactionActionType}`
              : "Transaction Details"
            : "Message Details"}
        </span>
      </div>
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <ScrollArea className="h-[200px] w-full p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {parsedMessage}
          </pre>
        </ScrollArea>
      </Card>
    </motion.div>
  );
}
