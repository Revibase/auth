// components/auth/usePopupMessaging.ts
import { Action } from "@/state/reducer";
import { isValidUrl } from "@/utils";
import { useCallback, useEffect } from "react";

export function useInitialize(
  redirectUrl: string | null,
  dispatch: React.Dispatch<Action>
) {
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
            hints: event.data.payload.hints,
            additionalInfo: event.data.payload.additionalInfo,
          },
        });
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
}
