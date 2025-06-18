"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, useState } from "react";

interface DataDisplayProps {
  data: Uint8Array;
}

const formatBytes = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
};

const formatBytesCompact = (bytes: Uint8Array, maxLength = 32): string => {
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (hex.length <= maxLength) {
    return hex;
  }

  return `${hex.slice(0, maxLength)}...`;
};

export const DataDisplay = memo(({ data }: DataDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLarge = data.length > 32;

  return (
    <div className="border border-dashed border-border rounded-lg gap-2 p-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {data.length} bytes
        </Badge>
        <span className="text-xs text-muted-foreground">Hex Data</span>
      </div>

      {isLarge ? (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="space-y-2">
            <div className="font-mono text-xs bg-muted/50 p-2 rounded border break-all">
              {formatBytesCompact(data)}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                {isExpanded ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3 mr-1" />
                    Show Full Data
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-2 font-mono text-xs bg-muted/50 p-2 rounded border break-all leading-relaxed">
              {formatBytes(data)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="font-mono text-xs bg-muted/50 p-2 rounded border break-all">
          {formatBytes(data)}
        </div>
      )}
    </div>
  );
});

DataDisplay.displayName = "DataDisplay";
