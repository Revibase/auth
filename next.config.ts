import {
  API_ENDPOINT,
  BUCKET_IMAGE_ENDPOINT,
  CONNECTION_RPC_ENDPOINT,
  DATABASE_ENDPOINT,
  FRAME_ANCESTOR,
  PROXY_IMAGE_ENDPOINT,
} from "@/utils";
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Here we use the @cloudflare/next-on-pages next-dev module to allow us to
// use bindings during local development (when running the application with
// `next dev`). This function is only necessary during development and
// has no impact outside of that. For more information see:
// https://github.com/cloudflare/next-on-pages/blob/main/internal-packages/next-dev/README.md
setupDevPlatform().catch(console.error);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: PROXY_IMAGE_ENDPOINT.replace("https://", ""),
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; frame-ancestors ${FRAME_ANCESTOR}; form-action 'self'; object-src 'none'; frame-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' ${CONNECTION_RPC_ENDPOINT} ${`wss://${
              new URL(CONNECTION_RPC_ENDPOINT).hostname
            }`} ${DATABASE_ENDPOINT} ${API_ENDPOINT} https://cloudflareinsights.com; img-src 'self' ${BUCKET_IMAGE_ENDPOINT} ${PROXY_IMAGE_ENDPOINT}; font-src 'self';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
