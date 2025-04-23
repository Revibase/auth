"use client";

import { AuthenticationSkeleton } from "@/components/authentication-skeleton";
import { AuthenticationStatus } from "@/components/authentication-status";
import { FooterSkeleton } from "@/components/footer-skeleton";
import { RegistrationPage } from "@/components/registration";
import { TransactionDetails } from "@/components/transaction-details";
import { TransactionProgress } from "@/components/transaction-progress";
import { TransactionSkeleton } from "@/components/transaction-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Data, Payload } from "@/types";
import {
  createTransactionChallenge,
  isValidUrl,
  parsedTransaction,
  rpc,
  rpId,
} from "@/utils";
import {
  bufferToBase64URLString,
  type PublicKeyCredentialHint,
  startAuthentication,
  WebAuthnError,
} from "@simplewebauthn/browser";
import { getUtf8Encoder } from "@solana/kit";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  type Dispatch,
  type FC,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export default function Home() {
  const searchParams = useSearchParams();
  // Extract parameters first
  const redirectUrl = searchParams.get("redirectUrl");
  // State management
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState("");
  const [data, setData] = useState<Data[]>([]);
  const [isRegister, setIsRegister] = useState(false);
  const [hints, setHints] = useState<PublicKeyCredentialHint[]>();
  const [countdown, setCountdown] = useState<number>(2);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const allTransactionsSigned = useMemo(
    () =>
      response.length === data.length && data.length > 0 && response.length > 0,
    [response, data]
  );
  // receive payload from parent frame
  useEffect(() => {
    if (!isValidUrl(redirectUrl) || !redirectUrl) {
      setIsLoading(false);
      return;
    }

    const origin = new URL(redirectUrl).origin;
    const handleMessage = (event: MessageEvent) => {
      if (!event.isTrusted || event.origin !== origin) {
        return;
      }
      if (event.data.type === "popup-init") {
        setIsResetting(true);
        setIsLoading(true);

        // Small delay to allow for reset animation
        setTimeout(() => {
          setData(
            (
              event.data.payload.data as
                | {
                    type: "transaction" | "message";
                    payload: string;
                  }[]
                | undefined
            )?.map((x) =>
              x.type === "message"
                ? { type: x.type, payload: x.payload }
                : {
                    type: "transaction",
                    payload: x.payload,
                    ...parsedTransaction(x.payload),
                  }
            ) || []
          );
          setPublicKey(event.data.payload.publicKey || "");
          setIsRegister(event.data.payload.isRegister || false);
          setHints(event.data.payload.hints);
          reset();

          // Animation delay for resetting and loading
          setTimeout(() => {
            setIsResetting(false);
            setIsLoading(false);
          }, 600);
        }, 200);
      }
    };

    const reset = () => {
      setResponse([]);
      setCountdown(2);
      setError(null);

      // Clear any existing countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
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
  }, [redirectUrl]);

  const handleRedirectNow = useCallback(() => {
    // Only redirect when all transactions are signed
    if (redirectUrl && allTransactionsSigned) {
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
  }, [redirectUrl, response, allTransactionsSigned]);

  // Countdown logic - only start countdown after all transactions are signed
  useEffect(() => {
    if (!allTransactionsSigned) return;

    // Start countdown after a short delay to allow user to see success message
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
  }, [allTransactionsSigned, handleRedirectNow]);

  // Get current transaction index
  const currentIndex = response.length;
  const totalTransactions = data.length;

  // Parse the current transaction message
  const currentData = data[currentIndex];

  const parsedMessage = useMemo(() => {
    if (!currentData || !redirectUrl) return null;

    if (currentData.type === "message") {
      return currentData.payload;
    } else if (currentData.type === "transaction") {
      switch (currentData.transactionActionType) {
        case "add_new_member":
          return `${
            new URL(redirectUrl).hostname
          } wants to link your passkey to a multisig wallet.`;
        default:
          // Format the transaction data in a more readable way
          try {
            const formatted = JSON.stringify(
              currentData.deserializedTxMessage,
              (key, value) =>
                typeof value === "bigint" ? value.toString() : value,
              2
            );
            return formatted;
          } catch (e) {
            return JSON.stringify(
              currentData.deserializedTxMessage,
              (key, value) =>
                typeof value === "bigint" ? value.toString() : value
            );
          }
      }
    }
    return null;
  }, [currentData, redirectUrl]);

  if (isRegister) {
    return <RegistrationPage hints={hints} redirectUrl={redirectUrl} />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Card
            className={`w-full shadow-lg border-slate-200 dark:border-slate-800 transition-opacity duration-300 ${
              isResetting ? "opacity-50" : "opacity-100"
            }`}
          >
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
                {redirectUrl && isValidUrl(redirectUrl) && (
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
              {redirectUrl && isValidUrl(redirectUrl) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <h2 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {totalTransactions > 1
                      ? `${totalTransactions} Signature Requests from ${
                          new URL(redirectUrl).origin
                        }`
                      : `Signature Request from ${new URL(redirectUrl).origin}`}
                  </h2>
                </motion.div>
              )}
            </CardHeader>

            {totalTransactions > 1 && !allTransactionsSigned && (
              <div className="px-6 pb-2">
                <TransactionProgress
                  currentIndex={currentIndex}
                  totalCount={totalTransactions}
                />
              </div>
            )}

            <CardContent className="space-y-4">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="transaction-skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TransactionSkeleton />
                  </motion.div>
                ) : currentData ? (
                  <motion.div
                    key={`transaction-${currentIndex}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TransactionDetails
                      data={currentData}
                      parsedMessage={parsedMessage}
                    />
                  </motion.div>
                ) : null}
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
                        <span className="font-medium">Error: </span>
                        {error.includes("AbortError") ||
                        error.includes("ERROR_CEREMONY_ABORTED")
                          ? "Authentication was cancelled."
                          : error}
                        {error.includes("not registered") && (
                          <p className="mt-1 text-xs">
                            You need to register this passkey first before using
                            it for authentication.
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  allTransactionsSigned ? (
                    <motion.div
                      key="authentication-skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <AuthenticationSkeleton />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="footer-skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <FooterSkeleton />
                    </motion.div>
                  )
                ) : allTransactionsSigned ? (
                  <motion.div
                    key="authentication-status"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <AuthenticationStatus
                      countdown={countdown}
                      onRedirectNow={handleRedirectNow}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="footer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <Footer
                      data={currentData}
                      setError={setError}
                      setResponse={setResponse}
                      publicKey={publicKey}
                      hints={hints}
                      isLoading={isLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

const Footer: FC<{
  data: Data;
  setError: (value: string | null) => void;
  publicKey?: string;
  hints?: PublicKeyCredentialHint[];
  setResponse: Dispatch<SetStateAction<string[]>>;
  isLoading?: boolean;
}> = ({ setError, publicKey, hints, data, setResponse, isLoading }) => {
  const [loading, setLoading] = useState(false);

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

      if (data.type === "message") {
        challenge = new Uint8Array(getUtf8Encoder().encode(data.payload));
      } else if (data.type === "transaction") {
        ({ slotNumber, slotHash, challenge } = await createTransactionChallenge(
          { rpc, ...data }
        ));
      }

      if (!challenge) throw new Error("Invalid challenge message.");

      const assertionResponse = await startAuthentication({
        optionsJSON: {
          rpId,
          challenge: bufferToBase64URLString(challenge.buffer as ArrayBuffer),
          allowCredentials: payload?.credentialId
            ? [
                {
                  type: "public-key",
                  id: payload.credentialId,
                  transports: payload.transports?.split(
                    ","
                  ) as AuthenticatorTransport[],
                },
              ]
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
      const result = JSON.stringify({
        ...assertionResponse,
        ...payload,
        slotNumber,
        slotHash,
      });
      setResponse((prev) => (prev ? [...prev, result] : [result]));
    } catch (err) {
      const errorCode = err instanceof WebAuthnError ? err.code : null;
      if (errorCode !== "ERROR_CEREMONY_ABORTED" || errorCode === null) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }, [publicKey, data, setError, setResponse, hints]);

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        onClick={authenticateWithPasskey}
        disabled={loading || !data || isLoading}
        className="w-full relative overflow-hidden group"
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Authenticating...
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
            Continue with Passkey
            <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
          </span>
        )}
      </Button>
    </motion.div>
  );
};
