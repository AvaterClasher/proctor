import { createDb } from "@proctor/db";
import { candidate, interview, assessment } from "@proctor/db/schema/interview";
import { eq, desc, sql } from "drizzle-orm";
import { Hono } from "hono";

import { requireAgentApiKey, requireSession } from "../middleware/auth";

const app = new Hono();

app.post("/", requireSession, async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    phone?: string;
  }>();

  if (!body.name || !body.email) {
    return c.json({ error: "name and email are required" }, 400);
  }

  const db = createDb();

  const existingCandidate = await db
    .select()
    .from(candidate)
    .where(eq(candidate.email, body.email))
    .get();

  const candidateId = existingCandidate?.id ?? crypto.randomUUID();

  if (!existingCandidate) {
    await db.insert(candidate).values({
      id: candidateId,
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
    });
  }

  const interviewId = crypto.randomUUID();
  const roomName = `interview-${interviewId}`;

  await db.insert(interview).values({
    id: interviewId,
    candidateId,
    status: "scheduled",
    roomName,
  });

  return c.json({ interviewId, candidateId, roomName }, 201);
});

app.get("/", requireSession, async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "20")));
  const statusFilter = c.req.query("status");
  const offset = (page - 1) * limit;

  const db = createDb();

  const conditions = statusFilter
    ? eq(interview.status, statusFilter as "scheduled" | "in_progress" | "completed" | "failed")
    : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(interview)
      .leftJoin(candidate, eq(interview.candidateId, candidate.id))
      .leftJoin(assessment, eq(assessment.interviewId, interview.id))
      .where(conditions)
      .orderBy(desc(interview.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(interview)
      .where(conditions)
      .get(),
  ]);

  const total = countResult?.count ?? 0;

  return c.json({
    data: rows.map((row) => ({
      interview: row.interview,
      candidate: row.candidate,
      assessment: row.assessment,
    })),
    pagination: { page, limit, total },
  });
});

app.get("/:id", requireSession, async (c) => {
  const id = c.req.param("id")!;
  const db = createDb();

  const row = await db
    .select()
    .from(interview)
    .leftJoin(candidate, eq(interview.candidateId, candidate.id))
    .leftJoin(assessment, eq(assessment.interviewId, interview.id))
    .where(eq(interview.id, id))
    .get();

  if (!row) {
    return c.json({ error: "Interview not found" }, 404);
  }

  return c.json({
    interview: row.interview,
    candidate: row.candidate,
    assessment: row.assessment,
  });
});

app.patch("/:id/status", requireAgentApiKey, async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.json<{
    status: string;
    transcript?: string;
    durationSecs?: number;
  }>();

  if (!body.status) {
    return c.json({ error: "status is required" }, 400);
  }

  const db = createDb();

  const existing = await db
    .select()
    .from(interview)
    .where(eq(interview.id, id))
    .get();

  if (!existing) {
    return c.json({ error: "Interview not found" }, 404);
  }

  await db
    .update(interview)
    .set({
      status: body.status as "scheduled" | "in_progress" | "completed" | "failed",
      ...(body.transcript !== undefined && { transcript: body.transcript }),
      ...(body.durationSecs !== undefined && { durationSecs: body.durationSecs }),
    })
    .where(eq(interview.id, id));

  return c.json({ success: true });
});

export default app;
