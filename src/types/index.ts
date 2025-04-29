import { TransactionActionType } from "@revibase/passkeys-sdk";
import { ConfigAction, CustomTransactionMessage } from "@revibase/sdk";
import { Address } from "@solana/kit";

export interface SessionToken {
  token: string;
  signature: string;
}

export interface Payload {
  credentialId: string;
  username: string;
  publicKey: string;
  transports?: string;
}
export interface SessionToken {
  token: string;
  signature: string;
}

export type Message = {
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
  transactionMessageBytes: ArrayBuffer;
  deserializedTxMessage:
    | ConfigAction[]
    | string
    | null
    | Intent
    | CustomTransactionMessage;
};

export type Intent = {
  amount: bigint;
  destination: Address;
  mint: Address;
};
export type Transaction = {
  type: "transaction";
  payload: string;
} & ParsedTransaction;

export type Data = Message | Transaction;
