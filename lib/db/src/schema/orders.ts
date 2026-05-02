import { pgTable, text, uuid, integer, numeric, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { corporatesTable } from "./corporates";
import { productsTable } from "./products";

export const orderStatusEnum = [
  "pending", "confirmed", "in_production", "quality_check",
  "packaging", "dispatched", "delivered", "cancelled"
] as const;

export const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  corporateId: uuid("corporate_id").notNull().references(() => corporatesTable.id),
  status: text("status", { enum: orderStatusEnum }).notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 16, scale: 2 }).notNull(),
  vat: numeric("vat", { precision: 16, scale: 2 }).notNull(),
  total: numeric("total", { precision: 16, scale: 2 }).notNull(),
  deliveryAddress: text("delivery_address"),
  deliveryDate: timestamp("delivery_date", { withTimezone: true }),
  notes: text("notes"),
  recipientCount: integer("recipient_count").notNull().default(0),
  quoteId: uuid("quote_id"),
  statusLog: jsonb("status_log").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 16, scale: 2 }).notNull(),
  personalisationText: text("personalisation_text"),
  brandedPackaging: boolean("branded_packaging").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
