import { pgTable, text, uuid, boolean, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { suppliersTable } from "./suppliers";

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  categoryId: uuid("category_id").notNull().references(() => categoriesTable.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliersTable.id),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  bulkTiers: jsonb("bulk_tiers").notNull().default("[]"),
  moq: integer("moq").notNull().default(1),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  origin: text("origin").notNull(),
  tags: text("tags").array().notNull().default([]),
  occasionTags: text("occasion_tags").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  weightGrams: integer("weight_grams"),
  dimensionsCm: text("dimensions_cm"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImagesTable = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductImageSchema = createInsertSchema(productImagesTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductImage = typeof productImagesTable.$inferSelect;
