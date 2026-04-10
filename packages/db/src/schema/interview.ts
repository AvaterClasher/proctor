import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const candidate = sqliteTable(
  "candidate",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("candidate_email_idx").on(table.email)],
);

export const interview = sqliteTable(
  "interview",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidate.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["scheduled", "in_progress", "completed", "failed"],
    })
      .default("scheduled")
      .notNull(),
    roomName: text("room_name").notNull(),
    transcript: text("transcript"),
    durationSecs: integer("duration_secs"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("interview_candidateId_idx").on(table.candidateId),
    index("interview_status_idx").on(table.status),
  ],
);

export const assessment = sqliteTable("assessment", {
  id: text("id").primaryKey(),
  interviewId: text("interview_id")
    .notNull()
    .unique()
    .references(() => interview.id, { onDelete: "cascade" }),
  overallScore: real("overall_score").notNull(),
  recommendation: text("recommendation", {
    enum: ["strong_yes", "yes", "maybe", "no", "strong_no"],
  }).notNull(),
  summary: text("summary").notNull(),
  dimensions: text("dimensions", { mode: "json" }).$type<
    Array<{ name: string; score: number; notes: string }>
  >(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

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
