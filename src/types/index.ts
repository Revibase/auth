import { TransactionActionType } from "@revibase/passkeys-sdk";
import { ConfigAction, CustomTransactionMessage } from "@revibase/sdk";

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

type Message = {
  type: "message" | "chainedTransaction";
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
  deserializedTxMessage: ConfigAction[] | CustomTransactionMessage | null;
};

type Transaction = { type: "transaction"; payload: string } & ParsedTransaction;

export type Data = Message | Transaction;
