import { pgTable, text, uuid, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const onboardingStatusEnum = ["pending", "under_review", "approved", "rejected"] as const;

export const suppliersTable = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  county: text("county").notNull(),
  description: text("description"),
  story: text("story"),
  coverImageUrl: text("cover_image_url"),
  logoUrl: text("logo_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  onboardingStatus: text("onboarding_status", { enum: onboardingStatusEnum }).notNull().default("pending"),
  tags: text("tags").array().notNull().default([]),
  womenLed: boolean("women_led").notNull().default(false),
  artisanCount: integer("artisan_count"),
  certifications: text("certifications").array().notNull().default([]),
  esgNotes: text("esg_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
