"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatAddress } from "@/utils";
import { IInstruction } from "@solana/kit";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { memo, useState } from "react";
import { AccountRoleDisplay } from "./account-role-display";
import { AddressDisplay } from "./address-display";
import { DataDisplay } from "./data-display";

interface InstructionDisplayProps {
  instruction: IInstruction;
  index: number;
}

export const InstructionDisplay = memo(
  ({ instruction, index }: InstructionDisplayProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasAccounts = instruction.accounts && instruction.accounts.length > 0;
    const hasData = instruction.data && instruction.data.length > 0;

    return (
      <div className="border border-border/50 rounded-lg">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="p-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="text-xs font-mono">
                    #{index + 1}
                  </Badge>
                  <span className="truncate min-w-0 w-full text-sm break-all">
                    {formatAddress(instruction.programAddress.toString())}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {hasAccounts && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{instruction.accounts!.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="p-2 space-y-4 border-t border-border/30">
              <AddressDisplay
                address={instruction.programAddress}
                label="Program Address"
              />

              {hasAccounts && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Accounts ({instruction.accounts!.length})
                  </h4>
                  <div className="space-y-2">
                    {instruction.accounts?.map((account, accountIndex) => (
                      <div
                        key={accountIndex}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono justify-center"
                          >
                            {accountIndex}
                          </Badge>
                          <AddressDisplay address={account.address} />
                        </div>
                        <AccountRoleDisplay role={account.role} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasData && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Data</h4>
                  <DataDisplay data={new Uint8Array(instruction.data)} />
                </div>
              )}

              {!hasAccounts && !hasData && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No additional instruction data
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
);

InstructionDisplay.displayName = "InstructionDisplay";
