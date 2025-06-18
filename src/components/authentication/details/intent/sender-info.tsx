"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress } from "@/utils";
import { useSenderInfo } from "./hooks/use-sender-info";

interface SenderInfoProps {
  publicKey: string | null;
}

export function SenderInfo({ publicKey }: SenderInfoProps) {
  const { username, isLoading, senderAddress } = useSenderInfo(publicKey);

  return (
    <div className="bg-background/60 rounded-md p-2">
      <div className="text-xs text-muted-foreground mb-0.5">From</div>
      {isLoading ? (
        <Skeleton className="h-3 w-20" />
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-8 w-8">
            {publicKey && (
              <AvatarImage
                src={`https://bucket.revibase.com/${publicKey}/avatar`}
                alt={`${username}'s avatar`}
              />
            )}
            <AvatarFallback className="bg-accent text-accent-foreground border font-semibold">
              {username?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium">
              {username ?? "Your Wallet"}
            </span>
            <span className="truncate min-w-0 w-full text-xs break-all text-muted">
              {formatAddress(senderAddress)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
