import { Link } from "wouter";
import { ArrowUpRight, TrendingUp, Package, Building2, Layers, ShoppingCart, Clock, AlertTriangle, Leaf, MapPin } from "lucide-react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentOrders, getGetRecentOrdersQueryKey, useGetTopProducts, getGetTopProductsQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: React.ElementType; accent?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 flex flex-col gap-3 shadow-sm" data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? "bg-primary/10"}`}>
          <Icon size={15} className="text-primary" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders(undefined, { query: { queryKey: getGetRecentOrdersQueryKey() } });
  const { data: topProducts, isLoading: topLoading } = useGetTopProducts(undefined, { query: { queryKey: getGetTopProductsQueryKey() } });
  const { data: alerts } = useQuery<any>({
    queryKey: ["dashboard-alerts"],
    queryFn: () => fetch(`${BASE}/api/dashboard/alerts`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const revenueData = (stats?.revenue_by_month ?? []).map((r: { month: string; revenue: number }) => ({
    month: MONTH_LABELS[r.month?.split("-")[1]] ?? r.month,
    revenue: r.revenue,
  }));

  const hasAlerts = alerts && (
    alerts.overdue_invoices?.count > 0 ||
    alerts.expiring_quotes?.count > 0 ||
    alerts.stuck_pending_orders?.count > 0
  );

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform metrics and recent activity</p>
        </div>

        {/* Alerts Strip */}
        {hasAlerts && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap gap-3 items-center" data-testid="alerts-strip">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Action required</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {alerts.overdue_invoices?.count > 0 && (
                <Link
                  href="/invoices?status=sent"
                  className="inline-flex items-center gap-1.5 bg-red-100 border border-red-200 text-red-800 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors"
                  data-testid="alert-overdue-invoices"
                >
                  <span className="font-bold">{alerts.overdue_invoices.count}</span> overdue invoice{alerts.overdue_invoices.count !== 1 ? "s" : ""}
                  {alerts.overdue_invoices.total_kes > 0 && <span className="text-red-600">· {formatKES(alerts.overdue_invoices.total_kes)}</span>}
                </Link>
              )}
              {alerts.expiring_quotes?.count > 0 && (
                <Link
                  href="/quotes"
                  className="inline-flex items-center gap-1.5 bg-orange-100 border border-orange-200 text-orange-800 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-orange-200 transition-colors"
                  data-testid="alert-expiring-quotes"
                >
                  <span className="font-bold">{alerts.expiring_quotes.count}</span> quote{alerts.expiring_quotes.count !== 1 ? "s" : ""} expiring within 7 days
                </Link>
              )}
              {alerts.stuck_pending_orders?.count > 0 && (
                <Link
                  href="/orders?status=pending"
                  className="inline-flex items-center gap-1.5 bg-yellow-100 border border-yellow-200 text-yellow-800 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-yellow-200 transition-colors"
                  data-testid="alert-stuck-orders"
                >
                  <span className="font-bold">{alerts.stuck_pending_orders.count}</span> pending order{alerts.stuck_pending_orders.count !== 1 ? "s" : ""} stalled &gt;7 days
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total Orders" value={String(stats?.total_orders ?? 0)} sub={`${stats?.orders_this_month ?? 0} this month`} icon={ShoppingCart} />
              <StatCard label="Revenue (Delivered)" value={formatKES(stats?.total_revenue ?? 0)} sub={`${formatKES(stats?.revenue_this_month ?? 0)} this month`} icon={TrendingUp} accent="bg-green-100" />
              <StatCard label="Corporate Clients" value={String(stats?.total_corporates ?? 0)} icon={Building2} accent="bg-blue-100" />
              <StatCard label="Verified Suppliers" value={String(stats?.total_suppliers ?? 0)} icon={Layers} accent="bg-amber-100" />
            </>
          )}
        </div>

        {/* Revenue Chart + Order Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-foreground">Revenue by Month</p>
              <p className="text-xs text-muted-foreground">Delivered orders only</p>
            </div>
            {statsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(16 58% 46%)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="hsl(16 58% 46%)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 18% 86%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatKES(v), "Revenue"]} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(35 18% 86%)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(16 58% 46%)" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Orders by Status</p>
            {statsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
            ) : (
              <div className="space-y-2">
                {(stats?.orders_by_status ?? []).map((s: { status: string; count: number }) => (
                  <div key={s.status} className="flex items-center justify-between" data-testid={`status-row-${s.status}`}>
                    <StatusBadge label={ORDER_STATUS_LABELS[s.status] ?? s.status} colorClass={ORDER_STATUS_COLORS[s.status] ?? "bg-muted text-muted-foreground border-border"} />
                    <span className="text-sm font-semibold tabular-nums text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Recent Orders */}
          <div className="lg:col-span-3 bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <p className="text-sm font-semibold text-foreground">Recent Orders</p>
              <Link href="/orders" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline" data-testid="link-all-orders">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            {ordersLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (recentOrders as any[])?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock size={28} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(recentOrders as any[])?.slice(0, 6).map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                    data-testid={`order-row-${order.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} colorClass={ORDER_STATUS_COLORS[order.status] ?? ""} />
                      <span className="text-sm font-semibold text-foreground tabular-nums w-28 text-right">{formatKES(order.total)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
              <p className="text-sm font-semibold text-foreground">Top Products</p>
              <Link href="/catalogue" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline" data-testid="link-catalogue">
                Catalogue <ArrowUpRight size={12} />
              </Link>
            </div>
            {topLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (topProducts as any[])?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package size={28} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No data yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(topProducts as any[])?.slice(0, 6).map((p: any, i: number) => (
                  <Link key={p.product_id} href={`/catalogue/${p.product_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors" data-testid={`top-product-${p.product_id}`}>
                    <span className="text-xs font-bold text-muted-foreground/40 w-4 tabular-nums flex-shrink-0">{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={12} className="text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">{p.total_units} units</p>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums">{formatKES(p.total_revenue)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ESG Impact Panel */}
        <div className="bg-gradient-to-br from-stone-800 via-stone-900 to-stone-800 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Leaf size={14} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Kenyan Artisan Impact</p>
              <p className="text-xs text-stone-400">Live metrics from your gifting activity</p>
            </div>
            <Link href="/suppliers" className="ml-auto text-xs text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
              View suppliers <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-white tabular-nums">{alerts?.esg?.verified_suppliers ?? "—"}</p>
              <p className="text-xs text-stone-400 mt-1">Verified Suppliers</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Kenyan artisans</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-white tabular-nums">{alerts?.esg?.counties_covered ?? "—"}</p>
              <p className="text-xs text-stone-400 mt-1">Counties Covered</p>
              <p className="text-[10px] text-stone-500 mt-0.5 flex items-center justify-center gap-0.5"><MapPin size={9} />Across Kenya</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-green-400 tabular-nums">100%</p>
              <p className="text-xs text-stone-400 mt-1">Locally Sourced</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Made in Kenya</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{formatKES(stats?.total_revenue ?? 0).replace("KES ", "")}</p>
              <p className="text-xs text-stone-400 mt-1">Artisan Revenue</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Lifetime delivered</p>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 mt-4 text-center">
            Every Zawadi gift supports a verified Kenyan artisan community · <span className="text-green-500">0% imported products</span>
          </p>
        </div>
      </div>
    </Layout>
  );
}
