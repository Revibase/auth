"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  DataPayload,
  IntentPayload,
  PasskeyPayload,
  TransactionPayload,
} from "@/types";
import { DATABASE_ENDPOINT, getAsset, proxify, rpc } from "@/utils";
import {
  type ConfigAction,
  convertMemberKeyToString,
  fetchMaybeDelegate,
  getDelegateAddress,
  getMultiWalletFromSettings,
  KeyType,
  type MemberKey,
  type MemberKeyWithPermissionsArgs,
  Permission,
  Permissions,
  Secp256r1Key,
} from "@revibase/wallet-sdk";
import { address } from "@solana/kit";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  LinkIcon,
  Settings,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Skeleton } from "../ui/skeleton";

interface TransactionDetailsProps {
  data: DataPayload | null;
  publicKey: string;
  isLoading: boolean;
  additionalInfo?: any;
}

// Memoized skeleton component
const TransactionSkeleton = React.memo(() => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    </motion.div>
  );
});
TransactionSkeleton.displayName = "TransactionSkeleton";

// Main component with early returns for loading/empty states
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
        <MessageContent
          data={data}
          additionalInfo={additionalInfo}
          publicKey={publicKey}
        />
      </ScrollArea>
    </motion.div>
  );
}

// Helper function to format addresses - moved outside component to avoid recreation
const formatAddress = (address: string) => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

// Memoized MessageContent component
const MessageContent = React.memo(
  ({
    data,
    publicKey,
    additionalInfo,
  }: {
    data: DataPayload;
    publicKey: string;
    additionalInfo: TransactionDetailsProps["additionalInfo"];
  }) => {
    if (data.type === "message") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            Message Details
          </div>
          <div className="font-mono text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {data.payload}
          </div>
        </div>
      );
    }

    if (data.transactionActionType === "add_new_member") {
      return <AddMemberDisplay data={data} />;
    }

    if (data.transactionActionType === "close") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4 text-red-600 dark:text-red-500" />
            {data.label.value}
          </div>
          <div>
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
              <div className="text-sm text-slate-800 dark:text-slate-200">
                This action will permanently close the transaction and it cannot
                be reopened.
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Transaction Details
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                {typeof data.deserializedTxMessage === "string"
                  ? data.deserializedTxMessage
                  : JSON.stringify(data.deserializedTxMessage, null, 2)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (data.transactionActionType === "change_config") {
      return (
        <ConfigActionsList
          actions={data.deserializedTxMessage as ConfigAction[]}
        />
      );
    }

    if (
      data.transactionActionType === "native_transfer_intent" ||
      data.transactionActionType === "token_transfer_intent"
    ) {
      return (
        <div className="space-y-3 gap-4">
          <Badge variant={data.label.variant} className="text-xs">
            {data.label.value}
          </Badge>
          <IntentDisplay
            intent={data.deserializedTxMessage as IntentPayload}
            additionalInfo={additionalInfo}
            publicKey={publicKey}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3 gap-4">
        <Badge variant={data.label.variant} className="text-xs">
          {data.label.value}
        </Badge>
        <ObjectDisplay data={data.deserializedTxMessage} />
      </div>
    );
  }
);
MessageContent.displayName = "MessageContent";

// Memoized ConfigActionsList component
const ConfigActionsList = React.memo(
  ({ actions }: { actions: ConfigAction[] }) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
          <Settings className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500" />
          Configuration Actions ({actions.length})
        </div>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => (
            <ConfigActionCard key={index} action={action} />
          ))}
        </div>
      </div>
    );
  }
);
ConfigActionsList.displayName = "ConfigActionsList";

// New card-based component to replace the nested collapsible
const ConfigActionCard = React.memo(({ action }: { action: ConfigAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get action icon and color based on action type
  const actionConfig = useMemo(() => {
    switch (action.__kind) {
      case "EditPermissions":
        return {
          icon: <Settings className="h-4 w-4" />,
          color: "text-blue-600 dark:text-blue-500",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-100 dark:border-blue-900/30",
        };
      case "AddMembers":
        return {
          icon: <UserPlus className="h-4 w-4" />,
          color: "text-emerald-600 dark:text-emerald-500",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          borderColor: "border-emerald-100 dark:border-emerald-900/30",
        };
      case "RemoveMembers":
        return {
          icon: <UserMinus className="h-4 w-4" />,
          color: "text-red-600 dark:text-red-500",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-100 dark:border-red-900/30",
        };
      case "SetThreshold":
        return {
          icon: <Shield className="h-4 w-4" />,
          color: "text-amber-600 dark:text-amber-500",
          bgColor: "bg-amber-50 dark:bg-amber-950/20",
          borderColor: "border-amber-100 dark:border-amber-900/30",
        };
      default:
        return {
          icon: <Settings className="h-4 w-4" />,
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-50 dark:bg-slate-900/60",
          borderColor: "border-slate-200 dark:border-slate-800",
        };
    }
  }, [action.__kind]);

  // Get a summary of the action for the card header
  const actionSummary = useMemo(() => {
    switch (action.__kind) {
      case "EditPermissions":
        return `Editing permissions for ${action.fields[0].length} member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "AddMembers":
        return `Adding ${action.fields[0].length} new member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "RemoveMembers":
        return `Removing ${action.fields[0].length} member${
          action.fields[0].length !== 1 ? "s" : ""
        }`;
      case "SetThreshold":
        return `Setting threshold to ${action.fields[0]}`;
      default:
        return "Configuration action";
    }
  }, [action]);

  return (
    <div
      className={`rounded-lg border ${actionConfig.borderColor} overflow-hidden transition-all duration-200 hover:shadow-sm`}
    >
      <div
        className={`flex items-center justify-between p-3 ${actionConfig.bgColor} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div
            className={`rounded-full p-1.5 ${actionConfig.bgColor} ${actionConfig.color}`}
          >
            {actionConfig.icon}
          </div>
          <div>
            <div className="font-medium text-sm">{action.__kind}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {actionSummary}
            </div>
          </div>
        </div>
        <button
          className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <ConfigActionContent action={action} />
        </div>
      )}
    </div>
  );
});
ConfigActionCard.displayName = "ConfigActionCard";

// Update the ConfigActionContent component to work better with the card layout
const ConfigActionContent = React.memo(
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

// Memoized AddMemberDisplay component with optimized data fetching
const AddMemberDisplay = React.memo(
  ({ data }: { data: TransactionPayload }) => {
    const [multiWallet, setMultiWallet] = useState("");

    useEffect(() => {
      let isMounted = true;

      const fetchWallet = async () => {
        try {
          const response = await getMultiWalletFromSettings(
            address(data.transactionAddress)
          );
          if (isMounted) {
            setMultiWallet(response);
          }
        } catch (error) {
          console.error("Error fetching wallet:", error);
        }
      };

      fetchWallet();

      return () => {
        isMounted = false;
      };
    }, [data.transactionAddress]);

    const formattedAddress = useMemo(
      () => formatAddress(multiWallet.toString()),
      [multiWallet]
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950">
            <UserPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          {data.label.value}
        </div>

        <div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60">
            <div className="mb-3">
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 px-2 py-1 h-auto font-normal"
              >
                <LinkIcon className="h-3 w-3 mr-1.5 text-amber-600 dark:text-amber-500" />
                Requesting to link passkey
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800">
                <Wallet className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Wallet
                  </span>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {formattedAddress}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-9.5">
              This allows you to co-sign transactions on behalf of the wallet
            </p>
          </div>
        </div>
      </div>
    );
  }
);
AddMemberDisplay.displayName = "AddMemberDisplay";

// Update the MembersDisplay component to be cleaner and more consistent with the new design
const MembersDisplay = React.memo(
  ({
    members,
    actionKind,
  }: {
    members: MemberKeyWithPermissionsArgs[];
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

// Update MemberKeysDisplay to match the new design
const MemberKeysDisplay = React.memo(
  ({ memberKeys }: { memberKeys: MemberKey[] }) => {
    if (memberKeys.length === 0) {
      return (
        <div className="p-2 text-slate-500 dark:text-slate-400">
          No member keys specified
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Removing {memberKeys.length} Member
          {memberKeys.length !== 1 ? "s" : ""}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {memberKeys.map((memberKey, index) => (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-900/60 rounded-md p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30">
                  <UserMinus className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Member Key {index + 1}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800">
                <KeyDisplay memberKey={memberKey} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
MemberKeysDisplay.displayName = "MemberKeysDisplay";

// Memoized KeyDisplay component
const KeyDisplay = React.memo(({ memberKey }: { memberKey: MemberKey }) => {
  // Memoize the key string conversion which could be expensive
  const keyHex = useMemo(
    () => convertMemberKeyToString(memberKey),
    [memberKey]
  );

  return (
    <div className="font-mono text-xs break-all text-slate-800 dark:text-slate-200">
      {keyHex.length > 64 ? (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            <ChevronRight className="h-3 w-3 mr-1" />
            Show full public key
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">{keyHex}</CollapsibleContent>
        </Collapsible>
      ) : (
        keyHex
      )}
    </div>
  );
});
KeyDisplay.displayName = "KeyDisplay";

// Optimized IntentDisplay component with proper data fetching and cleanup
const IntentDisplay = React.memo(
  ({
    publicKey,
    intent,
    additionalInfo,
  }: {
    publicKey: string;
    intent: IntentPayload;
    additionalInfo: TransactionDetailsProps["additionalInfo"];
  }) => {
    const [asset, setAsset] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingUsername, setIsLoadingUsername] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [usernameData, setUsernameData] = useState<{
      recipient?: string;
      sender?: string;
    }>({});

    // Fetch token data with proper cleanup
    useEffect(() => {
      let isMounted = true;

      const fetchToken = async () => {
        if (!isMounted) return;

        setIsLoading(true);
        setError(null);

        try {
          if (intent.mint.toString() === "11111111111111111111111111111111") {
            const wSol = await getAsset(
              address("So11111111111111111111111111111111111111112")
            );
            if (!isMounted) return;
            setAsset({
              content: {
                links: {
                  image:
                    "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                },
                metadata: { name: "Solana", symbol: "SOL", description: "" },
              },
              id: "native",
              token_info: {
                decimals: 9,
                price_info: {
                  currency: "USDC",
                  price_per_token: wSol.token_info?.price_per_sol || 0,
                },
              },
            });
          } else {
            const assetData = await getAsset(intent.mint.toString());
            if (isMounted) {
              setAsset(assetData);
            }
          }
        } catch (error) {
          if (isMounted) {
            setError("Failed to load token information");
            console.error("Error fetching token:", error);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchToken();

      return () => {
        isMounted = false;
      };
    }, [intent.mint]);

    // Fetch username data with proper cleanup and error handling
    useEffect(() => {
      let isMounted = true;

      const fetchUsername = async () => {
        if (!isMounted) return;

        setIsLoadingUsername(true);

        try {
          const usernameData: { recipient?: string; sender?: string } = {};

          if (additionalInfo?.recipient) {
            try {
              const delegate = await fetchMaybeDelegate(
                rpc,
                await getDelegateAddress(
                  new Secp256r1Key(additionalInfo.recipient)
                )
              );

              if (
                delegate.exists &&
                (await getMultiWalletFromSettings(
                  delegate.data.multiWalletSettings
                )) === intent.destination
              ) {
                try {
                  const response = await fetch(
                    `${DATABASE_ENDPOINT}?publicKey=${additionalInfo.recipient}`
                  );

                  if (!isMounted) return;

                  if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                  }

                  const result = (await response.json()) as PasskeyPayload;
                  if (result.username) {
                    usernameData.recipient = result.username;
                  }
                } catch (fetchError) {
                  console.error(
                    "Error fetching recipient username:",
                    fetchError
                  );
                  // Silently fail and keep using the address
                }
              }
            } catch (error) {
              console.error("Error fetching delegate data:", error);
            }
          }

          // Process sender username
          if (publicKey && isMounted) {
            try {
              const response = await fetch(
                `${DATABASE_ENDPOINT}?publicKey=${publicKey}`,
                { signal: AbortSignal.timeout(5000) } // Add timeout
              );

              if (!isMounted) return;

              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }

              const result = (await response.json()) as PasskeyPayload;
              if (result.username) {
                usernameData.sender = result.username;
              }
            } catch (fetchError) {
              console.error("Error fetching sender username:", fetchError);
              // Silently fail and keep using the address
            }
          }

          if (isMounted) {
            setUsernameData(usernameData);
          }
        } catch (error) {
          console.error("Error in username resolution:", error);
          // Silently fail and keep using the address
        } finally {
          if (isMounted) {
            setIsLoadingUsername(false);
          }
        }
      };

      fetchUsername();

      return () => {
        isMounted = false;
      };
    }, [additionalInfo, intent.destination, publicKey]);

    // Memoized calculations
    const amount = useMemo(
      () => Number(intent.amount) / 10 ** (asset?.token_info?.decimals ?? 0),
      [asset?.token_info?.decimals, intent.amount]
    );

    const usdValue = useMemo(() => {
      const pricePerToken = asset?.token_info?.price_info?.price_per_token ?? 0;
      if (pricePerToken <= 0) return null;

      return (amount * pricePerToken).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    }, [amount, asset?.token_info?.price_info?.price_per_token]);

    const formattedAmount = useMemo(() => {
      return amount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.min(asset?.token_info?.decimals ?? 0, 5),
      });
    }, [amount, asset?.token_info?.decimals]);

    const tokenSymbol = useMemo(
      () => asset?.content?.metadata.symbol ?? "",
      [asset?.content?.metadata.symbol]
    );

    const tokenName = useMemo(
      () => asset?.content?.metadata.name || "Unknown Token",
      [asset?.content?.metadata.name]
    );

    const tokenImage = useMemo(
      () => proxify(asset?.content?.links?.image),
      [asset?.content?.links?.image]
    );

    const formattedDestination = useMemo(
      () => formatAddress(intent.destination),
      [intent.destination]
    );

    // Loading state
    if (isLoading) {
      return (
        <div className="border border-border/40 bg-card/50 rounded-lg p-3 shadow-sm transition-all hover:shadow-md">
          {/* Loading State */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="bg-background/60 rounded-md p-2">
              <Skeleton className="h-3 w-10 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>

            <div className="flex items-center justify-center">
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>

            <div className="bg-background/60 rounded-md p-2">
              <Skeleton className="h-3 w-10 mb-1" />
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-5">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">
                Transaction Error
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    // Render the component
    return (
      <div className="border border-border/40 bg-card/50 rounded-lg p-3 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-sm">
              {tokenImage ? (
                <Image
                  src={tokenImage || "/placeholder.svg"}
                  alt={tokenSymbol || "Token"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-primary/10 h-full w-full flex items-center justify-center text-sm font-bold text-primary">
                  {tokenSymbol?.[0] || "?"}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="font-semibold text-sm">{tokenName}</h3>
              {tokenSymbol && (
                <Badge variant="secondary" className="text-xs">
                  {tokenSymbol}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold tracking-tight">
              {formattedAmount}{" "}
              <span className="text-primary">{tokenSymbol}</span>
            </div>
            {usdValue && (
              <div className="text-xs text-muted-foreground">≈ {usdValue}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="bg-background/60 rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-0.5">From</div>
            <div className="font-medium text-sm flex items-center">
              <div className="bg-primary/10 text-primary px-1.5 py-0.5 text-xs rounded-md">
                {usernameData.sender ?? "Your Wallet"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="bg-muted/50 rounded-full p-1">
              <ArrowRight className="text-primary h-4 w-4" />
            </div>
          </div>

          <div className="bg-background/60 rounded-md p-2">
            <div className="text-xs text-muted-foreground mb-0.5">To</div>
            <div className="flex flex-col">
              {isLoadingUsername ? (
                <Skeleton className="h-3 w-20" />
              ) : (
                usernameData.recipient && (
                  <div className="font-medium text-sm text-primary">
                    {usernameData.recipient}
                  </div>
                )
              )}
              <div className="text-xs text-muted-foreground font-mono">
                {formattedDestination}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
IntentDisplay.displayName = "IntentDisplay";

// Memoized ObjectDisplay component
const ObjectDisplay = React.memo(
  ({
    data,
    level = 0,
    excludeKeys = [],
  }: {
    data: any;
    level?: number;
    excludeKeys?: string[];
  }) => {
    if (!data || typeof data !== "object") {
      return null;
    }

    const entries = Object.entries(data).filter(
      ([key]) => !excludeKeys.includes(key)
    );

    if (entries.length === 0) {
      return (
        <div className="text-slate-500 dark:text-slate-400 text-xs">
          Empty object
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", level > 0 && "ml-4")}>
        {entries.map(([key, value]) => (
          <PropertyItem key={key} name={key} value={value} level={level} />
        ))}
      </div>
    );
  }
);
ObjectDisplay.displayName = "ObjectDisplay";

// Memoized PropertyItem component
const PropertyItem = React.memo(
  ({ name, value, level }: { name: string; value: any; level: number }) => {
    const [isOpen, setIsOpen] = useState(false);

    const isObject = useMemo(
      () =>
        value !== null && typeof value === "object" && !Array.isArray(value),
      [value]
    );

    const isArray = Array.isArray(value);

    const isUint8Array = useMemo(
      () =>
        value instanceof Uint8Array ||
        (value && value.buffer instanceof ArrayBuffer),
      [value]
    );

    // Handle Uint8Array display
    if (isUint8Array) {
      // Convert Uint8Array to hex string for display - memoized for performance
      const hexValue = useMemo(() => {
        return Array.from(new Uint8Array(value.buffer || value))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }, [value]);

      return (
        <div className="flex flex-col">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {name}:
          </div>
          <div className="font-mono text-xs break-all text-slate-800 dark:text-slate-200 mt-1">
            {hexValue.length > 64 ? (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <ChevronRight className="h-3 w-3 mr-1" />
                  Show full hex ({hexValue.length / 2} bytes)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  {hexValue}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              hexValue
            )}
          </div>
        </div>
      );
    }

    // Handle object or array display
    if (isObject || isArray) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center text-sm w-full text-left">
            {isOpen ? (
              <ChevronDown className="h-3 w-3 mr-1 text-slate-500" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1 text-slate-500" />
            )}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {name}
            </span>
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
              {isArray ? `Array(${value.length})` : "Object"}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            {isArray ? (
              <div className="space-y-2 ml-4">
                {value.length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400 text-xs">
                    Empty array
                  </div>
                ) : (
                  value.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="border-l-2 border-slate-200 dark:border-slate-700 pl-2"
                    >
                      {typeof item === "object" && item !== null ? (
                        <ObjectDisplay data={item} level={level + 1} />
                      ) : (
                        <div className="font-mono text-xs break-all">
                          {String(item)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <ObjectDisplay data={value} level={level + 1} />
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Handle primitive values
    return (
      <div className="flex">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px] mr-2">
          {name}:
        </div>
        <div className="font-mono text-xs break-all text-slate-800 dark:text-slate-200">
          {value === null || value === undefined ? (
            <span className="text-slate-500 dark:text-slate-400">null</span>
          ) : typeof value === "bigint" ? (
            value.toString()
          ) : (
            String(value)
          )}
        </div>
      </div>
    );
  }
);
PropertyItem.displayName = "PropertyItem";

// Update PermissionItem to be more visually appealing
const PermissionItem = React.memo(
  ({ name, enabled }: { name: string; enabled: boolean }) => {
    return (
      <div
        className={`flex items-center p-1.5 rounded ${
          enabled
            ? "bg-green-50 dark:bg-green-950/20"
            : "bg-slate-100 dark:bg-slate-800/50"
        }`}
      >
        {enabled ? (
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : (
          <div className="h-4 w-4 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500 dark:text-slate-400"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        )}
        <span
          className={`text-xs ${
            enabled
              ? "text-green-800 dark:text-green-200"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {name}
        </span>
      </div>
    );
  }
);
PermissionItem.displayName = "PermissionItem";
