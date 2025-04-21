import { TransactionActionType } from "@revibase/passkeys-sdk";
import {
  address,
  Address,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
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

export const rpc = createSolanaRpc("https://rpc.revibase.com");
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
                "https://keys.revibase.com/sign",
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
          await crypto.subtle.digest("SHA-256", transactionMessageBytes)
        ),
        ...slotHashBytes,
      ])
    )
  );
  return { slotNumber, slotHash, challenge };
}
