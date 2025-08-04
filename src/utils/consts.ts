import { initializeMultiWallet } from "@revibase/wallet-sdk";

export const RP_ID = process.env.NEXT_PUBLIC_RP_ID as string;

export const RP_NAME = process.env.NEXT_PUBLIC_RP_NAME as string;

export const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT as string;

export const CONNECTION_RPC_ENDPOINT = process.env
  .NEXT_PUBLIC_RPC_ENDPOINT as string;

export const DATABASE_ENDPOINT = process.env
  .NEXT_PUBLIC_PASSKEY_DATABASE as string;

export const PROXY_IMAGE_ENDPOINT = process.env
  .NEXT_PUBLIC_IMAGE_PROXY_ENDPOINT as string;

export const BUCKET_IMAGE_ENDPOINT = process.env
  .NEXT_PUBLIC_BUCKET_IMAGE_ENDPOINT as string;

initializeMultiWallet({
  rpcEndpoint: CONNECTION_RPC_ENDPOINT,
});
