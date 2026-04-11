import { createDb } from "@proctor/db";
import { candidate, interview } from "@proctor/db/schema/interview";
import { env } from "@proctor/env/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";

import type { AuthEnv } from "../middleware/auth";
import { requireSession } from "../middleware/auth";

const app = new Hono<AuthEnv>();

/** Must match `@server.rtc_session(agent_name=...)` in `apps/agent/agent.py`. */
const LIVEKIT_AGENT_NAME = "tutor-screener";

async function ensureCloudAgentDispatched(roomName: string): Promise<void> {
  const client = new AgentDispatchClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET,
  );

  try {
    const dispatches = await client.listDispatch(roomName);
    if (dispatches.some((d) => d.agentName === LIVEKIT_AGENT_NAME)) {
      return;
    }
  } catch (e) {
    // LiveKit creates rooms lazily, so listDispatch 404s on a fresh room.
    // Anything else is a real failure.
    const message = e instanceof Error ? e.message : String(e);
    if (!message.toLowerCase().includes("does not exist")) {
      throw e;
    }
  }

  await client.createDispatch(roomName, LIVEKIT_AGENT_NAME);
}

app.post("/token", requireSession, async (c) => {
  const session = c.get("session");

  const body = await c.req.json<{ interviewId: string }>();

  if (!body.interviewId) {
    return c.json({ error: "interviewId is required" }, 400);
  }

  const db = createDb();
  const row = await db
    .select()
    .from(interview)
    .leftJoin(candidate, eq(interview.candidateId, candidate.id))
    .where(eq(interview.id, body.interviewId))
    .get();

  if (!row?.candidate || row.candidate.userId !== session.user.id) {
    return c.json({ error: "Interview not found" }, 404);
  }

  const roomName = row.interview.livekitRoom;

  try {
    await ensureCloudAgentDispatched(roomName);
  } catch (e) {
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error("LiveKit agent dispatch failed:", e);
    return c.json(
      {
        error: "Could not start interview agent. Check LiveKit credentials and deployment.",
        detail,
      },
      503,
    );
  }

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
