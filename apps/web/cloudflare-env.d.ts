import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    CORS_ORIGIN: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    NEXT_PUBLIC_SERVER_URL: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_LIVEKIT_URL: string;
  }
}

export {};
