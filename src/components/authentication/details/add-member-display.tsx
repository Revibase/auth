"use client";

import { Badge } from "@/components/ui/badge";
import type { TransactionPayload } from "@/types";
import { formatAddress } from "@/utils";
import { getMultiWalletFromSettings } from "@revibase/wallet-sdk";
import { address } from "@solana/kit";
import { LinkIcon, UserPlus, Wallet } from "lucide-react";
import { memo, useEffect, useState } from "react";

// Memoized AddMemberDisplay component with optimized data fetching
export const AddMemberDisplay = memo(
  ({ data }: { data: TransactionPayload }) => {
    const [multiWallet, setMultiWallet] = useState("");

    useEffect(() => {
      let isMounted = true;

      const fetchWallet = async () => {
        try {
          const response = await getMultiWalletFromSettings(
            address(data.transactionAddress)
          );
          if (isMounted) {
            setMultiWallet(response);
          }
        } catch (error) {
          console.error("Error fetching wallet:", error);
        }
      };

      fetchWallet();

      return () => {
        isMounted = false;
      };
    }, [data.transactionAddress]);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950">
            <UserPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          {data.label.value}
        </div>

        <div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60">
            <div className="mb-3">
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 px-2 py-1 h-auto font-normal"
              >
                <LinkIcon className="h-3 w-3 mr-1.5 text-amber-600 dark:text-amber-500" />
                Requesting to link passkey
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800">
                <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Wallet
                  </span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {formatAddress(multiWallet)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-9.5">
              This allows you to co-sign transactions on behalf of the wallet
            </p>
          </div>
        </div>
      </div>
    );
  }
);
AddMemberDisplay.displayName = "AddMemberDisplay";
