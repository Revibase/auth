"use client";

import { formatAddress } from "@/utils";
import { memo } from "react";

interface AddressDisplayProps {
  address: string;
  label?: string;
  className?: string;
}

export const AddressDisplay = memo(
  ({ address, label, className = "" }: AddressDisplayProps) => {
    return (
      <div className={`flex items-center gap-2 min-w-0 ${className}`}>
        {label && (
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {label}:
          </span>
        )}
        <span className="truncate min-w-0 w-full text-sm break-all">
          {formatAddress(address)}
        </span>
      </div>
    );
  }
);

AddressDisplay.displayName = "AddressDisplay";
