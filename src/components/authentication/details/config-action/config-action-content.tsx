import { ConfigAction } from "@revibase/wallet-sdk";
import { memo } from "react";
import { MemberKeysDisplay } from "./member-keys-display";
import { MembersDisplay } from "./members-display";

// Update the ConfigActionContent component to work better with the card layout
export const ConfigActionContent = memo(
  ({ action }: { action: ConfigAction }) => {
    switch (action.__kind) {
      case "EditPermissions":
        return (
          <MembersDisplay
            members={action.fields[0]}
            actionKind={action.__kind}
          />
        );
      case "AddMembers":
        return (
          <MembersDisplay
            members={action.fields[0].map((x) => ({
              pubkey: x.data.pubkey,
              permissions: x.data.permissions,
            }))}
            actionKind={action.__kind}
          />
        );
      case "RemoveMembers":
        return <MemberKeysDisplay memberKeys={action.fields[0]} />;
      case "SetThreshold":
        return (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              New Threshold Value
            </div>
            <div className="font-mono text-sm p-2 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {action.fields[0]}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This is the minimum number of signatures required to approve
              transactions.
            </div>
          </div>
        );
    }
  }
);
ConfigActionContent.displayName = "ConfigActionContent";
