import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const analysisCasesTable = pgTable("analysis_cases", {
  analysisId: uuid("analysis_id").primaryKey(),
  sessionId: uuid("session_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  inputType: text("input_type").notNull(),
  riskScore: integer("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(),
  category: text("category").notNull(),
  summary: text("summary").notNull(),
});

export const insertAnalysisCaseSchema = createInsertSchema(analysisCasesTable).omit({
  createdAt: true,
});

export type InsertAnalysisCase = z.infer<typeof insertAnalysisCaseSchema>;
export type AnalysisCase = typeof analysisCasesTable.$inferSelect;