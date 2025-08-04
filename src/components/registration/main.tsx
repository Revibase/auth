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
import { useCountdownAndSend } from "@/hooks/useCountdownAndSend";
import { useRegistration } from "@/hooks/useRegistration";
import { type PublicKeyCredentialHint } from "@simplewebauthn/browser";
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
import { type FC, memo, useState } from "react";

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

const CreateWalletButton = memo(({ onClick }: { onClick: () => void }) => (
  <Button
    onClick={onClick}
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
));
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
  message?: string;
  onReturn?: () => void;
  hints?: PublicKeyCredentialHint[];
}> = ({ redirectUrl, hints, onReturn, message }) => {
  const [username, setUsername] = useState("");

  const {
    resetToInput,
    handleCreateWallet,
    handleRegister,
    registrationStage,
    loading,
    error,
    response,
  } = useRegistration({ username, hints, message });

  const { countdown, handleRedirectNow } = useCountdownAndSend({
    redirectUrl,
    response,
  });

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
        return "Create Your Wallet";
      default:
        return "Register a new passkey";
    }
  })();

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
            onRetry={handleCreateWallet}
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
        return <CreateWalletButton onClick={handleCreateWallet} />;
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
