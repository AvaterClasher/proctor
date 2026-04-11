import alchemy from "alchemy";
import { Nextjs } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

/** Persistent state for deploy/CI; generate with `openssl rand -base64 32`. */
const useCloudflareState = Boolean(process.env.ALCHEMY_STATE_TOKEN?.trim());

const app = await alchemy("proctor", {
  stage: process.env.STAGE,
  ...(useCloudflareState
    ? {
        stateStore: (scope) =>
          new CloudflareStateStore(scope, {
            scriptName: "proctor-alchemy-state",
          }),
      }
    : {}),
});

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

export const web = await Nextjs("web", {
  cwd: "../../apps/web",
  bindings: {
    NEXT_PUBLIC_SERVER_URL: alchemy.env.NEXT_PUBLIC_SERVER_URL!,
    NEXT_PUBLIC_LIVEKIT_URL: alchemy.env.NEXT_PUBLIC_LIVEKIT_URL!,
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
  },
  dev: {
    env: {
      PORT: "3001",
    },
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    LIVEKIT_API_KEY: alchemy.env.LIVEKIT_API_KEY!,
    LIVEKIT_API_SECRET: alchemy.secret.env.LIVEKIT_API_SECRET!,
    LIVEKIT_URL: alchemy.env.LIVEKIT_URL!,
    AGENT_API_KEY: alchemy.secret.env.AGENT_API_KEY!,
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
