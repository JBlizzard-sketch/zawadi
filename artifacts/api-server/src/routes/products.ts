import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productImagesTable,
  categoriesTable,
  suppliersTable,
  insertProductSchema,
} from "@workspace/db/schema";
import { eq, and, gte, lte, ilike, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/products", async (req, res) => {
  try {
    const { category_id, supplier_id, min_price, max_price, search, is_featured, limit = "24", offset = "0" } = req.query as Record<string, string>;

    const conditions = [];
    conditions.push(eq(productsTable.isActive, true));
    if (category_id) conditions.push(eq(productsTable.categoryId, category_id));
    if (supplier_id) conditions.push(eq(productsTable.supplierId, supplier_id));
    if (min_price) conditions.push(gte(productsTable.unitPrice, min_price));
    if (max_price) conditions.push(lte(productsTable.unitPrice, max_price));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (is_featured === "true") conditions.push(eq(productsTable.isFeatured, true));

    const [items, [{ count }]] = await Promise.all([
      db.select().from(productsTable)
        .where(and(...conditions))
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .orderBy(productsTable.createdAt),
      db.select({ count: sql<number>`count(*)` }).from(productsTable).where(and(...conditions)),
    ]);

    // Attach primary images
    const productIds = items.map((p) => p.id);
    const images = productIds.length > 0
      ? await db.select().from(productImagesTable).where(and(inArray(productImagesTable.productId, productIds), eq(productImagesTable.isPrimary, true)))
      : [];
    const imageMap = Object.fromEntries(images.map((img) => [img.productId, img]));

    const enriched = items.map((p) => ({ ...p, images: imageMap[p.id] ? [imageMap[p.id]] : [] }));

    res.json({ items: enriched, total: Number(count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });

    const [images, [category], [supplier]] = await Promise.all([
      db.select().from(productImagesTable).where(eq(productImagesTable.productId, product.id)),
      db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)),
      db.select().from(suppliersTable).where(eq(suppliersTable.id, product.supplierId)),
    ]);

    res.json({ ...product, images, category: category ?? null, supplier: supplier ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const parsed = insertProductSchema.parse({ ...req.body, slug: req.body.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") });
    const [product] = await db.insert(productsTable).values(parsed).returning();
    res.status(201).json(product);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid product data", details: String(err) });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const [updated] = await db.update(productsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(productsTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update product", details: String(err) });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Product image management
router.post("/products/:id/images", async (req, res) => {
  try {
    const { url, alt, isPrimary } = req.body;
    if (!url) { res.status(400).json({ error: "url is required" }); return; }

    if (isPrimary) {
      await db.update(productImagesTable)
        .set({ isPrimary: false })
        .where(eq(productImagesTable.productId, req.params.id));
    }

    const [image] = await db.insert(productImagesTable).values({
      productId: req.params.id,
      url,
      alt: alt ?? null,
      isPrimary: isPrimary ?? false,
    }).returning();

    res.status(201).json(image);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to add image", details: String(err) });
  }
});

router.put("/products/:id/images/:imageId/primary", async (req, res) => {
  try {
    await db.update(productImagesTable)
      .set({ isPrimary: false })
      .where(eq(productImagesTable.productId, req.params.id));

    const [updated] = await db.update(productImagesTable)
      .set({ isPrimary: true })
      .where(and(eq(productImagesTable.id, req.params.imageId), eq(productImagesTable.productId, req.params.id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Image not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to set primary image" });
  }
});

router.delete("/products/:id/images/:imageId", async (req, res) => {
  try {
    await db.delete(productImagesTable)
      .where(and(eq(productImagesTable.id, req.params.imageId), eq(productImagesTable.productId, req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
