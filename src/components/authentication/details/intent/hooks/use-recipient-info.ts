"use client";

import type { PasskeyPayload } from "@/types";
import { DATABASE_ENDPOINT } from "@/utils";
import {
  fetchDelegateIndex,
  getMultiWalletFromSettings,
  getSettingsFromIndex,
  Secp256r1Key,
} from "@revibase/wallet-sdk";
import { useEffect, useState } from "react";

export function useRecipientInfo(destination: string, additionalInfo: any) {
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abort = new AbortController();
    const recipientKey = additionalInfo?.recipient;

    if (!destination || !recipientKey) {
      setIsLoading(false);
      return;
    }

    const validateRecipient = async (): Promise<boolean> => {
      try {
        const delegateIndex = await fetchDelegateIndex(
          new Secp256r1Key(recipientKey)
        );
        const settings = await getSettingsFromIndex(delegateIndex);
        const multiWallet = await getMultiWalletFromSettings(settings);
        return multiWallet.toString() === destination;
      } catch (err) {
        if (abort.signal.aborted) return false;
        console.error("Validation error:", err);
        return false;
      }
    };

    const fetchUsername = async () => {
      setIsLoading(true);

      const isValid = await validateRecipient();
      if (!isValid || abort.signal.aborted) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${DATABASE_ENDPOINT}?publicKey=${recipientKey}`,
          { signal: abort.signal }
        );

        if (!response.ok) {
          const errorData = (await response.json()) as { error: string };
          throw new Error(errorData.error);
        }

        const result = (await response.json()) as PasskeyPayload;
        if (!abort.signal.aborted && result.username) {
          setUsername(result.username);
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("Error fetching recipient username:", error);
        }
      } finally {
        if (!abort.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchUsername();

    return () => {
      abort.abort();
    };
  }, [destination, additionalInfo]);

  return { username, isLoading };
}
