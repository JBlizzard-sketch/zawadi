import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  corporatesTable,
  productsTable,
  recipientsTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const VAT_RATE = 0.16;
const router = Router();

router.get("/orders", async (req, res) => {
  try {
    const { corporate_id, status, limit = "20", offset = "0" } = req.query as Record<string, string>;
    const conditions = [];
    if (corporate_id) conditions.push(eq(ordersTable.corporateId, corporate_id));
    if (status) conditions.push(eq(ordersTable.status, status as any));

    const [items, [{ count }]] = await Promise.all([
      db.select().from(ordersTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .limit(parseInt(limit))
        .offset(parseInt(offset))
        .orderBy(ordersTable.createdAt),
      db.select({ count: sql<number>`count(*)` }).from(ordersTable)
        .where(conditions.length ? and(...conditions) : undefined),
    ]);

    // Enrich with corporate name
    const corporateIds = [...new Set(items.map((o) => o.corporateId))];
    const corps = corporateIds.length > 0
      ? await db.select({ id: corporatesTable.id, name: corporatesTable.name }).from(corporatesTable)
      : [];
    const corpMap = Object.fromEntries(corps.map((c) => [c.id, c.name]));

    const enriched = items.map((o) => ({ ...o, corporate_name: corpMap[o.corporateId] ?? null }));

    res.json({ items: enriched, total: Number(count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [items, recipients] = await Promise.all([
      db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id)),
      db.select().from(recipientsTable).where(eq(recipientsTable.orderId, order.id)),
    ]);

    res.json({ ...order, items, recipients });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const { corporate_id, items: rawItems = [], delivery_address, delivery_date, notes, quote_id } = req.body;

    let subtotal = 0;
    const enrichedItems = [];

    for (const raw of rawItems) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, raw.product_id));
      if (!product) continue;
      const unitPrice = parseFloat(product.unitPrice as string);
      const lineTotal = unitPrice * raw.quantity;
      subtotal += lineTotal;
      enrichedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: raw.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        brandedPackaging: raw.branded_packaging ?? false,
        personalisationText: raw.personalisation_text ?? null,
      });
    }

    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    const reference = `ZWD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const [order] = await db.insert(ordersTable).values({
      reference,
      corporateId: corporate_id,
      status: "pending",
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
      deliveryAddress: delivery_address ?? null,
      deliveryDate: delivery_date ? new Date(delivery_date) : null,
      notes: notes ?? null,
      recipientCount: 0,
      quoteId: quote_id ?? null,
    }).returning();

    if (enrichedItems.length) {
      await db.insert(orderItemsTable).values(enrichedItems.map((i) => ({ ...i, orderId: order.id })));
    }

    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to create order", details: String(err) });
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const [updated] = await db.update(ordersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update order", details: String(err) });
  }
});

router.post("/orders/:id/cancel", async (req, res) => {
  try {
    const [updated] = await db.update(ordersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Order not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

export default router;
