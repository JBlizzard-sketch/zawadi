import { Router } from "express";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const SINGLETON_ID = "singleton";

async function getOrCreateSettings() {
  const [existing] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.id, SINGLETON_ID));
  if (existing) return existing;
  const [created] = await db.insert(companySettingsTable).values({ id: SINGLETON_ID }).returning();
  return created;
}

router.get("/settings", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const allowed = [
      "companyName", "kraPin", "address", "city", "country", "phone", "email",
      "logoUrl", "website", "accountManagerName", "accountManagerEmail",
      "accountManagerPhone", "bankName", "bankAccount", "bankBranch",
      "swiftCode", "defaultPaymentTermsDays", "invoiceFooter",
    ];
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const [existing] = await db.select({ id: companySettingsTable.id }).from(companySettingsTable).where(eq(companySettingsTable.id, SINGLETON_ID));
    if (existing) {
      const [updated] = await db.update(companySettingsTable).set(updates).where(eq(companySettingsTable.id, SINGLETON_ID)).returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(companySettingsTable).values({ id: SINGLETON_ID, ...updates }).returning();
      return res.json(created);
    }
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update settings", details: String(err) });
  }
});

export default router;
