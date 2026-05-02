import { pgTable, text, uuid, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { corporatesTable } from "./corporates";

export const invoiceStatusEnum = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => ordersTable.id),
  corporateId: uuid("corporate_id").references(() => corporatesTable.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  kraPin: text("kra_pin"),
  amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
  vatAmount: numeric("vat_amount", { precision: 16, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 16, scale: 2 }).notNull(),
  status: text("status", { enum: invoiceStatusEnum }).notNull().default("draft"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
