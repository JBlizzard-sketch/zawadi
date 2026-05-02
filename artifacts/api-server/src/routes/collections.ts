import { Router } from "express";
import { db } from "@workspace/db";
import {
  collectionsTable,
  collectionProductsTable,
  productsTable,
  productImagesTable,
  insertCollectionSchema,
} from "@workspace/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

const router = Router();

router.get("/collections", async (req, res) => {
  try {
    const { occasion, is_featured, min_price, max_price } = req.query as Record<string, string>;
    const conditions = [];
    if (occasion) conditions.push(eq(collectionsTable.occasion, occasion as any));
    if (is_featured === "true") conditions.push(eq(collectionsTable.isFeatured, true));
    if (min_price) conditions.push(gte(collectionsTable.minPrice, min_price));
    if (max_price) conditions.push(lte(collectionsTable.maxPrice, max_price));

    const collections = await db.select().from(collectionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(collectionsTable.createdAt);
    res.json(collections);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

router.get("/collections/:id", async (req, res) => {
  try {
    const [collection] = await db.select().from(collectionsTable).where(eq(collectionsTable.id, req.params.id));
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    const cpRows = await db.select().from(collectionProductsTable)
      .where(eq(collectionProductsTable.collectionId, collection.id))
      .orderBy(collectionProductsTable.displayOrder);

    const productIds = cpRows.map((cp) => cp.productId);
    const products = productIds.length > 0
      ? await db.select().from(productsTable).where(eq(productsTable.isActive, true))
      : [];

    // Attach primary images
    const images = productIds.length > 0
      ? await db.select().from(productImagesTable)
          .where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true)))
      : [];
    const imageMap = Object.fromEntries(images.map((img) => [img.productId, img.url]));

    const productMap = Object.fromEntries(products.map((p) => [p.id, { ...p, imageUrl: imageMap[p.id] ?? null }]));
    const orderedProducts = cpRows.map((cp) => productMap[cp.productId]).filter(Boolean);

    res.json({ ...collection, products: orderedProducts });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch collection" });
  }
});

router.post("/collections", async (req, res) => {
  try {
    const { product_ids, ...rest } = req.body;
    const parsed = insertCollectionSchema.parse({
      ...rest,
      slug: rest.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    });
    const [collection] = await db.insert(collectionsTable).values(parsed).returning();

    if (product_ids?.length) {
      await db.insert(collectionProductsTable).values(
        product_ids.map((pid: string, i: number) => ({
          collectionId: collection.id,
          productId: pid,
          displayOrder: i,
        }))
      );
    }

    res.status(201).json(collection);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid collection data", details: String(err) });
  }
});

router.put("/collections/:id", async (req, res) => {
  try {
    const { product_ids, ...rest } = req.body;
    const [updated] = await db.update(collectionsTable)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(collectionsTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Collection not found" });

    if (product_ids) {
      await db.delete(collectionProductsTable).where(eq(collectionProductsTable.collectionId, req.params.id));
      if (product_ids.length) {
        await db.insert(collectionProductsTable).values(
          product_ids.map((pid: string, i: number) => ({
            collectionId: req.params.id,
            productId: pid,
            displayOrder: i,
          }))
        );
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update collection", details: String(err) });
  }
});

export default router;
