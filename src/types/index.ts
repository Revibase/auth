import {
  ConfigAction,
  CustomTransactionMessage,
  TransactionActionType,
} from "@revibase/wallet-sdk";
import { Address } from "@solana/kit";

export interface PasskeyPayload {
  credentialId: string;
  username: string;
  publicKey: string;
  transports?: string;
}
export interface SessionToken {
  token: string;
  signature: string;
}

export type MessagePayload = {
  type: "message";
  payload: string;
};

export type ParsedTransaction = {
  transactionActionType: TransactionActionType;
  label: {
    value: string;
    variant: "default" | "outline" | "secondary" | "destructive";
  };
  transactionAddress: string;
  transactionMessageBytes: Uint8Array;
  deserializedTxMessage:
    | ConfigAction[]
    | string
    | null
    | IntentPayload
    | CustomTransactionMessage;
};

export type IntentPayload = {
  amount: bigint;
  destination: Address;
  mint: Address;
};
export type TransactionPayload = {
  type: "transaction";
  payload: string;
} & ParsedTransaction;

export type DataPayload = MessagePayload | TransactionPayload;
