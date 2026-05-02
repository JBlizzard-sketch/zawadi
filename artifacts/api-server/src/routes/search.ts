import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  quotesTable,
  corporatesTable,
  suppliersTable,
  productsTable,
} from "@workspace/db/schema";
import { ilike, or, inArray } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const raw = (req.query["q"] as string ?? "").trim();
    if (raw.length < 2) {
      return res.json({ orders: [], quotes: [], corporates: [], suppliers: [], products: [] });
    }
    const pattern = `%${raw}%`;
    const LIMIT = 5;

    const [orders, quotes, corporates, suppliers, products] = await Promise.all([
      db.select({
        id: ordersTable.id,
        reference: ordersTable.reference,
        status: ordersTable.status,
        total: ordersTable.total,
        corporateId: ordersTable.corporateId,
      }).from(ordersTable).where(ilike(ordersTable.reference, pattern)).limit(LIMIT),

      db.select({
        id: quotesTable.id,
        reference: quotesTable.reference,
        status: quotesTable.status,
        total: quotesTable.total,
        corporateId: quotesTable.corporateId,
      }).from(quotesTable).where(ilike(quotesTable.reference, pattern)).limit(LIMIT),

      db.select({
        id: corporatesTable.id,
        name: corporatesTable.name,
        industry: corporatesTable.industry,
        tier: corporatesTable.tier,
      }).from(corporatesTable).where(
        or(ilike(corporatesTable.name, pattern), ilike(corporatesTable.industry, pattern))
      ).limit(LIMIT),

      db.select({
        id: suppliersTable.id,
        name: suppliersTable.name,
        county: suppliersTable.county,
      }).from(suppliersTable).where(
        or(ilike(suppliersTable.name, pattern), ilike(suppliersTable.county, pattern))
      ).limit(LIMIT),

      db.select({
        id: productsTable.id,
        name: productsTable.name,
        origin: productsTable.origin,
        unitPrice: productsTable.unitPrice,
      }).from(productsTable).where(ilike(productsTable.name, pattern)).limit(LIMIT),
    ]);

    const allCorpIds = [...new Set([
      ...orders.map((o) => o.corporateId),
      ...quotes.map((q) => q.corporateId),
    ].filter(Boolean))] as string[];

    const corpMap: Record<string, string> = {};
    if (allCorpIds.length > 0) {
      const corps = await db
        .select({ id: corporatesTable.id, name: corporatesTable.name })
        .from(corporatesTable)
        .where(inArray(corporatesTable.id, allCorpIds));
      corps.forEach((c) => { corpMap[c.id] = c.name; });
    }

    return res.json({
      orders: orders.map((o) => ({ ...o, corporate_name: corpMap[o.corporateId ?? ""] ?? null })),
      quotes: quotes.map((q) => ({ ...q, corporate_name: corpMap[q.corporateId ?? ""] ?? null })),
      corporates,
      suppliers,
      products,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
