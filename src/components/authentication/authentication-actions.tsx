import { Action } from "@/state/reducer";
import { DataPayload, PasskeyPayload } from "@/types";
import { createTransactionChallenge, DATABASE_ENDPOINT, RP_ID } from "@/utils";
import {
  bufferToBase64URLString,
  PublicKeyCredentialHint,
  startAuthentication,
  WebAuthnError,
} from "@simplewebauthn/browser";
import { getUtf8Encoder } from "@solana/kit";
import { motion } from "framer-motion";
import { Fingerprint, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

export const AuthenticationActions = memo(
  ({
    dispatch,
    publicKey,
    hints,
    data,
    isLoading,
  }: {
    data: DataPayload | null;
    dispatch: React.Dispatch<Action>;
    publicKey: string | null;
    hints?: PublicKeyCredentialHint[];
    isLoading?: boolean;
  }) => {
    const [loading, setLoading] = useState(false);

    // Sign-in logic
    const authenticateWithPasskey = useCallback(async () => {
      if (!data) return;
      try {
        setLoading(true);
        dispatch({ type: "SET_ERROR", payload: null });
        let payload: PasskeyPayload | null = null;
        let challenge: Uint8Array | null = null;
        let slotHash: string | null = null;
        let slotNumber: string | null = null;

        if (publicKey) {
          const response = await fetch(
            `${DATABASE_ENDPOINT}?publicKey=${publicKey}`
          );
          const result = (await response.json()) as PasskeyPayload;
          if (result.publicKey && publicKey !== result.publicKey) {
            throw new Error("PublicKey mismatch");
          }
          payload = result;
        }

        if (data.type === "message") {
          challenge = new Uint8Array(getUtf8Encoder().encode(data.payload));
        } else if (data.type === "transaction") {
          ({ slotNumber, slotHash, challenge } =
            await createTransactionChallenge(data));
        }

        if (!challenge) throw new Error("Invalid challenge message.");

        const assertionResponse = await startAuthentication({
          optionsJSON: {
            rpId: RP_ID,
            challenge: bufferToBase64URLString(challenge.buffer as ArrayBuffer),
            allowCredentials: payload?.credentialId
              ? [
                  {
                    type: "public-key",
                    id: payload.credentialId,
                    transports: payload.transports?.split(
                      ","
                    ) as AuthenticatorTransport[],
                  },
                ]
              : [],
            hints,
          },
        });

        if (!payload) {
          const response = await fetch(
            `${DATABASE_ENDPOINT}?credentialId=${assertionResponse.id}`
          );
          const result = (await response.json()) as PasskeyPayload;
          payload = result;
        }

        if (!payload) throw new Error("Passkey is not registered.");
        const result = JSON.stringify({
          authResponse: assertionResponse,
          username: payload.username,
          publicKey: payload.publicKey,
          slotNumber,
          slotHash,
        });
        dispatch({ type: "ADD_RESPONSE", payload: result });
      } catch (err) {
        const errorCode = err instanceof WebAuthnError ? err.code : null;
        if (errorCode !== "ERROR_CEREMONY_ABORTED" || errorCode === null) {
          dispatch({
            type: "SET_ERROR",
            payload: err instanceof Error ? err.message : "Unknown error",
          });
        }
      } finally {
        setLoading(false);
      }
    }, [publicKey, data, dispatch, hints]);

    if (isLoading) {
      return <FooterSkeleton />;
    }

    return (
      <>
        <Button
          onClick={authenticateWithPasskey}
          disabled={loading || !data || isLoading}
          className="w-full relative overflow-hidden group"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Continue with Passkey
            </span>
          )}
        </Button>
        {data?.type === "message" && (
          <Button
            variant="ghost"
            size={"lg"}
            className="w-full"
            disabled={loading || isLoading}
            onClick={() => dispatch({ type: "SET_IS_REGISTER", payload: true })}
          >
            <span className="flex items-center gap-2">
              No Account? Click here to Register
            </span>
          </Button>
        )}
      </>
    );
  }
);

AuthenticationActions.displayName = "Footer";
function FooterSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Skeleton className="h-11 w-full rounded-md" />
    </motion.div>
  );
}
