"use client";

import type { IntentPayload } from "@/types";
import { AlertCircle } from "lucide-react";
import { useAsset } from "./hooks/use-asset";
import { LoadingCard } from "./loading-card";
import { TransactionDetails } from "./transaction-details";
import { TransferParties } from "./transfer-parties";

interface IntentCardProps {
  publicKey: string | null;
  intent: IntentPayload;
  additionalInfo: any;
}

export function IntentCard({
  publicKey,
  intent,
  additionalInfo,
}: IntentCardProps) {
  const { asset, isLoading, error } = useAsset(intent.mint.toString());

  if (isLoading) {
    return <LoadingCard />;
  }

  if (error) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-5">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">Transaction Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/40 bg-card/50 rounded-lg p-3 shadow-sm transition-all hover:shadow-md">
      <TransactionDetails asset={asset} amount={Number(intent.amount)} />
      <TransferParties
        publicKey={publicKey}
        destination={intent.destination.toString()}
        additionalInfo={additionalInfo}
      />
    </div>
  );
}
