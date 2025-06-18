"use client";

import { getAsset } from "@/utils";
import { address } from "@solana/kit";
import { useEffect, useState } from "react";

const SYSTEM_PROGRAM_ADDRESS = "11111111111111111111111111111111";
const WSOL_REAL = "So11111111111111111111111111111111111111112";
const WSOL_ASSET = {
  content: {
    links: {
      image:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    },
    metadata: { name: "Solana", symbol: "SOL", description: "" },
  },
  id: "native",
  token_info: {
    decimals: 9,
    price_info: {
      currency: "USDC",
      price_per_token: 0, // populated dynamically
    },
  },
};

export function useAsset(mintAddress: string) {
  const [asset, setAsset] = useState<typeof WSOL_ASSET | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (mintAddress === SYSTEM_PROGRAM_ADDRESS) {
          const wSol = await getAsset(address(WSOL_REAL));
          if (abort.signal.aborted) return;

          setAsset({
            ...WSOL_ASSET,
            token_info: {
              ...WSOL_ASSET.token_info,
              price_info: {
                ...WSOL_ASSET.token_info.price_info,
                price_per_token: wSol?.token_info?.price_per_sol || 0,
              },
            },
          });
        } else {
          const assetData = await getAsset(mintAddress);
          if (!abort.signal.aborted) {
            setAsset(assetData);
          }
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          setError("Failed to load token information");
          console.error("Error fetching token:", err);
        }
      } finally {
        if (!abort.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      abort.abort(); // Cleanup fetch on unmount
    };
  }, [mintAddress]);

  return { asset, isLoading, error };
}
