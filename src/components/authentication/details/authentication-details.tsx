"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { DataPayload } from "@/types";
import { motion } from "framer-motion";
import { memo } from "react";
import { AddMemberDisplay } from "./add-member-display";
import { CloseTransactionDisplay } from "./close-transaction-display";
import { IntentDisplay } from "./intent/intent-display";
import { TransactionSkeleton } from "./loading-display";
import { MessageDisplay } from "./message-display";
import { ObjectDisplay } from "./object/object-display";

interface TransactionDetailsProps {
  data: DataPayload | null;
  publicKey: string | null;
  isLoading: boolean;
  additionalInfo?: any;
}

export function AuthenticationDetails({
  data,
  publicKey,
  isLoading,
  additionalInfo,
}: TransactionDetailsProps) {
  if (isLoading) {
    return <TransactionSkeleton />;
  }

  if (!data) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2 overflow-hidden"
    >
      <ScrollArea className="max-h-[300px] h-auto w-full overflow-y-auto">
        <ContentDetails
          data={data}
          additionalInfo={additionalInfo}
          publicKey={publicKey}
        />
      </ScrollArea>
    </motion.div>
  );
}

const ContentDetails = memo(
  ({
    data,
    publicKey,
    additionalInfo,
  }: {
    data: DataPayload;
    publicKey: string | null;
    additionalInfo: any;
  }) => {
    if (data.type === "message") {
      return <MessageDisplay data={data} />;
    }

    if (data.transactionActionType === "add_new_member") {
      return <AddMemberDisplay data={data} />;
    }

    if (data.transactionActionType === "close") {
      return <CloseTransactionDisplay data={data} />;
    }

    if (
      data.transactionActionType === "native_transfer_intent" ||
      data.transactionActionType === "token_transfer_intent"
    ) {
      return (
        <IntentDisplay
          data={data}
          additionalInfo={additionalInfo}
          publicKey={publicKey}
        />
      );
    }

    return <ObjectDisplay data={data} />;
  }
);
