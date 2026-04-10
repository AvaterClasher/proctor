import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const candidate = sqliteTable(
  "candidate",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    status: text("status", {
      enum: ["pending", "interviewing", "completed", "reviewed"],
    })
      .default("pending")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("candidate_userId_idx").on(table.userId)],
);

export const interview = sqliteTable(
  "interview",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    livekitRoom: text("livekit_room").notNull(),
    status: text("status", {
      enum: ["scheduled", "in_progress", "completed", "failed"],
    })
      .default("scheduled")
      .notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    durationSecs: integer("duration_secs"),
    transcript: text("transcript"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("interview_candidateId_idx").on(table.candidateId)],
);

export const assessment = sqliteTable(
  "assessment",
  {
    id: text("id").primaryKey(),
    interviewId: text("interview_id")
      .notNull()
      .unique()
      .references(() => interview.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    recommendation: text("recommendation", {
      enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
    }).notNull(),
    summary: text("summary").notNull(),
    dimensions: text("dimensions").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("assessment_interviewId_idx").on(table.interviewId)],
);

export const candidateRelations = relations(candidate, ({ many }) => ({
  interviews: many(interview),
}));

export const interviewRelations = relations(interview, ({ one }) => ({
  candidate: one(candidate, {
    fields: [interview.candidateId],
    references: [candidate.id],
  }),
  assessment: one(assessment),
}));

export const assessmentRelations = relations(assessment, ({ one }) => ({
  interview: one(interview, {
    fields: [assessment.interviewId],
    references: [interview.id],
  }),
}));
