"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress } from "@/utils";
import { useRecipientInfo } from "./hooks/use-recipient-info";

interface RecipientInfoProps {
  destination: string;
  additionalInfo: any;
}

export function RecipientInfo({
  destination,
  additionalInfo,
}: RecipientInfoProps) {
  const { username, isLoading } = useRecipientInfo(destination, additionalInfo);

  return (
    <div className="bg-background/60 rounded-md p-2">
      <div className="text-xs text-muted-foreground mb-0.5">To</div>
      <div className="flex flex-col">
        {isLoading ? (
          <Skeleton className="h-3 w-20" />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-8 w-8">
              {additionalInfo?.recipient && (
                <AvatarImage
                  src={`https://bucket.revibase.com/${additionalInfo?.recipient}/avatar`}
                  alt={`${username}'s avatar`}
                />
              )}
              <AvatarFallback className="bg-accent text-accent-foreground border font-semibold">
                {username?.charAt(0).toUpperCase() || destination.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium">
                {username || "Wallet Address"}
              </span>
              <span className="truncate min-w-0 w-full text-xs break-all text-muted-foreground">
                {formatAddress(destination)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
