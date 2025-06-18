"use client";

import { Badge } from "@/components/ui/badge";
import type { IntentPayload, TransactionPayload } from "@/types";
import { memo } from "react";
import { IntentCard } from "./intent-card";

export const IntentDisplay = memo(
  ({
    publicKey,
    data,
    additionalInfo,
  }: {
    publicKey: string | null;
    data: TransactionPayload;
    additionalInfo: any;
  }) => {
    const intent = data.deserializedTxMessage as IntentPayload;

    return (
      <div className="space-y-3 gap-4">
        <Badge variant={data.label.variant} className="text-xs">
          {data.label.value}
        </Badge>
        <IntentCard
          publicKey={publicKey}
          intent={intent}
          additionalInfo={additionalInfo}
        />
      </div>
    );
  }
);

IntentDisplay.displayName = "IntentDisplay";
