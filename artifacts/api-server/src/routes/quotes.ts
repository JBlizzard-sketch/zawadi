import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, productsTable, ordersTable, orderItemsTable, corporatesTable } from "@workspace/db/schema";
import { eq, and, inArray, lt, sql, desc } from "drizzle-orm";

const VAT_RATE = 0.16; // Kenya VAT 16%

function calcTotals(subtotal: number, discountPct: number) {
  const pct = Math.max(0, Math.min(100, discountPct));
  const discountAmount = subtotal * pct / 100;
  const taxable = subtotal - discountAmount;
  const vat = taxable * VAT_RATE;
  const total = taxable + vat;
  return { discountAmount, vat, total };
}

const router = Router();

router.get("/quotes", async (req, res) => {
  try {
    // Auto-expire sent quotes whose valid_until has passed
    await db.update(quotesTable)
      .set({ status: "expired" })
      .where(and(
        inArray(quotesTable.status, ["sent", "draft"] as any[]),
        lt(quotesTable.validUntil, sql`now()`)
      ));

    const { corporate_id, status, search, limit: limitStr, offset: offsetStr } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr ?? "50") || 50, 200);
    const offset = parseInt(offsetStr ?? "0") || 0;

    const conditions = [];
    if (corporate_id) conditions.push(eq(quotesTable.corporateId, corporate_id));
    if (status) conditions.push(eq(quotesTable.status, status as any));
    const quotes = await db.select().from(quotesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(quotesTable.createdAt));

    // Enrich with corporate names
    const corpIds = [...new Set(quotes.map((q) => q.corporateId).filter(Boolean))] as string[];
    const corps = corpIds.length
      ? await db.select({ id: corporatesTable.id, name: corporatesTable.name }).from(corporatesTable).where(inArray(corporatesTable.id, corpIds))
      : [];
    const corpMap = Object.fromEntries(corps.map((c) => [c.id, c.name]));

    let enriched = quotes.map((q) => ({ ...q, corporate_name: q.corporateId ? (corpMap[q.corporateId] ?? null) : null }));

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter((r) =>
        (r.reference ?? "").toLowerCase().includes(q) ||
        (r.corporate_name ?? "").toLowerCase().includes(q)
      );
    }

    const total = enriched.length;
    const items = enriched.slice(offset, offset + limit);
    res.json({ items, total });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
});

router.get("/quotes/:id", async (req, res) => {
  try {
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
    if (!quote) return res.status(404).json({ error: "Quote not found" });

    let corporateName: string | null = null;
    if (quote.corporateId) {
      const [corp] = await db.select({ name: corporatesTable.name }).from(corporatesTable).where(eq(corporatesTable.id, quote.corporateId));
      corporateName = corp?.name ?? null;
    }

    res.json({ ...quote, corporate_name: corporateName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quote" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { corporate_id, items: rawItems = [], notes, valid_until, discount_pct } = req.body;

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

    const discountPct = parseFloat(discount_pct ?? "0") || 0;
    const { discountAmount, vat, total } = calcTotals(subtotal, discountPct);
    const validUntil = valid_until ? new Date(valid_until) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const reference = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const [quote] = await db.insert(quotesTable).values({
      reference,
      corporateId: corporate_id ?? null,
      status: "draft",
      items: quoteItems as any,
      subtotal: subtotal.toFixed(2),
      discountPct: discountPct.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
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
    const { status, notes, discount_pct } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (discount_pct !== undefined) {
      // Recalculate totals with new discount
      const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
      if (existing) {
        const subtotal = parseFloat(existing.subtotal as string);
        const discountPct = parseFloat(discount_pct ?? "0") || 0;
        const { discountAmount, vat, total } = calcTotals(subtotal, discountPct);
        updateData.discountPct = discountPct.toFixed(2);
        updateData.discountAmount = discountAmount.toFixed(2);
        updateData.vat = vat.toFixed(2);
        updateData.total = total.toFixed(2);
      }
    }

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

    const { delivery_address, delivery_date } = req.body ?? {};
    const reference = `ZWD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const items = (quote.items as any[]) ?? [];

    const [order] = await db.insert(ordersTable).values({
      reference,
      corporateId: quote.corporateId!,
      status: "pending",
      subtotal: quote.subtotal,
      discountPct: quote.discountPct,
      discountAmount: quote.discountAmount,
      vat: quote.vat,
      total: quote.total,
      notes: quote.notes,
      recipientCount: 0,
      quoteId: quote.id,
      deliveryAddress: delivery_address ?? null,
      deliveryDate: delivery_date ? new Date(delivery_date) : null,
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
