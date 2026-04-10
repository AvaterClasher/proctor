import { createDb } from "@proctor/db";
import { assessment, interview } from "@proctor/db/schema/interview";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { requireAgentApiKey, requireSession } from "../middleware/auth";

const app = new Hono();

app.post("/", requireAgentApiKey, async (c) => {
  const body = await c.req.json<{
    interviewId: string;
    overallScore: number;
    recommendation: string;
    summary: string;
    dimensions: Array<{ name: string; score: number; notes: string }>;
  }>();

  if (
    !body.interviewId ||
    body.overallScore === undefined ||
    !body.recommendation ||
    !body.summary
  ) {
    return c.json(
      { error: "interviewId, overallScore, recommendation, and summary are required" },
      400,
    );
  }

  const db = createDb();

  const existing = await db
    .select()
    .from(interview)
    .where(eq(interview.id, body.interviewId))
    .get();

  if (!existing) {
    return c.json({ error: "Interview not found" }, 404);
  }

  const id = crypto.randomUUID();

  const VALID_RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no", "strong_no"] as const;
  if (!VALID_RECOMMENDATIONS.includes(body.recommendation as (typeof VALID_RECOMMENDATIONS)[number])) {
    return c.json({ error: "recommendation must be one of: strong_yes, yes, maybe, no, strong_no" }, 400);
  }

  await db.insert(assessment).values({
    id,
    interviewId: body.interviewId,
    overallScore: body.overallScore,
    recommendation: body.recommendation as (typeof VALID_RECOMMENDATIONS)[number],
    summary: body.summary,
    dimensions: JSON.stringify(body.dimensions ?? []),
  });

  return c.json({ id, interviewId: body.interviewId }, 201);
});

app.get("/:interviewId", requireSession, async (c) => {
  const interviewId = c.req.param("interviewId")!;
  const db = createDb();

  const result = await db
    .select()
    .from(assessment)
    .where(eq(assessment.interviewId, interviewId))
    .get();

  if (!result) {
    return c.json({ error: "Assessment not found" }, 404);
  }

  return c.json(result);
});

export default app;
