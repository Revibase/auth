import { useCallback, useEffect, useRef, useState } from "react";

export const useCountdownAndSend = ({
  redirectUrl,
  response,
}: {
  redirectUrl?: string | null;
  response: string | null;
}) => {
  const [countdown, setCountdown] = useState<number>(2);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && response) {
      const target = window.opener || window.parent;
      if (target) {
        target.postMessage(
          {
            type: "popup-complete",
            payload: response,
          },
          redirectUrl
        );
      }
    }
  }, [redirectUrl, response]);

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

  return { countdown, handleRedirectNow };
};
