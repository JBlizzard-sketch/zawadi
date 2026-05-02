import { Router } from "express";
import { db } from "@workspace/db";
import { recipientsTable, ordersTable, insertRecipientSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/recipients", async (req, res) => {
  try {
    const { order_id } = req.query as Record<string, string>;
    if (!order_id) return res.status(400).json({ error: "order_id is required" });
    const recipients = await db.select().from(recipientsTable).where(eq(recipientsTable.orderId, order_id));
    res.json(recipients);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recipients" });
  }
});

router.post("/recipients", async (req, res) => {
  try {
    const parsed = insertRecipientSchema.parse(req.body);
    const [recipient] = await db.insert(recipientsTable).values(parsed).returning();
    // Update recipient count on order
    await db.update(ordersTable).set({
      recipientCount: eq(ordersTable.id, parsed.orderId) as any,
      updatedAt: new Date(),
    }).where(eq(ordersTable.id, parsed.orderId));
    res.status(201).json(recipient);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid recipient data", details: String(err) });
  }
});

router.post("/recipients/bulk", async (req, res) => {
  try {
    const { order_id, recipients: rawList = [], default_message_template } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id is required" });

    let created = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const raw = rawList[i];
      try {
        let message = raw.personalisation_message ?? null;
        if (!message && default_message_template) {
          message = default_message_template
            .replace("{{name}}", raw.name ?? "")
            .replace("{{title}}", raw.title ?? "")
            .replace("{{department}}", raw.department ?? "");
        }
        const parsed = insertRecipientSchema.parse({ ...raw, orderId: order_id, personalisationMessage: message });
        await db.insert(recipientsTable).values(parsed);
        created++;
      } catch (e) {
        failed++;
        errors.push({ row: i + 1, error: String(e) });
      }
    }

    // Update recipient count on order
    const total = await db.select().from(recipientsTable).where(eq(recipientsTable.orderId, order_id));
    await db.update(ordersTable).set({ recipientCount: total.length, updatedAt: new Date() }).where(eq(ordersTable.id, order_id));

    res.status(201).json({ created, failed, total: rawList.length, errors });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Bulk upload failed", details: String(err) });
  }
});

router.put("/recipients/:id", async (req, res) => {
  try {
    const [updated] = await db.update(recipientsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(recipientsTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Recipient not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update recipient", details: String(err) });
  }
});

router.delete("/recipients/:id", async (req, res) => {
  try {
    await db.delete(recipientsTable).where(eq(recipientsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete recipient" });
  }
});

export default router;
