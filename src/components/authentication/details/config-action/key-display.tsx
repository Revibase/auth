"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { MemberKey } from "@revibase/wallet-sdk";
import { convertMemberKeyToString } from "@revibase/wallet-sdk";
import { ChevronRight } from "lucide-react";
import { memo, useMemo } from "react";

// Memoized KeyDisplay component
export const KeyDisplay = memo(({ memberKey }: { memberKey: MemberKey }) => {
  // Memoize the key string conversion which could be expensive
  const keyHex = useMemo(
    () => convertMemberKeyToString(memberKey),
    [memberKey]
  );

  return (
    <div className="font-mono text-xs break-all text-slate-800 dark:text-slate-200">
      {keyHex.length > 64 ? (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            <ChevronRight className="h-3 w-3 mr-1" />
            Show full public key
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">{keyHex}</CollapsibleContent>
        </Collapsible>
      ) : (
        keyHex
      )}
    </div>
  );
});
KeyDisplay.displayName = "KeyDisplay";
