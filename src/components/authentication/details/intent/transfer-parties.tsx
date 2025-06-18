"use client";

import { ArrowRight } from "lucide-react";
import { RecipientInfo } from "./recipient-info";
import { SenderInfo } from "./sender-info";

interface TransferPartiesProps {
  publicKey: string | null;
  destination: string;
  additionalInfo: any;
}

export function TransferParties({
  publicKey,
  destination,
  additionalInfo,
}: TransferPartiesProps) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <SenderInfo publicKey={publicKey} />

      <div className="flex items-center justify-center">
        <div className="bg-muted/50 rounded-full p-1">
          <ArrowRight className="text-primary h-4 w-4" />
        </div>
      </div>

      <RecipientInfo
        destination={destination}
        additionalInfo={additionalInfo}
      />
    </div>
  );
}
