"use client";

import type { MemberKey } from "@revibase/wallet-sdk";
import { UserMinus } from "lucide-react";
import { memo } from "react";
import { KeyDisplay } from "./key-display";

// Update MemberKeysDisplay to match the new design
export const MemberKeysDisplay = memo(
  ({ memberKeys }: { memberKeys: MemberKey[] }) => {
    if (memberKeys.length === 0) {
      return (
        <div className="p-2 text-slate-500 dark:text-slate-400">
          No member keys specified
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Removing {memberKeys.length} Member
          {memberKeys.length !== 1 ? "s" : ""}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {memberKeys.map((memberKey, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-900/60 rounded-md p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30">
                  <UserMinus className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Member Key {index + 1}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <KeyDisplay memberKey={memberKey} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
MemberKeysDisplay.displayName = "MemberKeysDisplay";
