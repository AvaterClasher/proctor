import { createAuth } from "@proctor/auth";
import { env } from "@proctor/env/server";
import type { Context, Next } from "hono";

export type SessionUser = {
  user: { id: string; name: string; email: string };
};

export type AuthEnv = {
  Variables: {
    session: SessionUser;
  };
};

export async function requireSession(c: Context, next: Next) {
  const auth = createAuth({
    db: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.CORS_ORIGIN],
  });
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("session", session as SessionUser);
  await next();
}

export async function requireAgentApiKey(c: Context, next: Next) {
  const apiKey = c.req.header("X-API-Key");
  const expected = env.AGENT_API_KEY;

  if (!apiKey || !expected || !timingSafeEqual(apiKey, expected)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  // crypto.subtle.timingSafeEqual is available in Cloudflare Workers
  // Fall back to constant-time byte comparison
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i]! ^ bufB[i]!;
  }
  return result === 0;
}
