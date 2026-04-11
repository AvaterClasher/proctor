import { createDb } from "@proctor/db";
import { candidate, interview, assessment } from "@proctor/db/schema/interview";
import { eq, desc, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { AuthEnv } from "../middleware/auth";
import { requireAgentApiKey, requireSession } from "../middleware/auth";

const VALID_INTERVIEW_STATUSES = ["scheduled", "in_progress", "completed", "failed"] as const;
type InterviewStatus = (typeof VALID_INTERVIEW_STATUSES)[number];

const app = new Hono<AuthEnv>();

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
  const session = c.get("session");

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
      userId: session.user.id,
    });
  }

  const interviewId = crypto.randomUUID();
  const roomName = `interview-${interviewId}`;

  await db.insert(interview).values({
    id: interviewId,
    candidateId,
    status: "scheduled",
    livekitRoom: roomName,
  });

  return c.json({ id: interviewId, candidateId, roomName }, 201);
});

app.get("/", requireSession, async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? "20")));
  const statusFilter = c.req.query("status");
  const offset = (page - 1) * limit;

  const db = createDb();

  const conditions = statusFilter && VALID_INTERVIEW_STATUSES.includes(statusFilter as InterviewStatus)
    ? eq(interview.status, statusFilter as InterviewStatus)
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
  const session = c.get("session");
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

  // Candidates can only view their own interviews
  if (row.candidate?.userId && row.candidate.userId !== session.user.id) {
    return c.json({ error: "Interview not found" }, 404);
  }

  let parsedTranscript: Array<{ role: string; content: string; timestamp: string }> | null = null;
  if (row.interview.transcript) {
    try {
      parsedTranscript = JSON.parse(row.interview.transcript);
    } catch {
      parsedTranscript = null;
    }
  }

  return c.json({
    interview: { ...row.interview, transcript: parsedTranscript },
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

  if (!body.status || !VALID_INTERVIEW_STATUSES.includes(body.status as InterviewStatus)) {
    return c.json({ error: "status is required and must be one of: scheduled, in_progress, completed, failed" }, 400);
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
      status: body.status as InterviewStatus,
      ...(body.transcript !== undefined && { transcript: body.transcript }),
      ...(body.durationSecs !== undefined && { durationSecs: body.durationSecs }),
    })
    .where(eq(interview.id, id));

  return c.json({ success: true });
});

export default app;
