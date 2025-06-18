"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { proxify } from "@/utils";
import { useMemo } from "react";

interface TransactionDetailsProps {
  asset: any;
  amount: number;
}

export function TransactionDetails({ asset, amount }: TransactionDetailsProps) {
  const decimals = asset?.token_info?.decimals ?? 0;
  const normalizedAmount = amount / 10 ** decimals;

  const formattedAmount = useMemo(() => {
    return normalizedAmount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(decimals, 5),
    });
  }, [normalizedAmount, decimals]);

  const usdValue = useMemo(() => {
    const pricePerToken = asset?.token_info?.price_info?.price_per_token ?? 0;
    if (pricePerToken <= 0) return null;

    return (normalizedAmount * pricePerToken).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }, [normalizedAmount, asset?.token_info?.price_info?.price_per_token]);

  const tokenSymbol = asset?.content?.metadata.symbol ?? "";
  const tokenName = asset?.content?.metadata.name || "Unknown Token";
  const tokenImage = proxify(asset?.content?.links?.image);

  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
      <div className="flex items-center space-x-2">
        <Avatar className="h-8 w-8">
          {tokenImage && <AvatarImage src={tokenImage} alt={tokenSymbol} />}
          <AvatarFallback className="bg-accent text-accent-foreground border font-semibold">
            {tokenSymbol?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h3 className="font-semibold text-sm">{tokenName}</h3>
          {tokenSymbol && (
            <div className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {tokenSymbol}
            </div>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-bold tracking-tight">
          {formattedAmount} <span className="text-primary">{tokenSymbol}</span>
        </div>
        {usdValue && (
          <div className="text-xs text-muted-foreground">≈ {usdValue}</div>
        )}
      </div>
    </div>
  );
}
