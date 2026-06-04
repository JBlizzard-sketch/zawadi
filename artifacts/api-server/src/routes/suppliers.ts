import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable, insertSupplierSchema } from "@workspace/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();

router.get("/suppliers/pipeline", async (req, res) => {
  try {
    const rows = await db
      .select({ status: suppliersTable.onboardingStatus, count: sql<number>`count(*)` })
      .from(suppliersTable)
      .groupBy(suppliersTable.onboardingStatus);
    const counts: Record<string, number> = { pending: 0, in_review: 0, approved: 0, rejected: 0 };
    for (const row of rows) {
      if (row.status) counts[row.status] = Number(row.count);
    }
    res.json(counts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch pipeline" });
  }
});

router.get("/suppliers", async (req, res) => {
  try {
    const { is_verified, county, search, onboarding_status, limit: limitStr, offset: offsetStr } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr ?? "50") || 50, 200);
    const offset = parseInt(offsetStr ?? "0") || 0;

    const conditions = [];
    if (is_verified === "true") conditions.push(eq(suppliersTable.isVerified, true));
    if (county) conditions.push(eq(suppliersTable.county, county));
    if (search) conditions.push(ilike(suppliersTable.name, `%${search}%`));
    if (onboarding_status) conditions.push(eq(suppliersTable.onboardingStatus, onboarding_status));

    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult, items] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(suppliersTable).where(where),
      db.select().from(suppliersTable).where(where).orderBy(suppliersTable.name).limit(limit).offset(offset),
    ]);

    res.json({ items, total: Number(countResult[0]?.count ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

router.get("/suppliers/:id", async (req, res) => {
  try {
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, req.params.id));
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const parsed = insertSupplierSchema.parse(req.body);
    const [supplier] = await db.insert(suppliersTable).values(parsed).returning();
    res.status(201).json(supplier);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid supplier data", details: String(err) });
  }
});

router.put("/suppliers/:id", async (req, res) => {
  try {
    const [updated] = await db.update(suppliersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(suppliersTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Supplier not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update supplier", details: String(err) });
  }
});

export default router;
