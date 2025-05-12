"use client";

import { Registration } from "@/components/registration";
import { PublicKeyCredentialHint } from "@simplewebauthn/browser";
import { useSearchParams } from "next/navigation";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl");
  const hints = searchParams.get("hints");

  return (
    <Registration
      hints={hints?.split(",") as PublicKeyCredentialHint[]}
      redirectUrl={redirectUrl}
    />
  );
}
