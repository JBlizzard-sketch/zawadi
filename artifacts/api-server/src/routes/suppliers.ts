import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable, insertSupplierSchema } from "@workspace/db/schema";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/suppliers", async (req, res) => {
  try {
    const { is_verified, county, search } = req.query as Record<string, string>;
    const conditions = [];
    if (is_verified === "true") conditions.push(eq(suppliersTable.isVerified, true));
    if (county) conditions.push(eq(suppliersTable.county, county));
    if (search) conditions.push(ilike(suppliersTable.name, `%${search}%`));

    const suppliers = await db.select().from(suppliersTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(suppliersTable.name);
    res.json(suppliers);
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
