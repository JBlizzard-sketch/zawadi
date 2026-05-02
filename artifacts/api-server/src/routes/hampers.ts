import { Router } from "express";
import { db } from "@workspace/db";
import {
  hampersTable,
  hamperItemsTable,
  productsTable,
  insertHamperSchema,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

router.get("/hampers", async (req, res) => {
  try {
    const { corporate_id } = req.query as Record<string, string>;
    const conditions = corporate_id ? [eq(hampersTable.corporateId, corporate_id)] : [];
    const hampers = await db.select().from(hampersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(hampersTable.updatedAt);
    res.json(hampers);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch hampers" });
  }
});

router.get("/hampers/:id", async (req, res) => {
  try {
    const [hamper] = await db.select().from(hampersTable).where(eq(hampersTable.id, req.params.id));
    if (!hamper) return res.status(404).json({ error: "Hamper not found" });

    const itemRows = await db.select().from(hamperItemsTable).where(eq(hamperItemsTable.hamperId, hamper.id));
    const productIds = itemRows.map((i) => i.productId);
    const products = productIds.length > 0
      ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
      : [];
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const items = itemRows.map((item) => ({ ...item, product: productMap[item.productId] ?? null }));

    res.json({ ...hamper, items });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch hamper" });
  }
});

router.post("/hampers", async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const parsed = insertHamperSchema.parse(rest);

    let totalPrice = 0;
    const enrichedItems: { productId: string; quantity: number; unitPrice: string }[] = [];

    if (items?.length) {
      for (const item of items) {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.product_id));
        if (!product) continue;
        const price = parseFloat(product.unitPrice as string);
        totalPrice += price * item.quantity;
        enrichedItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.unitPrice as string });
      }
    }

    const [hamper] = await db.insert(hampersTable).values({
      ...parsed,
      totalPrice: totalPrice.toFixed(2),
      itemCount: enrichedItems.length,
    }).returning();

    if (enrichedItems.length) {
      await db.insert(hamperItemsTable).values(enrichedItems.map((i) => ({ ...i, hamperId: hamper.id })));
    }

    res.status(201).json(hamper);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid hamper data", details: String(err) });
  }
});

router.put("/hampers/:id", async (req, res) => {
  try {
    const { items, ...rest } = req.body;
    const [updated] = await db.update(hampersTable)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(hampersTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Hamper not found" });

    if (items !== undefined) {
      await db.delete(hamperItemsTable).where(eq(hamperItemsTable.hamperId, req.params.id));
      if (items.length) {
        let totalPrice = 0;
        const enriched = [];
        for (const item of items) {
          const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.product_id));
          if (!product) continue;
          const price = parseFloat(product.unitPrice as string);
          totalPrice += price * item.quantity;
          enriched.push({ hamperId: req.params.id, productId: product.id, quantity: item.quantity, unitPrice: product.unitPrice as string });
        }
        await db.insert(hamperItemsTable).values(enriched);
        await db.update(hampersTable).set({ totalPrice: totalPrice.toFixed(2), itemCount: enriched.length }).where(eq(hampersTable.id, req.params.id));
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update hamper", details: String(err) });
  }
});

router.delete("/hampers/:id", async (req, res) => {
  try {
    await db.delete(hampersTable).where(eq(hampersTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete hamper" });
  }
});

export default router;
