import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { corporatesTable } from "./corporates";

export const corporateContactsTable = pgTable("corporate_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  corporateId: uuid("corporate_id").notNull().references(() => corporatesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCorporateContactSchema = createInsertSchema(corporateContactsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCorporateContact = z.infer<typeof insertCorporateContactSchema>;
export type CorporateContact = typeof corporateContactsTable.$inferSelect;
