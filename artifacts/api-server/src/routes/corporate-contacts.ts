import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { corporateContactsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { corporateId: string; contactId?: string };

const router = Router({ mergeParams: true });

router.get("/", async (req: Request<Params>, res: Response) => {
  try {
    const contacts = await db.select().from(corporateContactsTable)
      .where(eq(corporateContactsTable.corporateId, req.params.corporateId))
      .orderBy(corporateContactsTable.isPrimary, corporateContactsTable.createdAt);
    res.json(contacts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.post("/", async (req: Request<Params>, res: Response) => {
  try {
    const { name, title, email, phone, isPrimary, notes } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    if (isPrimary) {
      await db.update(corporateContactsTable)
        .set({ isPrimary: false })
        .where(eq(corporateContactsTable.corporateId, req.params.corporateId));
    }

    const [contact] = await db.insert(corporateContactsTable).values({
      corporateId: req.params.corporateId,
      name,
      title: title ?? null,
      email: email ?? null,
      phone: phone ?? null,
      isPrimary: isPrimary ?? false,
      notes: notes ?? null,
    }).returning();

    res.status(201).json(contact);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to create contact", details: String(err) });
  }
});

router.put("/:contactId", async (req: Request<Params>, res: Response) => {
  try {
    const { name, title, email, phone, isPrimary, notes } = req.body;

    if (isPrimary) {
      await db.update(corporateContactsTable)
        .set({ isPrimary: false })
        .where(eq(corporateContactsTable.corporateId, req.params.corporateId));
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (isPrimary !== undefined) updates.isPrimary = isPrimary;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(corporateContactsTable)
      .set(updates)
      .where(and(
        eq(corporateContactsTable.id, req.params.contactId!),
        eq(corporateContactsTable.corporateId, req.params.corporateId),
      ))
      .returning();

    if (!updated) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update contact", details: String(err) });
  }
});

router.delete("/:contactId", async (req: Request<Params>, res: Response) => {
  try {
    const [deleted] = await db.delete(corporateContactsTable)
      .where(and(
        eq(corporateContactsTable.id, req.params.contactId!),
        eq(corporateContactsTable.corporateId, req.params.corporateId),
      ))
      .returning({ id: corporateContactsTable.id });
    if (!deleted) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
