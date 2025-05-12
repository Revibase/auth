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
import type { PasskeyPayload } from "@/types";
import {
  createTransactionChallenge,
  DATABASE_ENDPOINT,
  getRandomPayer,
  PAYERS_ENDPOINT,
  RP_ID,
  RP_NAME,
  rpc,
  sendAndConfirm,
  TURNSTILE_KEY,
} from "@/utils";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  convertSignatureDERtoRS,
  createWallet,
  getDomainConfig,
  getSecp256r1PubkeyDecoder,
  getSettingsFromInitialMember,
  Secp256r1Key,
} from "@revibase/wallet-sdk";
import {
  base64URLStringToBuffer,
  bufferToBase64URLString,
  type PublicKeyCredentialHint,
  type RegistrationResponseJSON,
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
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Wallet,
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
    disabled,
  }: {
    username: string;
    setUsername: (value: string) => void;
    disabled: boolean;
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
        disabled={disabled}
        className="h-10"
      />
    </div>
  )
);
InputStage.displayName = "InputStage";

const RegisteringStage = memo(({ username }: { username: string }) => (
  <motion.div
    key="Registering"
    {...slideInRight}
    className="flex flex-col items-center justify-center py-6 space-y-4"
  >
    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Registering your passkey for{" "}
      <span className="font-medium">{username}</span>
    </p>
    <p className="text-xs text-slate-500 dark:text-slate-500">
      Follow the prompts on your device
    </p>
  </motion.div>
));
RegisteringStage.displayName = "RegisteringStage";

const CreatingStage = memo(({ username }: { username: string }) => (
  <motion.div
    key="Creating"
    {...slideInRight}
    className="flex flex-col items-center justify-center py-6 space-y-4"
  >
    <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    <p className="text-sm text-slate-600 dark:text-slate-400">
      Creating wallet for <span className="font-medium">{username}</span>
    </p>
    <p className="text-xs text-slate-500 dark:text-slate-500">
      Please wait while we set up your account
    </p>
  </motion.div>
));
CreatingStage.displayName = "CreatingStage";

const WalletPromptStage = memo(({ username }: { username: string }) => (
  <motion.div
    key="WalletPrompt"
    {...slideInRight}
    className="flex flex-col items-center justify-center py-6 space-y-4"
  >
    {/* Progress indicator */}
    <div className="w-full flex items-center justify-center mb-2">
      <div className="flex items-center w-full max-w-xs">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border-2 border-emerald-500 dark:border-emerald-500">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs font-medium mt-1 text-emerald-600 dark:text-emerald-400">
            Registration
          </span>
        </div>
        <div className="flex-1 h-0.5 mx-2 bg-slate-200 dark:bg-slate-700 relative">
          <div className="absolute inset-0 bg-emerald-500 dark:bg-emerald-500 w-full"></div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-blue-500 dark:border-blue-500">
            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-medium mt-1 text-blue-600 dark:text-blue-400">
            Wallet
          </span>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30">
      <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
    </div>
    <div className="text-center space-y-2">
      <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800 mb-2">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
          <CheckCircle className="h-4 w-4" />
          Registration successful
        </p>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Hi <span className="font-medium">{username}</span>, your account has
        been registered.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
        Create your wallet to complete the setup process.
      </p>
    </div>
  </motion.div>
));
WalletPromptStage.displayName = "WalletPromptStage";

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

const ErrorStage = memo(
  ({
    error,
    onRetry,
    message,
    retryText,
  }: {
    error: string | null;
    onRetry: () => void;
    message: string;
    retryText: string;
  }) => (
    <motion.div
      key="error"
      {...slideInRight}
      className="flex flex-col items-center justify-center py-4 space-y-4"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <p className="font-medium text-red-600 dark:text-red-500">{message}</p>
        {error && (
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            {error}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        className="w-full border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/50"
      >
        {retryText}
      </Button>
    </motion.div>
  )
);
ErrorStage.displayName = "ErrorStage";

const ErrorAlert = memo(
  ({ error, onRetry }: { error: string | null; onRetry: () => void }) => {
    if (!error) return null;

    return (
      <motion.div
        initial={{ opacity: 1, height: "auto" }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Alert
          variant="destructive"
          className="flex flex-col items-start gap-2"
        >
          <div className="flex items-center gap-2 w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="break-words whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 w-full border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/50"
          >
            Retry
          </Button>
        </Alert>
      </motion.div>
    );
  }
);

ErrorAlert.displayName = "ErrorAlert";

const RegisterButton = memo(
  ({
    onReturn,
    onClick,
    disabled,
    loading,
  }: {
    onReturn?: () => void;
    onClick: () => void;
    disabled: boolean;
    loading: boolean;
  }) => (
    <>
      <Button
        onClick={onClick}
        disabled={disabled}
        className="w-full relative overflow-hidden group"
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Registering account...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Register
            <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
          </span>
        )}
      </Button>
      {onReturn && (
        <Button
          variant={"ghost"}
          size={"lg"}
          className="w-full"
          onClick={onReturn}
        >
          Back
        </Button>
      )}
    </>
  )
);
RegisterButton.displayName = "RegisterButton";

const CreateWalletButton = memo(
  ({ onClick, disabled }: { onClick: () => void; disabled: boolean }) => (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full relative overflow-hidden group"
      size="lg"
    >
      <span className="flex items-center gap-2">
        <Wallet className="h-5 w-5" />
        Create Wallet
        <ArrowRight className="h-4 w-4 ml-1" />
        <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
      </span>
    </Button>
  )
);
CreateWalletButton.displayName = "CreateWalletButton";

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
  onReturn?: () => void;
  hints?: PublicKeyCredentialHint[];
}> = ({ redirectUrl, hints, onReturn }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<{
    publicKey: string;
    username: string;
    authResponse: RegistrationResponseJSON;
  } | null>(null);
  const [countdown, setCountdown] = useState<number>(2);
  const [sessionToken, setSessionToken] = useState<{
    token: string;
    signature: string;
  } | null>(null);
  const [createWalletArgs, setCreateWalletArgs] = useState<{
    publicKey: string;
    authResponse: RegistrationResponseJSON;
  } | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [registrationStage, setRegistrationStage] = useState<
    | "input"
    | "registering"
    | "creating"
    | "complete"
    | "registration-error"
    | "wallet-error"
    | "wallet-prompt"
  >("input");

  // Memoized stage title
  const stageTitle = (() => {
    switch (registrationStage) {
      case "registering":
        return "Registering Passkey";
      case "creating":
        return "Creating Wallet";
      case "complete":
        return "Account Created";
      case "registration-error":
        return "Registration Error";
      case "wallet-error":
        return "Wallet Creation Error";
      case "wallet-prompt":
        return "Step 2: Create Your Wallet";
      default:
        return "Step 1: Register a new passkey";
    }
  })();

  const resetToInput = useCallback(() => {
    setError(null);
    setRegistrationStage("input");
    setLoading(false);
  }, []);

  const retryWalletCreation = useCallback(() => {
    setError(null);
    setRegistrationStage("creating");
    handleCreateWallet();
  }, []);

  const handleCreateWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!createWalletArgs || !sessionToken) {
        throw new Error("Missing response or session token");
      }

      // Show the creating wallet loading screen
      setRegistrationStage("creating");

      const feePayer = await getRandomPayer(sessionToken);
      const settings = await getSettingsFromInitialMember(
        new Secp256r1Key(createWalletArgs.publicKey)
      );
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

      const createWalletIxs = await createWallet({
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

      setResponse({
        publicKey: createWalletArgs.publicKey,
        username,
        authResponse: createWalletArgs.authResponse,
      });

      setRegistrationStage("complete");
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("wallet-error");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, createWalletArgs, username]);

  const handleRegister = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Webauthn register
      setRegistrationStage("registering");
      const result = await fetch(
        `${DATABASE_ENDPOINT}?username=${username}&challenge=true`
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
      setCreateWalletArgs({ ...payload, authResponse: response });
      setRegistrationStage("wallet-prompt");
    } catch (error) {
      setError((error as Error).message);
      setRegistrationStage("registration-error");
    } finally {
      setLoading(false);
    }
  }, [username, hints]);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && username && response) {
      const target = window.opener || window.parent;
      if (target) {
        target.postMessage(
          {
            type: "popup-complete",
            payload: JSON.stringify(response),
          },
          redirectUrl
        );
      }
    }
  }, [redirectUrl, username, response]);

  // Handle countdown and redirect
  useEffect(() => {
    if (!response) return;

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
  }, [response, handleRedirectNow]);

  // Render the appropriate content based on the current stage
  const renderStageContent = () => {
    switch (registrationStage) {
      case "input":
        return (
          <InputStage
            username={username}
            setUsername={setUsername}
            disabled={loading || !!response}
          />
        );
      case "registering":
        return <RegisteringStage username={username} />;
      case "creating":
        return <CreatingStage username={username} />;
      case "wallet-prompt":
        return <WalletPromptStage username={username} />;
      case "registration-error":
        return (
          <ErrorStage
            error={error}
            onRetry={resetToInput}
            message="Registration failed"
            retryText="Try Again"
          />
        );
      case "wallet-error":
        return (
          <ErrorStage
            error={error}
            onRetry={retryWalletCreation}
            message="Wallet creation failed"
            retryText="Retry Wallet Creation"
          />
        );
      case "complete":
        return <CompleteStage />;
      default:
        return null;
    }
  };

  // Render the appropriate button based on the current stage
  const renderActionButton = () => {
    switch (registrationStage) {
      case "input":
        return (
          <RegisterButton
            onReturn={onReturn}
            onClick={handleRegister}
            disabled={loading || !username.trim()}
            loading={loading}
          />
        );
      case "wallet-prompt":
        return (
          <CreateWalletButton
            onClick={handleCreateWallet}
            disabled={!sessionToken}
          />
        );
      case "complete":
        if (countdown === 0) {
          return (
            <motion.div key="redirect-button" {...slideIn}>
              <RedirectButton onClick={handleRedirectNow} />
            </motion.div>
          );
        }
        return null;
      default:
        return null;
    }
  };

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
                {renderStageContent()}
              </AnimatePresence>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Turnstile
                siteKey={TURNSTILE_KEY}
                onExpire={() => {
                  setSessionToken(null);
                }}
                onSuccess={async (token) => {
                  const result = await fetch(`${PAYERS_ENDPOINT}/verify`, {
                    method: "POST",
                    body: JSON.stringify({
                      "cf-turnstile-response": token,
                    }),
                  });
                  if (result.ok) {
                    const { token, signature } = (await result.json()) as {
                      token: string;
                      signature: string;
                    };
                    setSessionToken({ token, signature });
                  }
                }}
              />
              <AnimatePresence mode="wait" initial={false}>
                {renderActionButton()}
              </AnimatePresence>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
