import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, TrendingUp, Package, Building2, Layers, ShoppingCart, Clock } from "lucide-react";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetRecentOrders, getGetRecentOrdersQueryKey, useGetTopProducts, getGetTopProductsQueryKey } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

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

  const revenueData = (stats?.revenue_by_month ?? []).map((r: { month: string; revenue: number }) => ({
    month: MONTH_LABELS[r.month?.split("-")[1]] ?? r.month,
    revenue: r.revenue,
  }));

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform metrics and recent activity</p>
        </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
      </div>
    </Layout>
  );
}
