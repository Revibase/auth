"use client";

import { memo } from "react";

// Update PermissionItem to be more visually appealing
export const PermissionItem = memo(
  ({ name, enabled }: { name: string; enabled: boolean }) => {
    return (
      <div
        className={`flex items-center p-1.5 rounded ${
          enabled
            ? "bg-green-50 dark:bg-green-950/20"
            : "bg-slate-100 dark:bg-slate-800/50"
        }`}
      >
        {enabled ? (
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : (
          <div className="h-4 w-4 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500 dark:text-slate-400"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        )}
        <span
          className={`text-xs ${
            enabled
              ? "text-green-800 dark:text-green-200"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {name}
        </span>
      </div>
    );
  }
);
PermissionItem.displayName = "PermissionItem";
