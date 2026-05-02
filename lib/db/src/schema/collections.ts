import { pgTable, text, uuid, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const occasionEnum = ["client_gifts", "staff_appreciation", "event_giveaways", "festive_hampers", "onboarding_kits", "custom"] as const;

export const collectionsTable = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  occasion: text("occasion", { enum: occasionEnum }).notNull(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }).notNull().default("0"),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  productCount: integer("product_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionProductsTable = pgTable("collection_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => collectionsTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertCollectionSchema = createInsertSchema(collectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collectionsTable.$inferSelect;
