"use client";

import { ConfigAction } from "@revibase/wallet-sdk";
import { Settings } from "lucide-react";
import { memo } from "react";
import { ConfigActionCard } from "./config-action-card";

export const ConfigActionsDisplay = memo(
  ({ actions }: { actions: ConfigAction[] }) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
          <Settings className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500" />
          Configuration Actions ({actions.length})
        </div>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => (
            <ConfigActionCard key={index} action={action} />
          ))}
        </div>
      </div>
    );
  }
);
ConfigActionsDisplay.displayName = "ConfigActionsDisplay";
