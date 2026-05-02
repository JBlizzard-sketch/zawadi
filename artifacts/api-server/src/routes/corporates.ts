import { Router } from "express";
import { db } from "@workspace/db";
import { corporatesTable, insertCorporateSchema } from "@workspace/db/schema";
import { eq, and, ilike } from "drizzle-orm";

const router = Router();

router.get("/corporates", async (req, res) => {
  try {
    const { tier, search } = req.query as Record<string, string>;
    const conditions = [];
    if (tier) conditions.push(eq(corporatesTable.tier, tier as any));
    if (search) conditions.push(ilike(corporatesTable.name, `%${search}%`));

    const corporates = await db.select().from(corporatesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(corporatesTable.name);
    res.json(corporates);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch corporates" });
  }
});

router.get("/corporates/:id", async (req, res) => {
  try {
    const [corporate] = await db.select().from(corporatesTable).where(eq(corporatesTable.id, req.params.id));
    if (!corporate) return res.status(404).json({ error: "Corporate not found" });
    res.json(corporate);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch corporate" });
  }
});

router.post("/corporates", async (req, res) => {
  try {
    const parsed = insertCorporateSchema.parse(req.body);
    const [corporate] = await db.insert(corporatesTable).values(parsed).returning();
    res.status(201).json(corporate);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid corporate data", details: String(err) });
  }
});

router.put("/corporates/:id", async (req, res) => {
  try {
    const [updated] = await db.update(corporatesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(corporatesTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Corporate not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update corporate", details: String(err) });
  }
});

export default router;
