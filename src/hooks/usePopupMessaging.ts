// components/auth/usePopupMessaging.ts
import { Action, State } from "@/state/reducer";
import { isValidUrl } from "@/utils";
import { useCallback, useEffect, useRef } from "react";

export function usePopupMessaging(
  redirectUrl: string | null,
  state: State,
  dispatch: React.Dispatch<Action>
) {
  const { response } = state;
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && response) {
      const target = window.opener || window.parent;
      if (target) {
        target.postMessage(
          { type: "popup-complete", payload: response },
          redirectUrl
        );
      }
    }
  }, [redirectUrl, response]);

  useEffect(() => {
    if (!response) return;

    const delayStart = setTimeout(() => {
      handleRedirectNow();

      countdownIntervalRef.current = setInterval(
        () => dispatch({ type: "DECREMENT_COUNTDOWN" }),
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

  // Optimized message handler
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!redirectUrl || !isValidUrl(redirectUrl)) return;

      const origin = new URL(redirectUrl).origin;
      if (!event.isTrusted || event.origin !== origin) {
        return;
      }

      if (event.data.type === "popup-init") {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({
          type: "INITIALIZE_FROM_POPUP",
          redirectUrl,
          payload: {
            data: event.data.payload.data,
            publicKey: event.data.payload.publicKey || "",
            isRegister: event.data.payload.isRegister || false,
            hints: event.data.payload.hints,
            additionalInfo: event.data.payload.additionalInfo,
          },
        });

        // Clear any existing countdown interval
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    },
    [redirectUrl]
  );

  useEffect(() => {
    if (!redirectUrl || !isValidUrl(redirectUrl)) return;

    const origin = new URL(redirectUrl).origin;

    const handleCloseEvent = () => {
      const target = window.opener || window.parent;
      target?.postMessage({ type: "popup-closed" }, origin);
    };

    const interval = setInterval(() => {
      const target = window.opener || window.parent;
      target?.postMessage({ type: "popup-heartbeat" }, origin);
    }, 2000);

    window.addEventListener("message", handleMessage);
    window.addEventListener("pagehide", handleCloseEvent);
    window.addEventListener("unload", handleCloseEvent);

    const target = window.opener || window.parent;
    target?.postMessage({ type: "popup-ready" }, origin);

    return () => {
      clearInterval(interval);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("unload", handleCloseEvent);
      window.removeEventListener("pagehide", handleCloseEvent);
    };
  }, [redirectUrl, handleMessage]);

  return { handleRedirectNow };
}
