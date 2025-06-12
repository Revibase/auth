import { PasskeyPayload } from "@/types";
import {
  createTransactionChallenge,
  DATABASE_ENDPOINT,
  getRandomPayer,
  RP_ID,
  RP_NAME,
  rpc,
  sendAndConfirm,
} from "@/utils";
import {
  convertSignatureDERtoRS,
  createWallet,
  getDomainConfig,
  getSecp256r1PubkeyDecoder,
  getSettingsFromCreateKey,
  Secp256r1Key,
} from "@revibase/wallet-sdk";
import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  PublicKeyCredentialHint,
  RegistrationResponseJSON,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Encoder,
  getUtf8Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { useCallback, useState } from "react";

export const useRegistration = ({
  username,
  hints,
  message,
  shouldCreateWallet,
}: {
  username: string;
  shouldCreateWallet: boolean;
  hints?: PublicKeyCredentialHint[];
  message?: string;
}) => {
  const [createWalletArgs, setCreateWalletArgs] = useState<{
    publicKey: string;
    authResponse: RegistrationResponseJSON;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [registrationStage, setRegistrationStage] = useState<
    | "input"
    | "registering"
    | "creating"
    | "complete"
    | "registration-error"
    | "wallet-error"
    | "wallet-prompt"
  >("input");

  const handleCreateWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!createWalletArgs) {
        throw new Error("Missing response or session token");
      }

      // Show the creating wallet loading screen
      setRegistrationStage("creating");

      const createKey = crypto.getRandomValues(new Uint8Array(32));
      const settings = await getSettingsFromCreateKey(createKey);
      const { slotNumber, slotHash, challenge } =
        await createTransactionChallenge({
          transactionActionType: "add_new_member",
          transactionAddress: settings.toString(),
          transactionMessageBytes: new Uint8Array(
            getUtf8Encoder().encode(RP_ID)
          ),
        });

      const assertionResponse = await startAuthentication({
        optionsJSON: {
          rpId: RP_ID,
          challenge: bufferToBase64URLString(challenge.buffer as ArrayBuffer),
          allowCredentials: [
            {
              type: "public-key",
              id: createWalletArgs.authResponse.id,
              transports: createWalletArgs.authResponse.response.transports,
            },
          ],
        },
      });

      const authData = new Uint8Array(
        base64URLStringToBuffer(assertionResponse.response.authenticatorData)
      );

      const clientDataJson = new Uint8Array(
        base64URLStringToBuffer(assertionResponse.response.clientDataJSON)
      );

      const convertedSignature = convertSignatureDERtoRS(
        new Uint8Array(
          base64URLStringToBuffer(assertionResponse.response.signature)
        )
      );

      const domainConfig = await getDomainConfig({
        rpIdHash: authData.subarray(0, 32),
      });

      const feePayer = await getRandomPayer();
      const createWalletIxs = await createWallet({
        createKey,
        feePayer,
        initialMember: new Secp256r1Key(createWalletArgs.publicKey, {
          verifyArgs: {
            clientDataJson,
            publicKey: getSecp256r1PubkeyDecoder().decode(
              getBase58Encoder().encode(createWalletArgs.publicKey)
            ),
            slotNumber: BigInt(slotNumber),
            slotHash: new Uint8Array(getBase58Encoder().encode(slotHash)),
          },
          authData,
          domainConfig,
          signature: convertedSignature,
        }),
      });

      const latestBlockHash = await rpc.getLatestBlockhash().send();
      const tx = await pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => appendTransactionMessageInstructions(createWalletIxs, tx),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(
            latestBlockHash.value,
            tx
          ),
        async (tx) => await signTransactionMessageWithSigners(tx)
      );

      await sendAndConfirm(tx, {
        commitment: "confirmed",
      });

      setResponse(
        JSON.stringify({
          publicKey: createWalletArgs.publicKey,
          username,
          authResponse: createWalletArgs.authResponse,
        })
      );

      setRegistrationStage("complete");
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("wallet-error");
    } finally {
      setLoading(false);
    }
  }, [createWalletArgs, username]);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Webauthn register
      setRegistrationStage("registering");
      const result = await fetch(
        `${DATABASE_ENDPOINT}?username=${username}&challenge=true${
          message ? `&message=${encodeURIComponent(message)}` : ""
        }`
      );
      if (result.status !== 200) {
        throw new Error(await result.text());
      }
      const { challenge } = (await result.json()) as {
        challenge: string;
      };
      const response = await startRegistration({
        optionsJSON: {
          hints,
          rp: { id: RP_ID, name: RP_NAME },
          challenge,
          user: {
            id: bufferToBase64URLString(
              new TextEncoder().encode(username).buffer as ArrayBuffer
            ),
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            userVerification: "discouraged",
            requireResidentKey: true,
            residentKey: "required",
          },
        },
      });
      const request = await fetch(DATABASE_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          username,
          response,
        }),
      });
      if (request.status !== 200) {
        throw new Error(await request.text());
      }
      const payload = (await request.json()) as PasskeyPayload;

      if (shouldCreateWallet) {
        setCreateWalletArgs({ ...payload, authResponse: response });
        setRegistrationStage("wallet-prompt");
      } else {
        setResponse(
          JSON.stringify({
            publicKey: payload.publicKey,
            username,
            authResponse: response,
          })
        );
        setRegistrationStage("complete");
      }
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("registration-error");
    } finally {
      setLoading(false);
    }
  }, [username, hints, message]);

  const resetToInput = useCallback(() => {
    setError(null);
    setRegistrationStage("input");
    setLoading(false);
  }, []);

  return {
    registrationStage,
    loading,
    error,
    response,
    handleRegister,
    handleCreateWallet,
    resetToInput,
  };
};
