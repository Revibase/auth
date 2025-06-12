import { ParsedTransaction } from "@/types";
import {
  customTransactionMessageDeserialize,
  deserializeConfigActions,
  TransactionActionType,
} from "@revibase/wallet-sdk";
import { base64URLStringToBuffer } from "@simplewebauthn/browser";
import {
  address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getAddressDecoder,
  getBase58Decoder,
  getBase58Encoder,
  getBase64Decoder,
  getBase64Encoder,
  getTransactionEncoder,
  getU64Decoder,
  getUtf8Encoder,
  sendAndConfirmTransactionFactory,
  SignatureBytes,
  TransactionSigner,
} from "@solana/kit";
import {
  CONNECTION_RPC_ENDPOINT,
  PAYERS_ENDPOINT,
  PROXY_IMAGE_ENDPOINT,
} from "./consts";

export const rpc = createSolanaRpc(CONNECTION_RPC_ENDPOINT);

export const sendAndConfirm = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions: createSolanaRpcSubscriptions(
    "wss://" + new URL(CONNECTION_RPC_ENDPOINT).hostname
  ),
});

async function fetchRandomPayer() {
  const result = await fetch(`${PAYERS_ENDPOINT}`);
  return (await result.text()).replace(/"/g, "");
}

export async function getRandomPayer(): Promise<TransactionSigner> {
  const payer = await fetchRandomPayer();
  return {
    address: address(payer),
    signTransactions(transactions) {
      return new Promise(async (resolve, reject) => {
        try {
          const signatureResponse = await fetch(`${PAYERS_ENDPOINT}/sign`, {
            method: "POST",
            body: JSON.stringify({
              publicKey: payer,
              transactions: transactions.map((x) =>
                getBase64Decoder().decode(getTransactionEncoder().encode(x))
              ),
            }),
          });
          if (!signatureResponse.ok) {
            throw new Error(await signatureResponse.text());
          }
          const { signatures } = (await signatureResponse.json()) as {
            signatures: string[];
          };
          resolve(
            signatures.map((x) => ({
              [address(payer)]: getBase58Encoder().encode(x) as SignatureBytes,
            }))
          );
        } catch (error) {
          reject(error);
        }
      });
    },
  };
}

export async function createTransactionChallenge({
  transactionActionType,
  transactionAddress,
  transactionMessageBytes,
}: Omit<ParsedTransaction, "deserializedTxMessage" | "label">) {
  const slotSysvarData = (
    await rpc
      .getAccountInfo(address("SysvarS1otHashes111111111111111111111111111"), {
        encoding: "base64",
        commitment: "processed",
      })
      .send()
  ).value?.data;
  if (!slotSysvarData) {
    throw new Error("Unable to fetch slot sysvar");
  }
  const slotHashData = getBase64Encoder().encode(slotSysvarData[0]);
  const slotNumber = getU64Decoder()
    .decode(slotHashData.subarray(8, 16))
    .toString();
  const slotHashBytes = slotHashData.subarray(16, 48);
  const slotHash = getBase58Decoder().decode(slotHashBytes);
  const challenge = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([
        ...new Uint8Array(getUtf8Encoder().encode(transactionActionType)),
        ...getBase58Encoder().encode(transactionAddress),
        ...new Uint8Array(
          transactionActionType !== "close"
            ? await crypto.subtle.digest("SHA-256", transactionMessageBytes)
            : transactionMessageBytes
        ),
        ...slotHashBytes,
      ])
    )
  );
  return { slotNumber, slotHash, challenge };
}

function deserializeIntent(buffer: Uint8Array, isNative: boolean) {
  const amount = getU64Decoder().decode(buffer.subarray(0, 8));
  const destination = getAddressDecoder().decode(buffer.subarray(8, 40));
  const mint = isNative
    ? getAddressDecoder().decode(buffer.subarray(40))
    : getAddressDecoder().decode(buffer.subarray(40));
  return { amount, destination, mint };
}

export const parsedTransaction = (
  transaction: string,
  redirectUrl: string
): ParsedTransaction => {
  const { transactionActionType, transactionAddress, transactionMessageBytes } =
    JSON.parse(transaction) as {
      transactionActionType: TransactionActionType;
      transactionAddress: string;
      transactionMessageBytes: string;
    };
  let deserializedTxMessage;
  switch (transactionActionType) {
    case "add_new_member":
      deserializedTxMessage = `${new URL(redirectUrl).hostname}`;
      break;
    case "change_config":
      deserializedTxMessage = deserializeConfigActions(
        new Uint8Array(base64URLStringToBuffer(transactionMessageBytes))
      );
      break;
    case "native_transfer_intent":
      deserializedTxMessage = deserializeIntent(
        new Uint8Array(base64URLStringToBuffer(transactionMessageBytes)),
        true
      );
      break;
    case "token_transfer_intent":
      deserializedTxMessage = deserializeIntent(
        new Uint8Array(base64URLStringToBuffer(transactionMessageBytes)),
        false
      );
      break;
    case "close":
      deserializedTxMessage = `Closing transaction ${transactionAddress} to reclaim rent fees.`;
      break;
    default:
      deserializedTxMessage = customTransactionMessageDeserialize(
        new Uint8Array(base64URLStringToBuffer(transactionMessageBytes))
      );
      break;
  }

  const typeMap: Record<
    TransactionActionType,
    {
      value: string;
      variant: "default" | "outline" | "secondary" | "destructive";
    }
  > = {
    create: {
      value: "Create Transaction",
      variant: "default",
    },
    create_with_permissionless_execution: {
      value: "Create And Execute Transaction",
      variant: "default",
    },
    execute: {
      value: "Execute Transaction",
      variant: "default",
    },
    vote: { value: "Approve Transaction", variant: "outline" },
    close: { value: "Close Transaction", variant: "destructive" },
    sync: {
      value: "Create And Execute Transaction (Sync)",
      variant: "default",
    },
    change_config: { value: "Change Config", variant: "default" },
    add_new_member: {
      value: "Add New Passkey Member",
      variant: "secondary",
    },
    native_transfer_intent: {
      value: "Transfer Solana Request",
      variant: "default",
    },
    token_transfer_intent: {
      value: "Transfer Token Request",
      variant: "default",
    },
  };

  return {
    transactionActionType,
    label: typeMap[transactionActionType],
    transactionAddress,
    transactionMessageBytes: new Uint8Array(
      base64URLStringToBuffer(transactionMessageBytes)
    ),
    deserializedTxMessage,
  };
};

export function isValidUrl(url: string | undefined | null) {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function getAsset(assetId: string | null | undefined) {
  if (!assetId) return null;
  const response = await fetch(CONNECTION_RPC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "getAsset",
      params: {
        id: assetId,
      },
    }),
  });

  const jsonResponse = (await response.json()) as {
    result?: any;
  };

  return jsonResponse.result ?? null;
}

export function proxify(imageUrl?: string) {
  return imageUrl ? `${PROXY_IMAGE_ENDPOINT}?image=${imageUrl}` : "";
}
