import { pgTable, text, uuid, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const poStatusEnum = ["draft", "sent", "acknowledged", "received", "cancelled"] as const;

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliersTable.id),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  receivedDate: timestamp("received_date", { withTimezone: true }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItemsTable).omit({ id: true, createdAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
