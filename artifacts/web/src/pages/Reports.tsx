import { useQuery } from "@tanstack/react-query";
import { useGetDashboardStats, getGetDashboardStatsQueryKey, useGetTopProducts, getGetTopProductsQueryKey } from "@workspace/api-client-react";
import { BarChart3, TrendingUp, Users, Package, Receipt, Leaf, MapPin, Award } from "lucide-react";
import { formatKES, TIER_COLORS } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

const ORDER_STATUS_COLORS_CHART: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  in_production: "#8b5cf6",
  quality_check: "#ec4899",
  packaging: "#6366f1",
  dispatched: "#0ea5e9",
  delivered: "#10b981",
  cancelled: "#6b7280",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", in_production: "In Production",
  quality_check: "QC", packaging: "Packaging", dispatched: "Dispatched",
  delivered: "Delivered", cancelled: "Cancelled",
};

const TIER_LABEL: Record<string, string> = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };

function StatCard({ label, value, sub, icon: Icon, loading }: { label: string; value: string; sub?: string; icon: any; loading?: boolean }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={13} className="text-primary" />
        </div>
      </div>
      {loading ? <Skeleton className="h-7 w-32" /> : (
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Reports() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: topProducts, isLoading: productsLoading } = useGetTopProducts(undefined, { query: { queryKey: getGetTopProductsQueryKey() } });

  const { data: topClients, isLoading: clientsLoading } = useQuery({
    queryKey: ["reports", "top-clients"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reports/top-clients?limit=8`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: invoiceSummary, isLoading: invoiceLoading } = useQuery({
    queryKey: ["reports", "invoice-summary"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reports/invoice-summary`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: quoteFunnel, isLoading: funnelLoading } = useQuery({
    queryKey: ["reports", "quote-funnel"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reports/quote-funnel`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: supplierEsg, isLoading: esgLoading } = useQuery({
    queryKey: ["reports", "supplier-esg"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/reports/supplier-esg`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const s = stats as any;
  const products = (topProducts as any[]) ?? [];
  const clients = (topClients as any[]) ?? [];
  const invSummary = (invoiceSummary as any[]) ?? [];

  const revenueData = (s?.revenue_by_month ?? []).map((r: { month: string; revenue: number }) => ({
    month: MONTH_LABELS[r.month?.split("-")[1]] ?? r.month,
    revenue: r.revenue,
  }));

  const statusData = (s?.orders_by_status ?? [])
    .filter((r: any) => r.count > 0)
    .map((r: any) => ({
      name: ORDER_STATUS_LABELS[r.status] ?? r.status,
      count: Number(r.count),
      fill: ORDER_STATUS_COLORS_CHART[r.status] ?? "#94a3b8",
    }));

  const paidTotal = invSummary.find((r: any) => r.status === "paid")?.total ?? 0;
  const overdueTotal = invSummary.find((r: any) => r.status === "overdue")?.total ?? 0;
  const pendingTotal = invSummary.find((r: any) => r.status === "sent")?.total ?? 0;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide performance analytics</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Revenue" value={formatKES(s?.total_revenue ?? 0)} sub="Delivered orders" icon={TrendingUp} loading={statsLoading} />
          <StatCard label="This Month" value={formatKES(s?.revenue_this_month ?? 0)} sub={`${s?.orders_this_month ?? 0} orders`} icon={BarChart3} loading={statsLoading} />
          <StatCard label="Total Clients" value={String(s?.total_corporates ?? 0)} icon={Users} loading={statsLoading} />
          <StatCard label="Verified Suppliers" value={String(s?.total_suppliers ?? 0)} icon={Package} loading={statsLoading} />
        </div>

        {/* Revenue chart + Invoice summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Monthly Revenue (KES)</p>
            {statsLoading ? <Skeleton className="h-52" /> : revenueData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No revenue data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(16 58% 46%)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="hsl(16 58% 46%)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 18% 86%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(v: number) => [formatKES(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(35 18% 86%)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(16 58% 46%)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: "hsl(16 58% 46%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Invoice Status</p>
            {invoiceLoading ? <Skeleton className="h-52" /> : (
              <div className="space-y-3 mt-2">
                {[
                  { label: "Paid", amount: paidTotal, color: "bg-green-500" },
                  { label: "Awaiting Payment", amount: pendingTotal, color: "bg-blue-400" },
                  { label: "Overdue", amount: overdueTotal, color: "bg-red-400" },
                ].map(({ label, amount, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground tabular-nums">{formatKES(amount)}</span>
                    </div>
                    {paidTotal + pendingTotal + overdueTotal > 0 && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.round((amount / (paidTotal + pendingTotal + overdueTotal)) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Receipt size={13} className="text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Breakdown</p>
                  </div>
                  {invSummary.map((r: any) => (
                    <div key={r.status} className="flex items-center justify-between py-1">
                      <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                      <span className="text-xs font-medium tabular-nums">{r.count} inv · {formatKES(r.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders by status + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Orders by Status</p>
            {statsLoading ? <Skeleton className="h-48" /> : statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No order data</div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(35 18% 86%)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "hsl(25 12% 46%)" }}>
                    {statusData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Top Products by Revenue</p>
            {productsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : products.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No order data yet</div>
            ) : (
              <div className="space-y-2">
                {products.slice(0, 7).map((p: any, i: number) => (
                  <div key={p.product_id ?? i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground/60 w-4 tabular-nums">{i + 1}</span>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.product_name} className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-card-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Package size={12} className="text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.product_name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.total_units} units</p>
                    </div>
                    <span className="text-xs font-semibold text-primary tabular-nums">{formatKES(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quote Conversion Funnel */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Quote Conversion Funnel</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pipeline performance across all quotes</p>
            </div>
            {!funnelLoading && (quoteFunnel as any)?.win_rate_pct !== null && (
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700 tabular-nums">{(quoteFunnel as any).win_rate_pct}%</p>
                <p className="text-[11px] text-muted-foreground">win rate (closed quotes)</p>
              </div>
            )}
          </div>
          {funnelLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { key: "draft", label: "Draft", color: "bg-stone-300" },
                { key: "sent", label: "Sent to Client", color: "bg-blue-400" },
                { key: "accepted", label: "Accepted", color: "bg-green-500" },
                { key: "rejected", label: "Rejected", color: "bg-red-400" },
                { key: "expired", label: "Expired", color: "bg-amber-400" },
              ].map(({ key, label, color }) => {
                const data = (quoteFunnel as any)?.by_status?.[key] ?? { count: 0, value: 0 };
                const total = (quoteFunnel as any)?.totals?.total ?? 1;
                const pct = total > 0 ? Math.round((data.count / total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums">{data.count}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatKES(data.value)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ESG / Supplier Diversity */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Leaf size={15} className="text-green-600" />
            <p className="text-sm font-semibold text-foreground">Supplier Impact & ESG Profile</p>
            <span className="text-xs text-muted-foreground ml-1">— verified Kenyan suppliers only</span>
          </div>
          {esgLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : (() => {
            const esg = supplierEsg as any;
            if (!esg) return null;
            const maxArtisans = Math.max(...(esg.by_county ?? []).map((c: any) => c.artisans), 1);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KPI strip */}
                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Verified Suppliers", value: esg.total_verified, icon: Award, color: "text-primary bg-primary/10" },
                    { label: "Total Artisans", value: esg.total_artisans, icon: Users, color: "text-emerald-700 bg-emerald-50" },
                    { label: "Women-Led", value: `${esg.women_led_pct}%`, icon: Leaf, color: "text-pink-700 bg-pink-50" },
                    { label: "Counties Covered", value: esg.counties_covered, icon: MapPin, color: "text-amber-700 bg-amber-50" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-muted/30 rounded-xl p-4 flex flex-col gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon size={13} />
                      </div>
                      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                {/* County breakdown */}
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <MapPin size={11} /> Artisans by County
                  </p>
                  <div className="space-y-2.5">
                    {(esg.by_county ?? []).map((row: any) => (
                      <div key={row.county}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground font-medium">{row.county}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {row.artisans} artisans · {row.suppliers} supplier{row.suppliers !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.round((row.artisans / maxArtisans) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Award size={11} /> Certifications
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(esg.top_certifications ?? []).map((cert: any) => (
                      <span
                        key={cert.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-800"
                      >
                        <Leaf size={10} /> {cert.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Top Clients */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Top Clients by Spend</p>
          </div>
          {clientsLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">No order data yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Company</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Tier</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Orders</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c: any, i: number) => (
                  <tr key={c.corporate_id ?? i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs font-bold text-muted-foreground/50 tabular-nums">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.corporate_name}</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[c.tier] ?? ""}`}>
                        {TIER_LABEL[c.tier] ?? c.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">{c.total_orders}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(c.total_spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
