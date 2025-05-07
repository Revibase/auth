"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Data, Intent, Payload, Transaction } from "@/types";
import { DAS } from "@/types/DAS";
import { getAsset, proxify, rpc, SOL_NATIVE_MINT } from "@/utils";
import {
  ConfigAction,
  fetchDelegateData,
  getMemberKeyString,
  getMultiWalletFromSettings,
  KeyType,
  MemberKey,
  MemberKeyWithPermissionsArgs,
  Permission,
  Permissions,
  Secp256r1Key,
} from "@revibase/sdk";
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
import { useEffect, useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Skeleton } from "./ui/skeleton";

interface TransactionDetailsProps {
  data: Data | null;
  publicKey: string;
  isLoading: boolean;
  additionalInfo?: any;
}

function TransactionSkeleton() {
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
}

export function TransactionDetails({
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
      className="space-y-2"
    >
      <ScrollArea className="h-[300px] w-full">
        <MessageContent
          data={data}
          additionalInfo={additionalInfo}
          publicKey={publicKey}
        />
      </ScrollArea>
    </motion.div>
  );
}

function MessageContent({
  data,
  publicKey,
  additionalInfo,
}: {
  data: Data;
  publicKey: string;
  additionalInfo: TransactionDetailsProps["additionalInfo"];
}) {
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
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
          <CardContent>
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
          </CardContent>
        </Card>
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
          intent={data.deserializedTxMessage as Intent}
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

function ConfigActionsList({ actions }: { actions: ConfigAction[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
        <Settings className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500" />
        Configuration Actions ({actions.length})
      </div>
      {actions.map((action, index) => (
        <ConfigActionItem key={index} action={action} />
      ))}
    </div>
  );
}

function ConfigActionItem({ action }: { action: ConfigAction }) {
  const [isOpen, setIsOpen] = useState(false);

  // Get icon based on action kind
  const getActionIcon = () => {
    switch (action.__kind) {
      case "EditPermissions":
        return (
          <Settings className="h-4 w-4 text-slate-600 dark:text-slate-500" />
        );

      case "AddMembers":
        return (
          <UserPlus className="h-4 w-4 text-green-600 dark:text-green-500" />
        );
      case "RemoveMembers":
        return <UserMinus className="h-4 w-4 text-red-600 dark:text-red-500" />;
      case "SetThreshold":
        return (
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        );
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border rounded-md border-slate-200 dark:border-slate-800"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm font-medium text-left">
        <div className="flex items-center">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 mr-2 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 mr-2 text-slate-500" />
          )}
          <div className="flex items-center gap-2">
            {getActionIcon()}
            <Badge variant="outline" className="text-xs">
              {action.__kind}
            </Badge>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 pt-0 text-sm border-t border-slate-200 dark:border-slate-800">
        <ConfigActionContent action={action} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function ConfigActionContent({ action }: { action: ConfigAction }) {
  switch (action.__kind) {
    case "EditPermissions":
      return (
        <MembersDisplay members={action.fields[0]} actionKind={action.__kind} />
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
        <div className="p-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            New Threshold Value
          </div>
          <div className="font-mono text-sm mt-1 text-slate-800 dark:text-slate-200">
            {action.fields[0]}
          </div>
        </div>
      );
  }
}

function AddMemberDisplay({ data }: { data: Transaction }) {
  const [multiWallet, setMultiWallet] = useState("");
  useEffect(() => {
    getMultiWalletFromSettings(address(data.transactionAddress)).then(
      (response) => setMultiWallet(response)
    );
  }, [data]);

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950">
          <UserPlus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        {data.label.value}
      </div>

      <Card className="overflow-hidden border-0 shadow-md dark:shadow-slate-950/20">
        <CardContent className="p-0">
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
                    {formatAddress(multiWallet.toString())}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pl-9.5">
              This allows you to co-sign transactions on behalf of the wallet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MembersDisplay({
  members,
  actionKind,
}: {
  members: MemberKeyWithPermissionsArgs[];
  actionKind: "AddMembers" | "EditPermissions";
}) {
  if (members.length === 0) {
    return (
      <div className="p-2 text-slate-500 dark:text-slate-400">
        No members specified
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {actionKind === "EditPermissions" ? "Editing" : "Adding"}{" "}
        {members.length} Member
        {members.length !== 1 ? "s" : ""}
      </div>
      {members.map((memberWithArgs, index) => (
        <Collapsible
          key={index}
          className="border rounded-md border-slate-200 dark:border-slate-800"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-left">
            <div className="flex items-center">
              <Users className="h-3.5 w-3.5 mr-2 text-slate-600 dark:text-slate-400" />
              <span>Member {index + 1}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Type:{" "}
              {KeyType.Ed25519 === memberWithArgs.pubkey.keyType
                ? "Solana Wallet Address"
                : "Passkey"}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-2 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Public Key
                </div>
                <div className="mt-1">
                  <KeyDisplay memberKey={memberWithArgs.pubkey} />
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Permissions
                </div>
                <div className="mt-1 grid grid-cols-1 gap-1">
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
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

function MemberKeysDisplay({ memberKeys }: { memberKeys: MemberKey[] }) {
  if (memberKeys.length === 0) {
    return (
      <div className="p-2 text-slate-500 dark:text-slate-400">
        No member keys specified
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Removing {memberKeys.length} Member{memberKeys.length !== 1 ? "s" : ""}
      </div>
      {memberKeys.map((memberKey, index) => (
        <div
          key={index}
          className="border rounded-md border-slate-200 dark:border-slate-800 p-2"
        >
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Member Key {index + 1}
          </div>
          <KeyDisplay memberKey={memberKey} />
        </div>
      ))}
    </div>
  );
}

function KeyDisplay({ memberKey }: { memberKey: MemberKey }) {
  // Convert Uint8Array to hex string for display
  const keyHex = getMemberKeyString(memberKey);
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
}

function IntentDisplay({
  publicKey,
  intent,
  additionalInfo,
}: {
  publicKey: string;
  intent: Intent;
  additionalInfo: TransactionDetailsProps["additionalInfo"];
}) {
  const [asset, setAsset] = useState<DAS.GetAssetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>();
  const [sender, setSender] = useState<string>();

  useEffect(() => {
    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (intent.mint.toString() === "11111111111111111111111111111111") {
          const wSol = await getAsset(
            address("So11111111111111111111111111111111111111112")
          );
          setAsset(
            SOL_NATIVE_MINT({
              lamports: 0,
              price_per_sol: wSol?.token_info?.price_info?.price_per_token || 0,
              total_price: 0,
            })
          );
        } else {
          setAsset(await getAsset(intent.mint.toString()));
        }
      } catch (error) {
        setError("Failed to load token information");
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [intent.mint]);

  useEffect(() => {
    const fetchUsername = async () => {
      setIsLoadingUsername(true);
      try {
        if (!additionalInfo?.recipient && !publicKey) {
          setIsLoadingUsername(false);
          return;
        }

        const { recipient } = additionalInfo;
        const delegateData = await fetchDelegateData(
          rpc,
          new Secp256r1Key(recipient)
        );

        if (delegateData && delegateData.multiWallet === intent.destination) {
          try {
            const response = await fetch(
              `https://passkeys.revibase.com?publicKey=${recipient}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = (await response.json()) as Payload;
            if (result.username) {
              setRecipient(result.username);
            }
          } catch (fetchError) {
            console.error("Error fetching username:", fetchError);
            // Silently fail and keep using the address
          }
        }

        if (publicKey) {
          try {
            const response = await fetch(
              `https://passkeys.revibase.com?publicKey=${publicKey}`
            );

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = (await response.json()) as Payload;
            if (result.username) {
              setSender(result.username);
            }
          } catch (fetchError) {
            console.error("Error fetching username:", fetchError);
            // Silently fail and keep using the address
          }
        }
      } catch (error) {
        console.error("Error in username resolution:", error);
        // Silently fail and keep using the address
      } finally {
        setIsLoadingUsername(false);
      }
    };

    fetchUsername();
  }, [additionalInfo, intent.destination, publicKey]);

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

  const tokenSymbol = asset?.content?.metadata.symbol ?? "";
  const tokenName = asset?.content?.metadata.name || "Unknown Token";
  const tokenImage = proxify(asset?.content?.links?.image);

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  if (error) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-5">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">Transaction Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

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
              {sender ?? "Your Wallet"}
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
              recipient && (
                <div className="font-medium text-sm text-primary">
                  {recipient}
                </div>
              )
            )}
            <div className="text-xs text-muted-foreground font-mono">
              {formatAddress(intent.destination)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ObjectDisplay({
  data,
  level = 0,
  excludeKeys = [],
}: {
  data: any;
  level?: number;
  excludeKeys?: string[];
}) {
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

function PropertyItem({
  name,
  value,
  level,
}: {
  name: string;
  value: any;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isUint8Array =
    value instanceof Uint8Array ||
    (value && value.buffer instanceof ArrayBuffer);

  if (isUint8Array) {
    // Convert Uint8Array to hex string for display
    const hexValue = Array.from(new Uint8Array(value.buffer || value))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

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

function PermissionItem({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center">
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
            ? "text-slate-800 dark:text-slate-200"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {name}
      </span>
    </div>
  );
}
