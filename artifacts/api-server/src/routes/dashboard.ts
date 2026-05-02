import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  corporatesTable,
  suppliersTable,
  productsTable,
  orderItemsTable,
} from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [
      [{ totalOrders }],
      [{ totalRevenue }],
      [{ totalCorporates }],
      [{ totalSuppliers }],
      ordsByStatus,
      revenueByMonth,
    ] = await Promise.all([
      db.select({ totalOrders: sql<number>`count(*)` }).from(ordersTable),
      db.select({ totalRevenue: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable).where(eq(ordersTable.status, "delivered")),
      db.select({ totalCorporates: sql<number>`count(*)` }).from(corporatesTable),
      db.select({ totalSuppliers: sql<number>`count(*)` }).from(suppliersTable).where(eq(suppliersTable.isVerified, true)),
      db.select({ status: ordersTable.status, count: sql<number>`count(*)` }).from(ordersTable).groupBy(ordersTable.status),
      db.select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        revenue: sql<number>`coalesce(sum(total::numeric), 0)`,
      }).from(ordersTable).groupBy(sql`to_char(created_at, 'YYYY-MM')`).orderBy(sql`to_char(created_at, 'YYYY-MM')`),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthlyStats] = await db.select({
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(total::numeric), 0)`,
    }).from(ordersTable).where(sql`created_at >= ${startOfMonth}`);

    const [{ pending }] = await db.select({ pending: sql<number>`count(*)` }).from(ordersTable).where(eq(ordersTable.status, "pending"));

    res.json({
      total_orders: Number(totalOrders),
      total_revenue: Number(totalRevenue),
      total_corporates: Number(totalCorporates),
      total_suppliers: Number(totalSuppliers),
      orders_this_month: Number(monthlyStats?.orders ?? 0),
      revenue_this_month: Number(monthlyStats?.revenue ?? 0),
      pending_orders: Number(pending),
      orders_by_status: ordsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      revenue_by_month: revenueByMonth.map((r) => ({ month: r.month, revenue: Number(r.revenue) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

router.get("/dashboard/corporate/:corporateId", async (req, res) => {
  try {
    const { corporateId } = req.params;
    const [corporate] = await db.select().from(corporatesTable).where(eq(corporatesTable.id, corporateId));
    if (!corporate) return res.status(404).json({ error: "Corporate not found" });

    const [orders, [statsRow], spendByMonth] = await Promise.all([
      db.select().from(ordersTable).where(eq(ordersTable.corporateId, corporateId)).orderBy(desc(ordersTable.createdAt)).limit(5),
      db.select({
        total: sql<number>`count(*)`,
        spend: sql<number>`coalesce(sum(total::numeric), 0)`,
        active: sql<number>`count(*) filter (where status not in ('delivered','cancelled'))`,
      }).from(ordersTable).where(eq(ordersTable.corporateId, corporateId)),
      db.select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        spend: sql<number>`coalesce(sum(total::numeric), 0)`,
      }).from(ordersTable).where(eq(ordersTable.corporateId, corporateId))
        .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
        .orderBy(sql`to_char(created_at, 'YYYY-MM')`),
    ]);

    res.json({
      corporate_id: corporateId,
      total_orders: Number(statsRow?.total ?? 0),
      total_spend: Number(statsRow?.spend ?? 0),
      active_orders: Number(statsRow?.active ?? 0),
      recent_orders: orders,
      upcoming_occasions: [],
      spend_by_month: spendByMonth.map((r) => ({ month: r.month, spend: Number(r.spend) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch corporate dashboard" });
  }
});

router.get("/dashboard/recent-orders", async (req, res) => {
  try {
    const { limit = "10" } = req.query as Record<string, string>;
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(parseInt(limit));
    res.json(orders);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
});

router.get("/dashboard/top-products", async (req, res) => {
  try {
    const { limit = "10" } = req.query as Record<string, string>;
    const topProducts = await db
      .select({
        product_id: orderItemsTable.productId,
        product_name: orderItemsTable.productName,
        total_units: sql<number>`sum(quantity)`,
        total_revenue: sql<number>`sum(line_total::numeric)`,
      })
      .from(orderItemsTable)
      .groupBy(orderItemsTable.productId, orderItemsTable.productName)
      .orderBy(desc(sql`sum(quantity)`))
      .limit(parseInt(limit));

    res.json(topProducts.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      total_units: Number(r.total_units),
      total_revenue: Number(r.total_revenue),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
});

export default router;
