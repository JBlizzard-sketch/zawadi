import { pgTable, text, uuid, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { corporatesTable } from "./corporates";

export const quoteStatusEnum = ["draft", "sent", "accepted", "rejected", "expired"] as const;

export const quotesTable = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference"),
  corporateId: uuid("corporate_id").references(() => corporatesTable.id),
  status: text("status", { enum: quoteStatusEnum }).notNull().default("draft"),
  items: jsonb("items").notNull().default("[]"),
  subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull(),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 16, scale: 2 }).notNull().default("0"),
  vat: numeric("vat", { precision: 16, scale: 2 }).notNull(),
  total: numeric("total", { precision: 16, scale: 2 }).notNull(),
  notes: text("notes"),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
