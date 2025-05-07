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
import { rpId } from "@/utils";
import {
  bufferToBase64URLString,
  type PublicKeyCredentialHint,
  startRegistration,
} from "@simplewebauthn/browser";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { type FC, memo, useCallback, useEffect, useRef, useState } from "react";

const slideIn = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

const slideInRight = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 },
};

const InputStage = memo(
  ({
    username,
    setUsername,
    loading,
    pubKey,
  }: {
    username: string;
    setUsername: (value: string) => void;
    loading: boolean;
    pubKey: string | null;
  }) => (
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
  )
);
InputStage.displayName = "InputStage";

const CreatingStage = memo(({ username }: { username: string }) => (
  <motion.div
    key="creating"
    {...slideInRight}
    className="flex flex-col items-center justify-center py-6 space-y-4"
  >
    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Creating your passkey for <span className="font-medium">{username}</span>
    </p>
    <p className="text-xs text-slate-500 dark:text-slate-500">
      Follow the prompts on your device
    </p>
  </motion.div>
));
CreatingStage.displayName = "CreatingStage";

const CompleteStage = memo(() => (
  <motion.div
    key="complete"
    initial={{ opacity: 1, scale: 1 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="w-full text-center space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900"
  >
    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-500">
      <CheckCircle className="h-6 w-6" />
      <span className="font-medium text-lg">Success!</span>
    </div>
    <p className="text-sm text-slate-700 dark:text-slate-300">
      Your account has been created successfully
    </p>
  </motion.div>
));
CompleteStage.displayName = "CompleteStage";

const ErrorAlert = memo(({ error }: { error: string | null }) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 1, height: "auto" }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Alert variant="destructive" className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="break-words whitespace-pre-wrap">
          {error}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
});
ErrorAlert.displayName = "ErrorAlert";

const RegisterButton = memo(
  ({
    onClick,
    disabled,
    loading,
  }: {
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
  }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
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
          <Fingerprint className="h-5 w-5" />
          Create Account
          <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
        </span>
      )}
    </Button>
  )
);
RegisterButton.displayName = "RegisterButton";

const RedirectButton = memo(({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick} className="w-full" variant="outline">
    <span className="flex items-center gap-2">
      <ExternalLink className="h-4 w-4" />
      Redirect Now
    </span>
  </Button>
));
RedirectButton.displayName = "RedirectButton";

export const Registration: FC<{
  redirectUrl: string | null;
  hints?: PublicKeyCredentialHint[];
}> = ({ redirectUrl, hints }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pubKey, setPubkey] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(2);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [registrationStage, setRegistrationStage] = useState<
    "input" | "creating" | "complete"
  >("input");

  // Memoized stage title
  const stageTitle = (() => {
    switch (registrationStage) {
      case "creating":
        return "Creating Passkey";
      case "complete":
        return "Account Created";
      default:
        return "Create a new account";
    }
  })();

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && username && pubKey) {
      const target = window.opener || window.parent;
      if (target) {
        target.postMessage(
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
      }
    }
  }, [redirectUrl, username, pubKey]);

  const handleRegister = useCallback(async () => {
    if (!username.trim()) return;

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
      const { publicKey } = (await request.json()) as {
        publicKey: string;
      };
      setPubkey(publicKey);
      setRegistrationStage("complete");
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("input");
    } finally {
      setLoading(false);
    }
  }, [username, hints]);

  // Handle countdown and redirect
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

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <div className="w-full">
          <Card className="w-full shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-4 items-center justify-center pb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-500" />
              </div>
              <div className="space-y-1 text-center">
                <CardTitle className="text-lg font-semibold text-center">
                  {stageTitle}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait" initial={false}>
                {registrationStage === "input" ? (
                  <InputStage
                    username={username}
                    setUsername={setUsername}
                    loading={loading}
                    pubKey={pubKey}
                  />
                ) : registrationStage === "creating" ? (
                  <CreatingStage username={username} />
                ) : (
                  <CompleteStage />
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {error && <ErrorAlert error={error} />}
              </AnimatePresence>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <AnimatePresence mode="wait" initial={false}>
                {registrationStage === "input" ? (
                  <RegisterButton
                    onClick={handleRegister}
                    disabled={loading || !username.trim()}
                    loading={loading}
                  />
                ) : registrationStage === "complete" && countdown === 0 ? (
                  <motion.div key="redirect-button" {...slideIn}>
                    <RedirectButton onClick={handleRedirectNow} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
