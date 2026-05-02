import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, ordersTable, orderItemsTable, corporatesTable, insertInvoiceSchema } from "@workspace/db/schema";
import { eq, and, inArray, lt, sql } from "drizzle-orm";

const router = Router();

router.get("/invoices", async (req, res) => {
  try {
    // Auto-mark sent invoices as overdue when their due date has passed
    await db.update(invoicesTable)
      .set({ status: "overdue", updatedAt: new Date() })
      .where(and(
        eq(invoicesTable.status, "sent"),
        lt(invoicesTable.dueDate, sql`now()`),
      ));

    const { corporate_id, status } = req.query as Record<string, string>;
    const conditions = [];
    if (corporate_id) conditions.push(eq(invoicesTable.corporateId, corporate_id));
    if (status) conditions.push(eq(invoicesTable.status, status as any));

    const invoices = await db.select().from(invoicesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(invoicesTable.createdAt);

    const corpIds = [...new Set(invoices.map((i) => i.corporateId).filter(Boolean))] as string[];
    const corps = corpIds.length
      ? await db.select({ id: corporatesTable.id, name: corporatesTable.name }).from(corporatesTable).where(inArray(corporatesTable.id, corpIds))
      : [];
    const corpMap = Object.fromEntries(corps.map((c) => [c.id, c.name]));
    res.json(invoices.map((i) => ({ ...i, corporate_name: i.corporateId ? (corpMap[i.corporateId] ?? null) : null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id));
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    let corporateName: string | null = null;
    let corporateAddress: string | null = null;
    let orderReference: string | null = null;
    let lineItems: any[] = [];

    if (invoice.corporateId) {
      const [corp] = await db.select({
        name: corporatesTable.name,
        city: corporatesTable.city,
        kraPin: corporatesTable.kraPin,
      }).from(corporatesTable).where(eq(corporatesTable.id, invoice.corporateId));
      corporateName = corp?.name ?? null;
      corporateAddress = corp?.city ?? null;
    }

    if (invoice.orderId) {
      const [order] = await db.select({ reference: ordersTable.reference }).from(ordersTable).where(eq(ordersTable.id, invoice.orderId));
      orderReference = order?.reference ?? null;

      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, invoice.orderId));
      lineItems = items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        brandedPackaging: item.brandedPackaging,
        personalisationText: item.personalisationText,
      }));
    }

    res.json({
      ...invoice,
      corporate_name: corporateName,
      corporate_address: corporateAddress,
      order_reference: orderReference,
      line_items: lineItems,
    });
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

router.put("/invoices/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (status === "paid") updateData.paidAt = new Date();
    const [updated] = await db.update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Invoice not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update invoice", details: String(err) });
  }
});

export default router;
