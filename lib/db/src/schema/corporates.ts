import { pgTable, text, uuid, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const corporateTierEnum = ["standard", "premium", "enterprise"] as const;
export const paymentTermsEnum = ["prepaid", "net_15", "net_30", "net_60"] as const;

export const corporatesTable = pgTable("corporates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  kraPin: text("kra_pin"),
  address: text("address"),
  city: text("city"),
  industry: text("industry"),
  tier: text("tier", { enum: corporateTierEnum }).notNull().default("standard"),
  paymentTerms: text("payment_terms", { enum: paymentTermsEnum }),
  accountManagerName: text("account_manager_name"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpend: numeric("total_spend", { precision: 16, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCorporateSchema = createInsertSchema(corporatesTable).omit({ id: true, createdAt: true, updatedAt: true, totalOrders: true, totalSpend: true });
export type InsertCorporate = z.infer<typeof insertCorporateSchema>;
export type Corporate = typeof corporatesTable.$inferSelect;
