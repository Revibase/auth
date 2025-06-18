import { TransactionPayload } from "@/types";
import { FileText } from "lucide-react";
import { memo } from "react";

export const CloseTransactionDisplay = memo(
  ({ data }: { data: TransactionPayload }) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <FileText className="h-4 w-4 text-red-600 dark:text-red-500" />
          {data.label.value}
        </div>
        <div>
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
            <FileText className="h-5 w-5 text-red-600 dark:text-red-500" />
            <div className="text-sm text-slate-800 dark:text-slate-200">
              This action will permanently close the transaction and it cannot
              be reopened.
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Transaction Details
            </div>
            <div className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
              {typeof data.deserializedTxMessage === "string"
                ? data.deserializedTxMessage
                : JSON.stringify(data.deserializedTxMessage, null, 2)}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
