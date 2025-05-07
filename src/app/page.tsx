"use client";

import { AuthenticationStatus } from "@/components/authentication-status";
import { Registration } from "@/components/registration";
import { TransactionActions } from "@/components/transaction-actions";
import { TransactionDetails } from "@/components/transaction-details";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePopupMessaging } from "@/hooks/usePopupMessaging";
import { initialState, reducer } from "@/state/reducer";
import { isValidUrl } from "@/utils";
import { AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useReducer } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  const [state, dispatch] = useReducer(reducer, initialState);
  const { handleRedirectNow } = usePopupMessaging(redirectUrl, state, dispatch);
  const {
    error,
    response,
    publicKey,
    data,
    isRegister,
    hints,
    countdown,
    isLoading,
    additionalInfo,
  } = state;

  const urlHostname = useMemo(() => {
    if (redirectUrl && isValidUrl(redirectUrl)) {
      return new URL(redirectUrl).hostname;
    } else {
      dispatch({ type: "SET_ERROR", payload: "Invalid Redirect Url" });
    }
    return null;
  }, [redirectUrl]);

  if (isRegister) {
    return <Registration hints={hints} redirectUrl={redirectUrl} />;
  }

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
                {urlHostname && (
                  <CardTitle className="text-base font-medium text-center">
                    <a
                      className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      href={redirectUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {urlHostname}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </CardTitle>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!response && (
                <TransactionDetails
                  data={data}
                  publicKey={publicKey}
                  isLoading={isLoading}
                  additionalInfo={additionalInfo}
                />
              )}
              {error && (
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
                        You need to register this passkey first before using it
                        for authentication.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <div className="w-full">
                {response ? (
                  <AuthenticationStatus
                    countdown={countdown}
                    onRedirectNow={handleRedirectNow}
                    isLoading={isLoading}
                  />
                ) : (
                  <TransactionActions
                    data={data}
                    dispatch={dispatch}
                    publicKey={publicKey}
                    hints={hints}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
