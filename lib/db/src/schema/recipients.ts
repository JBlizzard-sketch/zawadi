import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const recipientsTable = pgTable("recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department"),
  title: text("title"),
  personalisationMessage: text("personalisation_message"),
  deliveryAddress: text("delivery_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecipientSchema = createInsertSchema(recipientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecipient = z.infer<typeof insertRecipientSchema>;
export type Recipient = typeof recipientsTable.$inferSelect;
