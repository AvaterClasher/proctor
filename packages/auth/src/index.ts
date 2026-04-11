import * as schema from "@proctor/db/schema";
import * as authSchema from "@proctor/db/schema/auth";
import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

export interface AuthConfig {
  db: D1Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export function createAuth(config: AuthConfig) {
  const db = drizzle(config.db, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },
    secret: config.secret,
    baseURL: config.baseURL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
  });
}
