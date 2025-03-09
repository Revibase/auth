"use client";

import {
  bufferToBase64URLString,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Buffer } from "buffer";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  const transaction = searchParams.get("transaction");
  const message = searchParams.get("message");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // use a service to simulate transaction message

  const parsedTransactionMessage = useMemo(() => {
    if (transaction) {
      return transaction ?? message;
    }
  }, [transaction, message]);

  const signInWithPasskey = useCallback(async () => {
    if (!parsedTransactionMessage) {
      setError("Unable to parse transaction message.");
      return;
    }
    if (!redirectUrl) {
      setError("Redirect Url is missing.");
      return;
    }
    try {
      setLoading(true);
      const challenge = transaction
        ? Buffer.from(transaction, "base64").buffer
        : message
        ? Buffer.from(message, "utf-8").buffer
        : null;

      if (!challenge) {
        setError("Invalid challenge message.");
        return;
      }

      const assertionResponse = await startAuthentication({
        optionsJSON: {
          rpId: "revibase.com",
          challenge: bufferToBase64URLString(challenge),
          allowCredentials: [],
          userVerification: "preferred",
        },
      });
      const response = encodeURIComponent(JSON.stringify(assertionResponse));

      window.location.href = `${redirectUrl}?response=${response}`;
    } catch (error) {
      setError(`${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [transaction, message, parsedTransactionMessage, redirectUrl]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1>Transaction Message</h1>
      <p>Click below to authenticate using Passkey (WebAuthn)</p>
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={signInWithPasskey}
        disabled={loading || !parsedTransactionMessage}
        className={`bg-blue-500 text-white text-base px-4 py-2 rounded ${
          loading ? `cursor-not-allowed` : `cursor-pointer`
        }`}
      >
        {loading ? "Signing..." : `Sign With Passkey`}
      </button>
    </div>
  );
}
