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

export function useSenderInfo(publicKey: string | null) {
  const [username, setUsername] = useState<string>();
  const [senderAddress, setSenderAddress] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abort = new AbortController();

    if (!publicKey) {
      setIsLoading(false);
      return;
    }

    const fetchUsername = async () => {
      setIsLoading(true);

      try {
        const delegateIndex = await fetchDelegateIndex(
          new Secp256r1Key(publicKey)
        );
        const settings = await getSettingsFromIndex(delegateIndex);
        const multiWallet = await getMultiWalletFromSettings(settings);
        setSenderAddress(multiWallet.toString());

        const response = await fetch(
          `${DATABASE_ENDPOINT}?publicKey=${publicKey}`,
          { signal: abort.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = (await response.json()) as PasskeyPayload;

        if (!abort.signal.aborted && result.username) {
          setUsername(result.username);
        }
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("Error fetching sender username:", error);
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
  }, [publicKey]);

  return { username, isLoading, senderAddress };
}
