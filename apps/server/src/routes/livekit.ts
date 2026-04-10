import { env } from "@proctor/env/server";
import { Hono } from "hono";
import { AccessToken } from "livekit-server-sdk";

import type { AuthEnv } from "../middleware/auth";
import { requireSession } from "../middleware/auth";

const app = new Hono<AuthEnv>();

app.post("/token", requireSession, async (c) => {
  const session = c.get("session");

  const body = await c.req.json<{ interviewId: string }>();

  if (!body.interviewId) {
    return c.json({ error: "interviewId is required" }, 400);
  }

  const roomName = `interview-${body.interviewId}`;

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: session.user.id,
    name: session.user.name,
    ttl: "10m",
  });

  at.addGrant({ roomJoin: true, room: roomName });

  const token = await at.toJwt();

  return c.json({
    token,
    roomName,
    serverUrl: env.LIVEKIT_URL,
  });
});

export default app;
