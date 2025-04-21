"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Payload, SessionToken } from "@/types";
import {
  createTransactionChallenge,
  getRandomPayer,
  rpc,
  rpId,
  sendAndConfirm,
} from "@/utils";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  convertSignatureDERtoRS,
  type TransactionActionType,
} from "@revibase/passkeys-sdk";
import {
  createWallet,
  customTransactionMessageDeserialize,
  deserializeConfigActions,
  getDomainConfig,
  getSettingsFromCreateKey,
  Permissions,
  Secp256r1Key,
  Secp256r1VerifyArgs,
} from "@revibase/sdk";
import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  PublicKeyCredentialHint,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressDecoder,
  getBase58Encoder,
  getUtf8Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  // Extract parameters first
  const redirectUrl = searchParams.get("redirectUrl");
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [message, setMessage] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [transaction, setTransaction] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [hints, setHints] = useState<PublicKeyCredentialHint[]>();
  // Validate redirect URL once
  const isValidUrl = useMemo(() => {
    if (!redirectUrl) return false;
    try {
      new URL(redirectUrl);
      return true;
    } catch {
      setError(`Redirect Url is invalid. Received: ${redirectUrl}`);
      return false;
    }
  }, [redirectUrl]);

  // receive payload from parent frame
  useEffect(() => {
    if (!isValidUrl || !redirectUrl) return;
    const origin = new URL(redirectUrl).origin;
    const handleMessage = (event: MessageEvent) => {
      if (!event.isTrusted || event.origin !== origin) {
        return;
      }
      if (event.data.type === "popup-init") {
        const {
          message = "",
          publicKey = "",
          transaction = "",
          isRegister = false,
          hints = undefined,
        } = event.data.payload;
        setMessage(message);
        setPublicKey(publicKey);
        setTransaction(transaction);
        setIsRegister(isRegister);
        setHints(hints);
      }
    };

    const handleCloseEvent = () => {
      if (window.opener) {
        window.opener.postMessage({ type: "popup-closed" }, origin);
      } else if (window.parent) {
        window.parent.postMessage({ type: "popup-closed" }, origin);
      }
    };
    const interval = setInterval(() => {
      if (window.opener) {
        window.opener.postMessage({ type: "popup-heartbeat" }, origin);
      } else if (window.parent) {
        window.parent.postMessage({ type: "popup-heartbeat" }, origin);
      }
    }, 2000);
    window.addEventListener("pagehide", handleCloseEvent);
    window.addEventListener("unload", handleCloseEvent);
    window.addEventListener("message", handleMessage);
    if (window.opener) {
      window.opener.postMessage({ type: "popup-ready" }, origin);
    } else if (window.parent) {
      window.parent.postMessage({ type: "popup-ready" }, origin);
    }
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("unload", handleCloseEvent);
      window.removeEventListener("pagehide", handleCloseEvent);
      clearInterval(interval);
    };
  }, [isValidUrl, redirectUrl]);

  // Parse transaction to make it readable
  const parsedTransaction = useMemo(() => {
    if (!transaction) return null;
    try {
      const {
        transactionActionType,
        transactionAddress,
        transactionMessageBytes,
      } = JSON.parse(transaction) as {
        transactionActionType: TransactionActionType;
        transactionAddress: string;
        transactionMessageBytes: string;
      };
      const deserializedTxMessage =
        transactionActionType === "add_new_member"
          ? null
          : transactionActionType === "change_config"
          ? deserializeConfigActions(
              new Uint8Array(base64URLStringToBuffer(transactionMessageBytes))
            )
          : customTransactionMessageDeserialize(
              new Uint8Array(base64URLStringToBuffer(transactionMessageBytes))
            );
      const typeMap: Record<
        TransactionActionType,
        {
          value: string;
          variant: "default" | "outline" | "secondary" | "destructive";
        }
      > = {
        create: { value: "Create And Execute Transaction", variant: "default" },
        execute: { value: "Execute Transaction", variant: "default" },
        vote: { value: "Vote", variant: "outline" },
        close: { value: "Close", variant: "destructive" },
        sync: { value: "Create And Execute Transaction", variant: "default" },
        change_config: { value: "Change Config", variant: "default" },
        add_new_member: {
          value: "Add New Passkey Member",
          variant: "secondary",
        },
      };

      return {
        transactionActionType,
        label: typeMap[transactionActionType],
        transactionAddress,
        transactionMessageBytes: base64URLStringToBuffer(
          transactionMessageBytes
        ),
        deserializedTxMessage,
      };
    } catch (error) {
      return null;
    }
  }, [transaction]);

  // simulate the transaction outcome to the user
  const parsedMessage = useMemo(() => {
    if (!redirectUrl) return null;
    if (message) {
      return message;
    } else if (parsedTransaction) {
      switch (parsedTransaction.transactionActionType) {
        case "add_new_member":
          return `${
            new URL(redirectUrl).hostname
          } wants to link your passkey to a multisig wallet.`;
        default:
          return JSON.stringify(
            parsedTransaction.deserializedTxMessage,
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value
          );
      }
    }
    return null;
  }, [message, parsedTransaction, redirectUrl]);

  // Sign-in logic
  const authenticateWithPasskey = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let payload: Payload | null = null;
      let challenge: Uint8Array | null = null;
      let slotHash: string | null = null;
      let slotNumber: string | null = null;

      if (publicKey) {
        const response = await fetch(
          `https://passkeys.revibase.com?publicKey=${publicKey}`
        );
        const result = (await response.json()) as Payload;
        if (result.publicKey && publicKey !== result.publicKey) {
          throw new Error("PublicKey mismatch");
        }
        payload = result;
      }

      if (message) {
        challenge = new Uint8Array(getUtf8Encoder().encode(message));
      } else if (parsedTransaction) {
        ({ slotNumber, slotHash, challenge } = await createTransactionChallenge(
          { rpc, ...parsedTransaction }
        ));
      }

      if (!challenge) throw new Error("Invalid challenge message.");

      const assertionResponse = await startAuthentication({
        optionsJSON: {
          rpId,
          challenge: bufferToBase64URLString(challenge.buffer as ArrayBuffer),
          allowCredentials: payload?.credentialId
            ? [{ type: "public-key", id: payload.credentialId }]
            : [],
          hints,
        },
      });

      if (!payload) {
        const response = await fetch(
          `https://passkeys.revibase.com?credentialId=${assertionResponse.id}`
        );
        const result = (await response.json()) as Payload;
        payload = result;
      }

      if (!payload) throw new Error("Passkey is not registered.");

      setResponse(
        JSON.stringify({
          ...assertionResponse,
          ...payload,
          slotNumber,
          slotHash,
        })
      );
    } catch (err) {
      const errorCode = err instanceof WebAuthnError ? err.code : null;
      if (errorCode !== "ERROR_CEREMONY_ABORTED" || errorCode === null) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, message, parsedTransaction]);

  // Countdown logic
  useEffect(() => {
    if (!response) return;
    const interval = setInterval(
      () => setCountdown((prev) => Math.max(prev - 1, 0)),
      1000
    );
    return () => clearInterval(interval);
  }, [response]);

  useEffect(() => {
    if (countdown <= 2) {
      handleRedirectNow();
    }
  }, [countdown]);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && response) {
      if (window.opener) {
        window.opener.postMessage(
          { type: "popup-authentication-complete", payload: response },
          redirectUrl
        );
      } else if (window.parent) {
        window.parent.postMessage(
          { type: "popup-authentication-complete", payload: response },
          redirectUrl
        );
      }
    }
  }, [redirectUrl, response]);

  if (isRegister) {
    return <RegistrationPage hints={hints} redirectUrl={redirectUrl} />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <Card className="w-full shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-4 items-center justify-center pb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            </div>

            <div className="space-y-1 text-center">
              {redirectUrl && isValidUrl && (
                <CardTitle className="text-base font-medium text-center">
                  <a
                    className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    href={redirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {new URL(redirectUrl).hostname}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </CardTitle>
              )}
            </div>
            {redirectUrl && isValidUrl && (
              <div className="w-full">
                <h2 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Signature Request from {new URL(redirectUrl).origin}
                </h2>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedTransaction?.label && (
              <div className="flex justify-center">
                <Badge
                  variant={parsedTransaction.label.variant}
                  className="px-3 py-1 text-sm"
                >
                  {parsedTransaction.label.value}
                </Badge>
              </div>
            )}
            {parsedMessage && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[200px]">
                <p className="text-sm text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap font-mono">
                  {parsedMessage}
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words whitespace-pre-wrap">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pt-2">
            {response ? (
              <div className="w-full text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Authentication Successful</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Redirecting...
                </p>
                {countdown === 0 && (
                  <Button
                    variant="link"
                    onClick={handleRedirectNow}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    Redirect now
                  </Button>
                )}
              </div>
            ) : (
              <Button
                onClick={authenticateWithPasskey}
                disabled={loading || !parsedMessage || !isValidUrl}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Continue with Passkey
                  </span>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

const RegistrationPage: FC<{
  redirectUrl: string | null;
  hints?: PublicKeyCredentialHint[];
}> = ({ redirectUrl, hints }) => {
  const [sessionToken, setSessionToken] = useState<SessionToken | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pubKey, setPubkey] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  // Countdown logic
  useEffect(() => {
    if (!pubKey) return;
    const interval = setInterval(
      () => setCountdown((prev) => Math.max(prev - 1, 0)),
      1000
    );
    return () => clearInterval(interval);
  }, [pubKey]);

  useEffect(() => {
    if (countdown <= 2) {
      handleRedirectNow();
    }
  }, [countdown]);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && username && pubKey) {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "popup-registration-complete",
            payload: JSON.stringify({
              username,
              publicKey: pubKey,
            }),
          },
          redirectUrl
        );
      } else if (window.parent) {
        window.parent.postMessage(
          {
            type: "popup-registration-complete",
            payload: JSON.stringify({
              username,
              publicKey: pubKey,
            }),
          },
          redirectUrl
        );
      }
    }
  }, [redirectUrl, username, pubKey]);

  const handleCreateWallet = useCallback(
    async (publicKey: string, credentialId: string) => {
      try {
        if (!sessionToken) {
          throw new Error("Session Token is null");
        }
        const feePayer = getRandomPayer(sessionToken);
        const createKey = getAddressDecoder().decode(
          crypto.getRandomValues(new Uint8Array(32))
        );
        const settings = await getSettingsFromCreateKey(createKey);
        const { slotNumber, slotHash, challenge } =
          await createTransactionChallenge({
            rpc,
            transactionActionType: "add_new_member",
            transactionAddress: settings,
            transactionMessageBytes: new TextEncoder().encode(rpId)
              .buffer as ArrayBuffer,
          });
        const { response } = await startAuthentication({
          optionsJSON: {
            rpId,
            challenge: bufferToBase64URLString(challenge.buffer as ArrayBuffer),
            allowCredentials: [{ type: "public-key", id: credentialId }],
            hints,
          },
        });

        const authData = new Uint8Array(
          base64URLStringToBuffer(response.authenticatorData)
        );

        const clientDataJson = new Uint8Array(
          base64URLStringToBuffer(response.clientDataJSON)
        );

        const signature = convertSignatureDERtoRS(
          new Uint8Array(base64URLStringToBuffer(response.signature))
        );

        const truncatedAuthData = authData.subarray(32, authData.length);

        const verifyArgs: Secp256r1VerifyArgs = {
          signature,
          pubkey: getBase58Encoder().encode(publicKey),
          truncatedAuthData,
          clientDataJson,
          slotNumber: BigInt(slotNumber),
          slotHash: getBase58Encoder().encode(slotHash),
        };

        const domainConfig = await getDomainConfig({ rpId });

        const createWalletIx = await createWallet({
          createKey,
          feePayer,
          initialMembers: [
            {
              pubkey: new Secp256r1Key(publicKey, verifyArgs, domainConfig),
              permissions: Permissions.all(),
              metadata: domainConfig,
            },
          ],
          metadata: null,
        });

        const latestBlockHash = await rpc.getLatestBlockhash().send();
        const tx = await pipe(
          createTransactionMessage({ version: 0 }),
          (tx) => appendTransactionMessageInstructions([createWalletIx], tx),
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
        setPubkey(publicKey);
      } catch (error) {
        throw error;
      }
    },
    [sessionToken, hints]
  );

  const handleRegister = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetch(
        `https://passkeys.revibase.com?username=${username}&challenge=true`
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
          rp: { id: rpId, name: "Revibase" },
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
            userVerification: "preferred",
            requireResidentKey: true,
            residentKey: "required",
          },
        },
      });
      const request = await fetch(`https://passkeys.revibase.com`, {
        method: "POST",
        body: JSON.stringify({
          username,
          response,
        }),
      });
      if (request.status !== 200) {
        throw new Error(await request.text());
      }
      const { publicKey, credentialId } = (await request.json()) as {
        publicKey: string;
        credentialId: string;
      };
      await handleCreateWallet(publicKey, credentialId);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [username, handleCreateWallet, hints]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <Card className="w-full shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-4 items-center justify-center pb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="space-y-1 text-center">
              <CardTitle className="text-lg font-semibold text-center">
                Create a new account
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Enter a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || !!pubKey}
                className="h-10"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="break-words whitespace-pre-wrap">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {pubKey && (
              <div className="w-full text-center space-y-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Account Created!</span>
                </div>
                {redirectUrl && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Redirecting...
                  </p>
                )}
              </div>
            )}

            <div className="w-full flex justify-center">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_TOKEN!}
                onExpire={() => {
                  setSessionToken(null);
                }}
                onSuccess={async (token) => {
                  const result = await fetch(
                    "https://keys.revibase.com/verify",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        "cf-turnstile-response": token,
                      }),
                    }
                  );
                  if (result.ok) {
                    const { token, signature } = (await result.json()) as {
                      token: string;
                      signature: string;
                    };
                    setSessionToken({ token, signature });
                  }
                }}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pt-2">
            {!pubKey && (
              <Button
                onClick={() => handleRegister()}
                disabled={loading || !username.trim() || !sessionToken}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Create Account
                  </span>
                )}
              </Button>
            )}

            {countdown === 0 && (
              <Button
                onClick={handleRedirectNow}
                disabled={loading}
                className="w-full"
                variant={"outline"}
              >
                Redirect Now
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
