"use client";

import { useFirebase } from "@/hooks/firebase";
import {
  bufferToBase64URLString,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Buffer } from "buffer";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const { db } = useFirebase();

  const transaction = searchParams.get("transaction");
  const message = searchParams.get("message");
  const p256PublicKey = searchParams.get("p256PublicKey");
  const redirectUrl = searchParams.get("redirectUrl");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  const isValidUrl = useMemo(() => {
    if (!redirectUrl) {
      setError("No redirect URL found.");
      return false;
    }
    try {
      new URL(redirectUrl);
      return true;
    } catch {
      setError("Invalid redirect URL.");
      return false;
    }
  }, [redirectUrl]);

  const parsedTransactionMessage = useMemo(() => {
    if (!isValidUrl) {
      return null;
    }
    if (!transaction && !message) {
      setError("No transaction or message found.");
      return null;
    }
    return transaction ?? message;
  }, [transaction, message, isValidUrl]);

  const signInWithPasskey = useCallback(async () => {
    if (!db) {
      setError("Database not initialized.");
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

      let userInfo: { p256PublicKey: string } | null = null;
      let credentialId: string | null = null;
      if (p256PublicKey) {
        const credentialQuery = await getDocs(
          query(
            collection(db, `Users`),
            where("p256PublicKey", "==", p256PublicKey),
            limit(1)
          )
        );
        if (!credentialQuery.empty) {
          credentialId = credentialQuery.docs[0].id;
          userInfo = {
            p256PublicKey,
          };
        }
      }

      const assertionResponse = await startAuthentication({
        optionsJSON: {
          rpId: "revibase.com",
          challenge: bufferToBase64URLString(challenge),
          allowCredentials: credentialId
            ? [
                {
                  type: "public-key",
                  id: credentialId,
                },
              ]
            : [],
          userVerification: "preferred",
        },
      });

      if (!userInfo) {
        userInfo = (
          await getDoc(doc(db, `Users/${assertionResponse.id}`))
        ).data() as {
          p256PublicKey: string;
        } | null;
      }

      if (!userInfo) {
        throw new Error("Passkey is not registered yet.");
      }

      const response = JSON.stringify({
        ...assertionResponse,
        p256PublicKey: userInfo.p256PublicKey,
      });
      setResponse(response);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [transaction, message, redirectUrl, p256PublicKey, db]);

  useEffect(() => {
    if (response) {
      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(prev - 1, 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [response]);

  useEffect(() => {
    if (countdown === 0) {
      handleRedirectNow();
    }
  }, [countdown]);

  const handleRedirectNow = useCallback(() => {
    if (redirectUrl && response) {
      window.opener?.postMessage(
        { type: "passkey-auth", payload: response },
        redirectUrl
      );
    }
  }, [redirectUrl, response]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 p-4">
      {redirectUrl && isValidUrl && (
        <h1 className="text-center text-lg font-semibold mb-5">
          Signature Request from{" "}
          <a
            className="text-blue-400 font-bold text-xl"
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {new URL(redirectUrl).hostname}
          </a>
        </h1>
      )}
      {parsedTransactionMessage && (
        <p className="text-center">{parsedTransactionMessage}</p>
      )}
      {error && <p className="text-red-500 text-center">{error}</p>}
      {response ? (
        <div className="text-green-500 text-center transition-opacity opacity-100">
          <p>Success! You will be redirected in {countdown} seconds.</p>
          <a
            onClick={handleRedirectNow}
            className="text-blue-400 cursor-pointer"
          >
            Click here to redirect immediately
          </a>
        </div>
      ) : (
        <button
          onClick={signInWithPasskey}
          disabled={loading || !parsedTransactionMessage || !isValidUrl}
          className={`bg-blue-500 text-white text-base px-4 py-2 rounded ${
            loading ? `cursor-not-allowed` : `cursor-pointer`
          }`}
        >
          {loading ? "Signing..." : `Continue With Passkey`}
        </button>
      )}
    </div>
  );
}
