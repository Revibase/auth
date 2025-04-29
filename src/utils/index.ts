import { ParsedTransaction } from "@/types";
import { DAS } from "@/types/DAS";
import { TransactionActionType } from "@revibase/passkeys-sdk";
import {
  customTransactionMessageDeserialize,
  deserializeConfigActions,
} from "@revibase/sdk";
import { base64URLStringToBuffer } from "@simplewebauthn/browser";
import {
  address,
  Address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getAddressDecoder,
  getBase58Decoder,
  getBase58Encoder,
  getBase64Decoder,
  getBase64Encoder,
  getU64Decoder,
  getUtf8Encoder,
  Rpc,
  sendAndConfirmTransactionFactory,
  SignatureBytes,
  SolanaRpcApi,
  TransactionSigner,
} from "@solana/kit";
const conectionEndpoint = "https://rpc.revibase.com";
export const rpc = createSolanaRpc(conectionEndpoint);
export const rpId = "revibase.com";
export const sendAndConfirm = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.devnet.solana.com"),
});

function createTransactionSigner(
  address: Address,
  sessionToken: { token: string; signature: string }
) {
  return {
    address,
    signTransactions(transactions) {
      return new Promise(async (resolve, reject) => {
        try {
          const signatures = await Promise.all(
            transactions.map(async (x) => {
              const signatureResponse = await fetch(
                "https://payers.revibase.com/sign",
                {
                  method: "POST",
                  body: JSON.stringify({
                    publicKey: address.toString(),
                    transaction: getBase64Decoder().decode(x.messageBytes),
                    ...sessionToken,
                  }),
                }
              );
              if (!signatureResponse.ok) {
                throw new Error(await signatureResponse.text());
              }
              const { signature } = (await signatureResponse.json()) as {
                signature: string;
              };

              if (signature) {
                return getBase64Encoder().encode(signature);
              }
              return;
            })
          );
          resolve(signatures.map((x) => ({ [address]: x as SignatureBytes })));
        } catch (error) {
          reject(error);
        }
      });
    },
  } as TransactionSigner;
}

export function getRandomPayer(sessionToken: {
  token: string;
  signature: string;
}) {
  const payer = address("CrDrYQs5fux37ZfdLeSFPEM6BUFH2WcyrvWm16bGMHMw");

  return createTransactionSigner(payer, sessionToken);
}

export async function createTransactionChallenge({
  rpc,
  transactionActionType,
  transactionAddress,
  transactionMessageBytes,
}: {
  rpc: Rpc<SolanaRpcApi>;
  transactionActionType: TransactionActionType;
  transactionAddress: string;
  transactionMessageBytes: ArrayBuffer;
}) {
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
      deserializedTxMessage = `${
        new URL(redirectUrl).hostname
      } wants to link your passkey to a multisig wallet.`;
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
      deserializedTxMessage = `Closing ${transactionAddress} to reclaim rent fees.`;
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
    vote: { value: "Vote Transaction", variant: "outline" },
    close: { value: "Close Pending Transaction", variant: "destructive" },
    sync: {
      value: "Create And Execute Transaction Synchronously",
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
    transactionMessageBytes: base64URLStringToBuffer(transactionMessageBytes),
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
  const response = await fetch(conectionEndpoint, {
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
      } as DAS.GetAssetRequest,
    }),
  });

  const jsonResponse = (await response.json()) as {
    result?: DAS.GetAssetResponse;
  };

  return jsonResponse.result ?? null;
}

export const SOL_NATIVE_MINT = (
  nativeBalance?:
    | {
        lamports: number;
        price_per_sol: number;
        total_price: number;
      }
    | undefined
) => {
  return {
    compression: {
      compressed: false,
    },
    content: {
      json_uri: "",
      links: {
        image:
          "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      },
      metadata: { name: "Solana", symbol: "SOL", description: "" },
    },
    id: "native_sol",
    interface: "Custom",
    token_info: {
      supply: 500_000_000, // any number than is more than 1 will do to show that it is fungible
      decimals: 9,
      price_info: {
        currency: "USDC",
        price_per_token: nativeBalance?.price_per_sol || 0,
      },
      balance: nativeBalance?.lamports,
      symbol: "SOL",
      token_program: "",
    },
  } as DAS.GetAssetResponse;
};

export function proxify(imageUrl?: string) {
  return imageUrl ? `https://proxy.revibase.com/?image=${imageUrl}` : "";
}
