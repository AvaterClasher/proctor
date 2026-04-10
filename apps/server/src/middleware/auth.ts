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
  const auth = createAuth();
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

  if (!apiKey || apiKey !== env.AGENT_API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}
