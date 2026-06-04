import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable, insertCategorySchema } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    const counts = await db
      .select({ categoryId: productsTable.categoryId, count: sql<number>`count(*)` })
      .from(productsTable)
      .groupBy(productsTable.categoryId);
    const countMap = Object.fromEntries(counts.map((r) => [r.categoryId, Number(r.count)]));
    const enriched = categories.map((c) => ({ ...c, product_count: countMap[c.id] ?? 0 }));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const parsed = insertCategorySchema.parse(req.body);
    const [category] = await db.insert(categoriesTable).values(parsed).returning();
    res.status(201).json(category);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid category data", details: String(err) });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const [updated] = await db.update(categoriesTable)
      .set({ name, slug, description, updatedAt: new Date() })
      .where(eq(categoriesTable.id, req.params.id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update category", details: String(err) });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    // Check if any products use this category
    const { productsTable } = await import("@workspace/db/schema");
    const { sql } = await import("drizzle-orm");
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(eq(productsTable.categoryId, req.params.id));
    if (Number(count) > 0) {
      res.status(409).json({ error: `Cannot delete — ${count} product${Number(count) !== 1 ? "s" : ""} use this category` });
      return;
    }
    await db.delete(categoriesTable).where(eq(categoriesTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
