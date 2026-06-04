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
import { eq, sql, desc, and, gte, lte, isNotNull, notInArray, inArray } from "drizzle-orm";

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

    const [overdueRows, expiringRows, stuckRows, esgRows, lowStockRows] = await Promise.all([
      db.select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
      }).from(invoicesTable).where(eq(invoicesTable.status, "overdue")),
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
      db.select({ count: sql<number>`count(*)` }).from(productsTable).where(
        sql`stock_qty is not null and stock_qty < moq and is_active = true`
      ),
    ]);

    res.json({
      overdue_invoices: { count: Number(overdueRows[0]?.count ?? 0), total_kes: Number(overdueRows[0]?.total ?? 0) },
      expiring_quotes: { count: Number(expiringRows[0]?.count ?? 0) },
      stuck_pending_orders: { count: Number(stuckRows[0]?.count ?? 0) },
      low_stock_products: { count: Number(lowStockRows[0]?.count ?? 0) },
      esg: { verified_suppliers: Number(esgRows[0]?.suppliers ?? 0), counties_covered: Number(esgRows[0]?.counties ?? 0) },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/reports/top-clients", async (req, res) => {
  try {
    const { limit = "10", from, to } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(ordersTable.createdAt, new Date(to)));
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
      .where(conditions.length ? and(...conditions) : undefined)
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

router.get("/reports/supplier-esg", async (req, res) => {
  try {
    const suppliers = await db
      .select({
        id: suppliersTable.id,
        name: suppliersTable.name,
        county: suppliersTable.county,
        womenLed: suppliersTable.womenLed,
        artisanCount: suppliersTable.artisanCount,
        certifications: suppliersTable.certifications,
        isVerified: suppliersTable.isVerified,
      })
      .from(suppliersTable)
      .where(eq(suppliersTable.isVerified, true));

    const totalArtisans = suppliers.reduce((s, r) => s + (Number(r.artisanCount) || 0), 0);
    const womenLedCount = suppliers.filter((r) => r.womenLed).length;

    const byCounty: Record<string, { suppliers: number; artisans: number }> = {};
    for (const s of suppliers) {
      const c = s.county ?? "Unknown";
      if (!byCounty[c]) byCounty[c] = { suppliers: 0, artisans: 0 };
      byCounty[c].suppliers += 1;
      byCounty[c].artisans += Number(s.artisanCount) || 0;
    }

    const certCounts: Record<string, number> = {};
    for (const s of suppliers) {
      for (const cert of (s.certifications as string[]) ?? []) {
        certCounts[cert] = (certCounts[cert] ?? 0) + 1;
      }
    }
    const topCerts = Object.entries(certCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    res.json({
      total_verified: suppliers.length,
      total_artisans: totalArtisans,
      women_led_count: womenLedCount,
      women_led_pct: suppliers.length > 0 ? Math.round((womenLedCount / suppliers.length) * 100) : 0,
      counties_covered: Object.keys(byCounty).length,
      by_county: Object.entries(byCounty)
        .sort((a, b) => b[1].artisans - a[1].artisans)
        .map(([county, data]) => ({ county, ...data })),
      top_certifications: topCerts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch supplier ESG data" });
  }
});

router.get("/reports/quote-funnel", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(quotesTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(quotesTable.createdAt, new Date(to)));
    const rows = await db
      .select({
        status: quotesTable.status,
        count: sql<number>`count(*)`,
        total_value: sql<number>`coalesce(sum(total::numeric), 0)`,
      })
      .from(quotesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(quotesTable.status);

    const byStatus: Record<string, { count: number; value: number }> = {};
    for (const r of rows) {
      byStatus[r.status] = { count: Number(r.count), value: Number(r.total_value) };
    }

    const draft = byStatus.draft?.count ?? 0;
    const sent = byStatus.sent?.count ?? 0;
    const accepted = byStatus.accepted?.count ?? 0;
    const rejected = byStatus.rejected?.count ?? 0;
    const expired = byStatus.expired?.count ?? 0;
    const total = draft + sent + accepted + rejected + expired;
    const closed = accepted + rejected + expired;
    const winRate = closed > 0 ? Math.round((accepted / closed) * 100) : null;

    res.json({
      by_status: byStatus,
      totals: { draft, sent, accepted, rejected, expired, total },
      win_rate_pct: winRate,
      accepted_value: byStatus.accepted?.value ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch quote funnel" });
  }
});

router.get("/reports/invoice-summary", async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(invoicesTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(invoicesTable.createdAt, new Date(to)));
    const rows = await db
      .select({
        status: invoicesTable.status,
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
      })
      .from(invoicesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(invoicesTable.status);
    res.json(rows.map((r) => ({ status: r.status, count: Number(r.count), total: Number(r.total) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice summary" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  try {
    const [recentOrders, recentQuotes, recentInvoices] = await Promise.all([
      db.select({
        id: ordersTable.id,
        reference: ordersTable.reference,
        status: ordersTable.status,
        total: ordersTable.total,
        createdAt: ordersTable.createdAt,
        corporateName: corporatesTable.name,
      })
        .from(ordersTable)
        .leftJoin(corporatesTable, eq(ordersTable.corporateId, corporatesTable.id))
        .orderBy(desc(ordersTable.createdAt))
        .limit(6),

      db.select({
        id: quotesTable.id,
        reference: quotesTable.reference,
        status: quotesTable.status,
        total: quotesTable.total,
        createdAt: quotesTable.createdAt,
        corporateName: corporatesTable.name,
      })
        .from(quotesTable)
        .leftJoin(corporatesTable, eq(quotesTable.corporateId, corporatesTable.id))
        .orderBy(desc(quotesTable.createdAt))
        .limit(6),

      db.select({
        id: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        status: invoicesTable.status,
        totalAmount: invoicesTable.totalAmount,
        createdAt: invoicesTable.createdAt,
      })
        .from(invoicesTable)
        .orderBy(desc(invoicesTable.createdAt))
        .limit(6),
    ]);

    const events = [
      ...recentOrders.map((o) => ({
        type: "order" as const,
        id: o.id,
        ref: o.reference,
        label: o.corporateName ? `Order for ${o.corporateName}` : "New order",
        status: o.status,
        amount: o.total,
        createdAt: o.createdAt,
        href: `/orders/${o.id}`,
      })),
      ...recentQuotes.map((q) => ({
        type: "quote" as const,
        id: q.id,
        ref: q.reference,
        label: q.corporateName ? `Quote for ${q.corporateName}` : "New quote",
        status: q.status,
        amount: q.total,
        createdAt: q.createdAt,
        href: `/quotes/${q.id}`,
      })),
      ...recentInvoices.map((i) => ({
        type: "invoice" as const,
        id: i.id,
        ref: i.invoiceNumber,
        label: "Invoice generated",
        status: i.status,
        amount: i.totalAmount,
        createdAt: i.createdAt,
        href: `/invoices/${i.id}`,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 12);

    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.get("/dashboard/upcoming-deliveries", async (req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        id: ordersTable.id,
        reference: ordersTable.reference,
        status: ordersTable.status,
        total: ordersTable.total,
        deliveryDate: ordersTable.deliveryDate,
        deliveryAddress: ordersTable.deliveryAddress,
        corporateName: corporatesTable.name,
      })
      .from(ordersTable)
      .leftJoin(corporatesTable, eq(ordersTable.corporateId, corporatesTable.id))
      .where(
        and(
          isNotNull(ordersTable.deliveryDate),
          gte(ordersTable.deliveryDate, now),
          lte(ordersTable.deliveryDate, in30),
          notInArray(ordersTable.status, ["delivered", "cancelled"])
        )
      )
      .orderBy(ordersTable.deliveryDate)
      .limit(15);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch upcoming deliveries" });
  }
});

router.get("/reports/invoice-aging", async (req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select({
        id: invoicesTable.id,
        totalAmount: invoicesTable.totalAmount,
        status: invoicesTable.status,
        dueDate: invoicesTable.dueDate,
      })
      .from(invoicesTable)
      .where(sql`${invoicesTable.status} in ('sent','overdue')`);

    const buckets = {
      current:     { label: "Current (not yet due)", count: 0, amount: 0 },
      days_1_30:   { label: "1–30 days overdue",     count: 0, amount: 0 },
      days_31_60:  { label: "31–60 days overdue",    count: 0, amount: 0 },
      days_61_90:  { label: "61–90 days overdue",    count: 0, amount: 0 },
      days_90plus: { label: "90+ days overdue",      count: 0, amount: 0 },
    };

    for (const inv of rows) {
      const amount = parseFloat(inv.totalAmount as string) || 0;
      if (!inv.dueDate) {
        buckets.current.count++;
        buckets.current.amount += amount;
        continue;
      }
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysOverdue <= 0)       { buckets.current.count++;     buckets.current.amount += amount; }
      else if (daysOverdue <= 30) { buckets.days_1_30.count++;   buckets.days_1_30.amount += amount; }
      else if (daysOverdue <= 60) { buckets.days_31_60.count++;  buckets.days_31_60.amount += amount; }
      else if (daysOverdue <= 90) { buckets.days_61_90.count++;  buckets.days_61_90.amount += amount; }
      else                        { buckets.days_90plus.count++; buckets.days_90plus.amount += amount; }
    }

    const totalOutstanding = Object.values(buckets).reduce((s, b) => s + b.amount, 0);
    res.json({ buckets, total_outstanding: totalOutstanding, total_invoices: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch invoice aging" });
  }
});

router.get("/reports/top-suppliers", async (req, res) => {
  try {
    const { limit: limitStr } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(limitStr ?? "10") || 10, 20);

    const rows = await db
      .select({
        supplier_id: productsTable.supplierId,
        total_orders: sql<number>`count(distinct ${orderItemsTable.orderId})`,
        total_units: sql<number>`sum(${orderItemsTable.quantity})`,
        total_revenue: sql<number>`sum(${orderItemsTable.lineTotal}::numeric)`,
        product_count: sql<number>`count(distinct ${orderItemsTable.productId})`,
      })
      .from(orderItemsTable)
      .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .groupBy(productsTable.supplierId)
      .orderBy(desc(sql`sum(${orderItemsTable.lineTotal}::numeric)`))
      .limit(limit);

    const supplierIds = rows.map((r) => r.supplier_id).filter(Boolean) as string[];
    const suppliers = supplierIds.length
      ? await db
          .select({ id: suppliersTable.id, name: suppliersTable.name, county: suppliersTable.county, isVerified: suppliersTable.isVerified })
          .from(suppliersTable)
          .where(inArray(suppliersTable.id, supplierIds))
      : [];
    const suppMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

    res.json(rows.map((r) => ({
      supplier_id: r.supplier_id,
      supplier_name: suppMap[r.supplier_id ?? ""]?.name ?? "Unknown",
      county: suppMap[r.supplier_id ?? ""]?.county ?? null,
      is_verified: suppMap[r.supplier_id ?? ""]?.isVerified ?? false,
      total_orders: Number(r.total_orders),
      total_units: Number(r.total_units),
      total_revenue: Number(r.total_revenue),
      product_count: Number(r.product_count),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch top suppliers" });
  }
});

export default router;
