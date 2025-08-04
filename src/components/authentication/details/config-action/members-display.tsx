"use client";

import { Badge } from "@/components/ui/badge";
import type { MemberKeyWithPermissionsArgs } from "@revibase/wallet-sdk";
import { KeyType, Permission, Permissions } from "@revibase/wallet-sdk";
import { Users } from "lucide-react";
import { memo } from "react";
import { KeyDisplay } from "./key-display";
import { PermissionItem } from "./permission-item";

// Update the MembersDisplay component to be cleaner and more consistent with the new design
export const MembersDisplay = memo(
  ({
    members,
    actionKind,
  }: {
    members: Omit<
      MemberKeyWithPermissionsArgs,
      "delegateCloseArgs" | "delegateCreationArgs"
    >[];
    actionKind: "AddMembers" | "EditPermissions";
  }) => {
    if (members.length === 0) {
      return (
        <div className="p-2 text-slate-500 dark:text-slate-400">
          No members specified
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {actionKind === "EditPermissions" ? "Editing" : "Adding"}{" "}
          {members.length} Member
          {members.length !== 1 ? "s" : ""}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {members.map((memberWithArgs, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-900/60 rounded-md p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800">
                    <Users className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <span className="font-medium text-sm">
                    Member {index + 1}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Type:{" "}
                  {KeyType.Ed25519 === memberWithArgs.pubkey.keyType
                    ? "Wallet Address"
                    : "Passkey"}
                </Badge>
              </div>

              <div className="space-y-3 mt-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Public Key
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <KeyDisplay memberKey={memberWithArgs.pubkey} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Permissions
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <PermissionItem
                        name="Initiate Transaction"
                        enabled={Permissions.has(
                          memberWithArgs.permissions,
                          Permission.InitiateTransaction
                        )}
                      />
                      <PermissionItem
                        name="Vote Transaction"
                        enabled={Permissions.has(
                          memberWithArgs.permissions,
                          Permission.VoteTransaction
                        )}
                      />
                      <PermissionItem
                        name="Execute Transaction"
                        enabled={Permissions.has(
                          memberWithArgs.permissions,
                          Permission.ExecuteTransaction
                        )}
                      />
                      <PermissionItem
                        name="Is Delegate"
                        enabled={Permissions.has(
                          memberWithArgs.permissions,
                          Permission.IsDelegate
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
MembersDisplay.displayName = "MembersDisplay";
