import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  corporatesTable,
  suppliersTable,
  productsTable,
  orderItemsTable,
  productImagesTable,
  invoicesTable,
  quotesTable,
} from "@workspace/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

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
        total_units: sql<number>`sum(${orderItemsTable.quantity})`,
        total_revenue: sql<number>`sum(${orderItemsTable.lineTotal}::numeric)`,
        image_url: productImagesTable.url,
      })
      .from(orderItemsTable)
      .leftJoin(
        productImagesTable,
        eq(productImagesTable.productId, orderItemsTable.productId),
      )
      .where(eq(productImagesTable.isPrimary, true))
      .groupBy(orderItemsTable.productId, orderItemsTable.productName, productImagesTable.url)
      .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
      .limit(parseInt(limit));

    res.json(topProducts.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      total_units: Number(r.total_units),
      total_revenue: Number(r.total_revenue),
      image_url: r.image_url ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch top products" });
  }
});

router.get("/dashboard/alerts", async (req, res) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ago7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [overdueRows, expiringRows, stuckRows, esgRows] = await Promise.all([
      db.select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
      }).from(invoicesTable).where(
        and(eq(invoicesTable.status, "sent"), sql`due_date < ${now}`)
      ),
      db.select({ count: sql<number>`count(*)` }).from(quotesTable).where(
        and(
          sql`status in ('draft','sent')`,
          sql`valid_until >= ${now}`,
          sql`valid_until <= ${in7Days}`
        )
      ),
      db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(
        and(eq(ordersTable.status, "pending"), sql`created_at < ${ago7Days}`)
      ),
      db.select({
        suppliers: sql<number>`count(*)`,
        counties: sql<number>`count(distinct county)`,
      }).from(suppliersTable).where(eq(suppliersTable.isVerified, true)),
    ]);

    res.json({
      overdue_invoices: { count: Number(overdueRows[0]?.count ?? 0), total_kes: Number(overdueRows[0]?.total ?? 0) },
      expiring_quotes: { count: Number(expiringRows[0]?.count ?? 0) },
      stuck_pending_orders: { count: Number(stuckRows[0]?.count ?? 0) },
      esg: { verified_suppliers: Number(esgRows[0]?.suppliers ?? 0), counties_covered: Number(esgRows[0]?.counties ?? 0) },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/reports/top-clients", async (req, res) => {
  try {
    const { limit = "10" } = req.query as Record<string, string>;
    const rows = await db
      .select({
        corporate_id: ordersTable.corporateId,
        corporate_name: corporatesTable.name,
        total_orders: sql<number>`count(${ordersTable.id})`,
        total_spend: sql<number>`coalesce(sum(${ordersTable.total}::numeric), 0)`,
        tier: corporatesTable.tier,
      })
      .from(ordersTable)
      .innerJoin(corporatesTable, eq(ordersTable.corporateId, corporatesTable.id))
      .groupBy(ordersTable.corporateId, corporatesTable.name, corporatesTable.tier)
      .orderBy(desc(sql`sum(${ordersTable.total}::numeric)`))
      .limit(parseInt(limit));
    res.json(rows.map((r) => ({
      ...r,
      total_orders: Number(r.total_orders),
      total_spend: Number(r.total_spend),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch top clients" });
  }
});

router.get("/reports/invoice-summary", async (req, res) => {
  try {
    const rows = await db
      .select({
        status: invoicesTable.status,
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
      })
      .from(invoicesTable)
      .groupBy(invoicesTable.status);
    res.json(rows.map((r) => ({ status: r.status, count: Number(r.count), total: Number(r.total) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice summary" });
  }
});

export default router;
