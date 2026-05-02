import { pgTable, text, uuid, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { corporatesTable } from "./corporates";
import { productsTable } from "./products";

export const hamperStatusEnum = ["draft", "saved", "ordered"] as const;

export const hampersTable = pgTable("hampers", {
  id: uuid("id").primaryKey().defaultRandom(),
  corporateId: uuid("corporate_id").references(() => corporatesTable.id),
  name: text("name").notNull(),
  occasion: text("occasion"),
  totalPrice: numeric("total_price", { precision: 16, scale: 2 }).notNull().default("0"),
  itemCount: integer("item_count").notNull().default(0),
  status: text("status", { enum: hamperStatusEnum }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hamperItemsTable = pgTable("hamper_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  hamperId: uuid("hamper_id").notNull().references(() => hampersTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHamperSchema = createInsertSchema(hampersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHamperItemSchema = createInsertSchema(hamperItemsTable).omit({ id: true, createdAt: true });
export type InsertHamper = z.infer<typeof insertHamperSchema>;
export type Hamper = typeof hampersTable.$inferSelect;
export type HamperItem = typeof hamperItemsTable.$inferSelect;
