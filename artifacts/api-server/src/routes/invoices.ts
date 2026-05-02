import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, ordersTable, corporatesTable, insertInvoiceSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/invoices", async (req, res) => {
  try {
    const { corporate_id, status } = req.query as Record<string, string>;
    const conditions = [];
    if (corporate_id) conditions.push(eq(invoicesTable.corporateId, corporate_id));
    if (status) conditions.push(eq(invoicesTable.status, status as any));

    const invoices = await db.select().from(invoicesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(invoicesTable.createdAt);
    res.json(invoices);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id));
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const { order_id, due_date } = req.body;
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, order_id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const [corporate] = await db.select().from(corporatesTable).where(eq(corporatesTable.id, order.corporateId));

    const year = new Date().getFullYear();
    const count = await db.select().from(invoicesTable);
    const invoiceNumber = `INV-${year}-${String(count.length + 1).padStart(4, "0")}`;

    const [invoice] = await db.insert(invoicesTable).values({
      orderId: order.id,
      corporateId: order.corporateId,
      invoiceNumber,
      kraPin: corporate?.kraPin ?? null,
      amount: order.subtotal,
      vatAmount: order.vat,
      totalAmount: order.total,
      status: "draft",
      dueDate: due_date ? new Date(due_date) : null,
    }).returning();

    res.status(201).json(invoice);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to create invoice", details: String(err) });
  }
});

export default router;
