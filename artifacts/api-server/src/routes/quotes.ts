import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, productsTable, ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const VAT_RATE = 0.16; // Kenya VAT 16%

const router = Router();

router.get("/quotes", async (req, res) => {
  try {
    const { corporate_id, status } = req.query as Record<string, string>;
    const conditions = [];
    if (corporate_id) conditions.push(eq(quotesTable.corporateId, corporate_id));
    if (status) conditions.push(eq(quotesTable.status, status as any));
    const quotes = await db.select().from(quotesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(quotesTable.createdAt);
    res.json(quotes);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

router.get("/quotes/:id", async (req, res) => {
  try {
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json(quote);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { corporate_id, items: rawItems = [], notes } = req.body;

    const quoteItems = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, raw.product_id));
      if (!product) continue;

      // Apply bulk tier pricing
      const tiers: { min_qty: number; price_per_unit: number }[] = (product.bulkTiers as any) ?? [];
      let unitPrice = parseFloat(product.unitPrice as string);
      for (const tier of tiers.sort((a, b) => b.min_qty - a.min_qty)) {
        if (raw.quantity >= tier.min_qty) { unitPrice = tier.price_per_unit; break; }
      }

      const lineTotal = unitPrice * raw.quantity;
      subtotal += lineTotal;
      quoteItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: raw.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        branded_packaging: raw.branded_packaging ?? false,
        personalisation: raw.personalisation ?? false,
      });
    }

    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [quote] = await db.insert(quotesTable).values({
      corporateId: corporate_id ?? null,
      status: "draft",
      items: quoteItems as any,
      subtotal: subtotal.toFixed(2),
      vat: vat.toFixed(2),
      total: total.toFixed(2),
      notes: notes ?? null,
      validUntil,
    }).returning();

    res.status(201).json({ ...quote, items: quoteItems });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to generate quote", details: String(err) });
  }
});

router.put("/quotes/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    const [updated] = await db.update(quotesTable)
      .set(updateData)
      .where(eq(quotesTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Quote not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update quote", details: String(err) });
  }
});

router.post("/quotes/:id/convert", async (req, res) => {
  try {
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    if (quote.status === "expired") return res.status(400).json({ error: "Quote has expired" });

    const reference = `ZWD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const items = (quote.items as any[]) ?? [];

    const [order] = await db.insert(ordersTable).values({
      reference,
      corporateId: quote.corporateId!,
      status: "pending",
      subtotal: quote.subtotal,
      vat: quote.vat,
      total: quote.total,
      notes: quote.notes,
      recipientCount: 0,
      quoteId: quote.id,
    }).returning();

    if (items.length) {
      await db.insert(orderItemsTable).values(items.map((item: any) => ({
        orderId: order.id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: String(item.unit_price),
        lineTotal: String(item.line_total),
        brandedPackaging: item.branded_packaging ?? false,
      })));
    }

    await db.update(quotesTable).set({ status: "accepted", updatedAt: new Date() }).where(eq(quotesTable.id, quote.id));

    res.status(201).json(order);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to convert quote to order", details: String(err) });
  }
});

export default router;
