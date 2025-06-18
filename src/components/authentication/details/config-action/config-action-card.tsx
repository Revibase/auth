"use client";

import type { ConfigAction } from "@revibase/wallet-sdk";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Shield,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { ConfigActionContent } from "./config-action-content";

// New card-based component to replace the nested collapsible
export const ConfigActionCard = memo(({ action }: { action: ConfigAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get action icon and color based on action type
  const actionConfig = useMemo(() => {
    switch (action.__kind) {
      case "EditPermissions":
        return {
          icon: <Settings className="h-4 w-4" />,
          color: "text-blue-600 dark:text-blue-500",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-100 dark:border-blue-900/30",
        };
      case "AddMembers":
        return {
          icon: <UserPlus className="h-4 w-4" />,
          color: "text-emerald-600 dark:text-emerald-500",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          borderColor: "border-emerald-100 dark:border-emerald-900/30",
        };
      case "RemoveMembers":
        return {
          icon: <UserMinus className="h-4 w-4" />,
          color: "text-red-600 dark:text-red-500",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-100 dark:border-red-900/30",
        };
      case "SetThreshold":
        return {
          icon: <Shield className="h-4 w-4" />,
          color: "text-amber-600 dark:text-amber-500",
          bgColor: "bg-amber-50 dark:bg-amber-950/20",
          borderColor: "border-amber-100 dark:border-amber-900/30",
        };
      default:
        return {
          icon: <Settings className="h-4 w-4" />,
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-50 dark:bg-slate-900/60",
          borderColor: "border-slate-200 dark:border-slate-800",
        };
    }
  }, [action.__kind]);

  // Get a summary of the action for the card header
  const actionSummary = useMemo(() => {
    switch (action.__kind) {
      case "EditPermissions":
        return `Editing permissions for ${action.fields[0].length} member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "AddMembers":
        return `Adding ${action.fields[0].length} new member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "RemoveMembers":
        return `Removing ${action.fields[0].length} member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "SetThreshold":
        return `Setting threshold to ${action.fields[0]}`;
      default:
        return "Configuration action";
    }
  }, [action]);

  return (
    <div
      className={`rounded-lg border ${actionConfig.borderColor} overflow-hidden transition-all duration-200 hover:shadow-sm`}
    >
      <div
        className={`flex items-center justify-between p-3 ${actionConfig.bgColor} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`rounded-full p-1.5 ${actionConfig.bgColor} ${actionConfig.color}`}
          >
            {actionConfig.icon}
          </div>
          <div>
            <div className="font-medium text-sm">{action.__kind}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {actionSummary}
            </div>
          </div>
        </div>
        <button
          className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <ConfigActionContent action={action} />
        </div>
      )}
    </div>
  );
});
ConfigActionCard.displayName = "ConfigActionCard";
