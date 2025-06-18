import { DataPayload } from "@/types";
import { FileText } from "lucide-react";
import { memo } from "react";

export const MessageDisplay = memo(({ data }: { data: DataPayload }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-500" />
        Message Details
      </div>
      <div className="font-mono text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
        {data.payload}
      </div>
    </div>
  );
});
