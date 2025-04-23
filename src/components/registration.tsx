"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { SessionToken } from "@/types";
import {
  createTransactionChallenge,
  getRandomPayer,
  rpc,
  rpId,
  sendAndConfirm,
} from "@/utils";
import { Turnstile } from "@marsidev/react-turnstile";
import { convertSignatureDERtoRS } from "@revibase/passkeys-sdk";
import {
  createWallet,
  getDomainConfig,
  getSettingsFromCreateKey,
  Permissions,
  Secp256r1Key,
  type Secp256r1VerifyArgs,
} from "@revibase/sdk";
import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  type PublicKeyCredentialHint,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getAddressDecoder,
  getBase58Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";

export const RegistrationPage: FC<{
  redirectUrl: string | null;
  hints?: PublicKeyCredentialHint[];
}> = ({ redirectUrl, hints }) => {
  const [sessionToken, setSessionToken] = useState<SessionToken | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pubKey, setPubkey] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(2);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [registrationStage, setRegistrationStage] = useState<
    "input" | "creating" | "verifying" | "complete"
  >("input");

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && username && pubKey) {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "popup-registration-complete",
            payload: [
              JSON.stringify({
                username,
                publicKey: pubKey,
              }),
            ],
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
    async (publicKey: string, credentialId: string, transports: string) => {
      try {
        setRegistrationStage("verifying");

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
            allowCredentials: [
              {
                type: "public-key",
                id: credentialId,
                transports: transports.split(",") as AuthenticatorTransport[],
              },
            ],
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
        setRegistrationStage("complete");
      } catch (error) {
        setRegistrationStage("input");
        throw error;
      }
    },
    [sessionToken, hints]
  );

  const handleRegister = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRegistrationStage("creating");

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
      const { publicKey, credentialId, transports } =
        (await request.json()) as {
          publicKey: string;
          credentialId: string;
          transports: string;
        };
      await handleCreateWallet(publicKey, credentialId, transports);
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("input");
    } finally {
      setLoading(false);
    }
  }, [username, handleCreateWallet, hints]);

  // All useEffects after all callbacks
  useEffect(() => {
    if (!pubKey) return;

    const delayStart = setTimeout(() => {
      handleRedirectNow();

      // Store the interval reference so we can clear it later
      countdownIntervalRef.current = setInterval(
        () => setCountdown((prev) => Math.max(prev - 1, 0)),
        1000
      );
    }, 1000);

    return () => {
      clearTimeout(delayStart);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [pubKey, handleRedirectNow]);

  // Helper functions after hooks
  const getStageTitle = () => {
    switch (registrationStage) {
      case "creating":
        return "Creating Passkey";
      case "verifying":
        return "Setting Up Wallet";
      case "complete":
        return "Account Created";
      default:
        return "Create a new account";
    }
  };

  // Render function with no early returns
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Card className="w-full shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-4 items-center justify-center pb-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
              </motion.div>
              <div className="space-y-1 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={registrationStage}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardTitle className="text-lg font-semibold text-center">
                      {getStageTitle()}
                    </CardTitle>
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait">
                {registrationStage === "input" ? (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
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
                  </motion.div>
                ) : registrationStage === "creating" ? (
                  <motion.div
                    key="creating"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-center justify-center py-6 space-y-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                      className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent"
                    />
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Creating your passkey for{" "}
                      <span className="font-medium">{username}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Follow the prompts on your device
                    </p>
                  </motion.div>
                ) : registrationStage === "verifying" ? (
                  <motion.div
                    key="verifying"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col items-center justify-center py-6 space-y-4"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent"
                      />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1, 0.8, 1] }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Fingerprint className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
                      </motion.div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Setting up your secure wallet
                    </p>
                    <div className="w-full max-w-[200px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3 }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-full text-center space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
                      transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                      className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-500"
                    >
                      <CheckCircle className="h-6 w-6" />
                      <span className="font-medium text-lg">Success!</span>
                    </motion.div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Your account has been created successfully
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="break-words whitespace-pre-wrap">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {registrationStage === "input" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-full flex justify-center"
                >
                  <Turnstile
                    siteKey={
                      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_TOKEN!
                    }
                    onExpire={() => {
                      setSessionToken(null);
                    }}
                    onSuccess={async (token) => {
                      try {
                        const result = await fetch(
                          "https://payers.revibase.com/verify",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              "cf-turnstile-response": token,
                            }),
                          }
                        );
                        if (result.ok) {
                          const { token, signature } =
                            (await result.json()) as {
                              token: string;
                              signature: string;
                            };
                          setSessionToken({ token, signature });
                        }
                      } catch (error) {
                        console.error("Error verifying token:", error);
                        setError(
                          "Failed to verify security token. Please try again."
                        );
                      }
                    }}
                  />
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <AnimatePresence mode="wait">
                {registrationStage === "input" ? (
                  <motion.div
                    key="register-button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={() => handleRegister()}
                        disabled={loading || !username.trim() || !sessionToken}
                        className="w-full relative overflow-hidden group"
                        size="lg"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: [0, 10, 0] }}
                              transition={{
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                                repeatType: "reverse",
                                ease: "easeInOut",
                              }}
                            >
                              <Fingerprint className="h-5 w-5" />
                            </motion.div>
                            Create Account
                            <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : registrationStage === "complete" && countdown === 0 ? (
                  <motion.div
                    key="redirect-button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      onClick={handleRedirectNow}
                      className="w-full"
                      variant="outline"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Redirect Now
                      </span>
                    </Button>
                  </motion.div>
                ) : (
                  <></>
                )}
              </AnimatePresence>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
