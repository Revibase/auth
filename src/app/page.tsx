"use client";

import { AuthenticationActions } from "@/components/authentication/authentication-actions";
import { AuthenticationDetails } from "@/components/authentication/authentication-details";
import { AuthenticationStatus } from "@/components/authentication/authentication-status";
import { Registration } from "@/components/registration/main";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCountdownAndSend } from "@/hooks/useCountdownAndSend";
import { useInitialize } from "@/hooks/useInitialize";
import { initialState, reducer } from "@/state/reducer";
import { isValidUrl } from "@/utils";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useReducer } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  const [state, dispatch] = useReducer(reducer, initialState);
  useInitialize(redirectUrl, dispatch);
  const {
    error,
    response,
    publicKey,
    data,
    isRegister,
    hints,
    isLoading,
    additionalInfo,
  } = state;

  const { countdown, handleRedirectNow } = useCountdownAndSend({
    redirectUrl,
    response,
  });

  const urlHostname = useMemo(() => {
    if (redirectUrl && isValidUrl(redirectUrl)) {
      return new URL(redirectUrl).hostname;
    } else {
      dispatch({ type: "SET_ERROR", payload: "Invalid Redirect Url" });
    }
    return null;
  }, [redirectUrl]);

  if (isRegister) {
    return (
      <Registration
        hints={hints}
        redirectUrl={redirectUrl}
        message={data?.type === "message" ? data.payload : undefined}
        onReturn={() => dispatch({ type: "SET_IS_REGISTER", payload: false })}
        shouldCreateWallet={additionalInfo?.shouldCreateWallet}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 ">
      <div className="container flex-col gap-4 max-w-lg mx-auto flex items-center justify-center p-4">
        <div className="w-full">
          <Card className="w-full shadow-lg border-slate-200 ">
            <CardHeader className="space-y-4 items-center justify-center pb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 ">
                <ShieldCheck className="h-6 w-6 text-emerald-600 " />
              </div>
              <div className="space-y-1 text-center">
                {urlHostname && (
                  <CardTitle className="text-base font-medium text-center">
                    <a
                      className="flex items-center justify-center gap-1 text-slate-600 hover:text-slate-800 transition-colors"
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
                <AuthenticationDetails
                  data={data}
                  publicKey={publicKey}
                  isLoading={isLoading}
                  additionalInfo={additionalInfo}
                />
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>{"Error"}</AlertTitle>
                  <AlertDescription className="break-words whitespace-pre-wrap">
                    {error}
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
                  />
                ) : (
                  <AuthenticationActions
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
