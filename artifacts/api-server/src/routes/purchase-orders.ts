import { Router } from "express";
import { db } from "@workspace/db";
import {
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  productsTable,
  suppliersTable,
} from "@workspace/db/schema";
import { eq, desc, sql, ilike, and } from "drizzle-orm";

const router = Router();

router.get("/purchase-orders", async (req, res) => {
  try {
    const { status, search, limit: limitStr, offset: offsetStr } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr ?? "20") || 20, 100);
    const offset = parseInt(offsetStr ?? "0") || 0;

    const rows = await db
      .select({
        id: purchaseOrdersTable.id,
        reference: purchaseOrdersTable.reference,
        supplierId: purchaseOrdersTable.supplierId,
        supplierName: suppliersTable.name,
        status: purchaseOrdersTable.status,
        totalAmount: purchaseOrdersTable.totalAmount,
        expectedDate: purchaseOrdersTable.expectedDate,
        receivedDate: purchaseOrdersTable.receivedDate,
        createdAt: purchaseOrdersTable.createdAt,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
      .orderBy(desc(purchaseOrdersTable.createdAt));

    let filtered = rows;
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) => r.reference.toLowerCase().includes(q) || (r.supplierName ?? "").toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    res.json({ items, total });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

router.post("/purchase-orders", async (req, res) => {
  try {
    const { supplierId, items, notes, expectedDate } = req.body;
    if (!supplierId) return res.status(400).json({ error: "supplierId required" });
    if (!items?.length) return res.status(400).json({ error: "At least one item required" });

    const reference = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const totalAmount = (items as any[]).reduce(
      (sum: number, item: any) => sum + (parseFloat(item.unitCost) || 0) * (parseInt(item.quantity) || 1),
      0
    );

    const [po] = await db
      .insert(purchaseOrdersTable)
      .values({
        reference,
        supplierId,
        notes: notes || null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount: totalAmount.toFixed(2),
      })
      .returning();

    const itemValues = (items as any[]).map((item: any) => ({
      purchaseOrderId: po.id,
      productId: item.productId,
      productName: item.productName ?? "Unknown",
      quantity: parseInt(item.quantity) || 1,
      unitCost: (parseFloat(item.unitCost) || 0).toFixed(2),
      lineTotal: ((parseFloat(item.unitCost) || 0) * (parseInt(item.quantity) || 1)).toFixed(2),
    }));

    await db.insert(purchaseOrderItemsTable).values(itemValues);
    res.status(201).json(po);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to create purchase order", details: String(err) });
  }
});

router.get("/purchase-orders/:id", async (req, res) => {
  try {
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, req.params.id));
    if (!po) return res.status(404).json({ error: "Purchase order not found" });

    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, po.supplierId));

    const items = await db
      .select({
        id: purchaseOrderItemsTable.id,
        productId: purchaseOrderItemsTable.productId,
        productName: purchaseOrderItemsTable.productName,
        quantity: purchaseOrderItemsTable.quantity,
        unitCost: purchaseOrderItemsTable.unitCost,
        lineTotal: purchaseOrderItemsTable.lineTotal,
        currentStock: productsTable.stockQty,
        moq: productsTable.moq,
      })
      .from(purchaseOrderItemsTable)
      .leftJoin(productsTable, eq(purchaseOrderItemsTable.productId, productsTable.id))
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, po.id));

    res.json({ ...po, supplier, items });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
});

router.put("/purchase-orders/:id", async (req, res) => {
  try {
    const { status, notes, expectedDate } = req.body;

    const [current] = await db
      .select({ status: purchaseOrdersTable.status })
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, req.params.id));

    if (!current) return res.status(404).json({ error: "Purchase order not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes || null;
    if (expectedDate !== undefined) updates.expectedDate = expectedDate ? new Date(expectedDate) : null;

    if (status === "received" && current.status !== "received") {
      updates.receivedDate = new Date();

      const poItems = await db
        .select()
        .from(purchaseOrderItemsTable)
        .where(eq(purchaseOrderItemsTable.purchaseOrderId, req.params.id));

      for (const item of poItems) {
        await db.execute(
          sql`UPDATE products SET stock_qty = COALESCE(stock_qty, 0) + ${item.quantity}, updated_at = NOW() WHERE id = ${item.productId}`
        );
      }
    }

    const [updated] = await db
      .update(purchaseOrdersTable)
      .set(updates)
      .where(eq(purchaseOrdersTable.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update purchase order", details: String(err) });
  }
});

export default router;
