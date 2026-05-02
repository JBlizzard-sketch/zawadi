import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Building2, Mail, Phone } from "lucide-react";
import { useGetCorporate, getGetCorporateQueryKey, useGetCorporateDashboard, getGetCorporateDashboardQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, TIER_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Layout from "@/components/layout/Layout";

const TIER_LABELS: Record<string, string> = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };
const PAYMENT_LABELS: Record<string, string> = { prepaid: "Prepaid", net_15: "Net 15", net_30: "Net 30", net_60: "Net 60" };

export default function CorporateDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: corporate, isLoading: corpLoading } = useGetCorporate(id, { query: { enabled: !!id, queryKey: getGetCorporateQueryKey(id) } });
  const { data: dashboard, isLoading: dashLoading } = useGetCorporateDashboard(id, { query: { enabled: !!id, queryKey: getGetCorporateDashboardQueryKey(id) } });

  const c = corporate as any;
  const d = dashboard as any;

  const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  const spendData = (d?.spend_by_month ?? []).map((r: { month: string; spend: number }) => ({
    month: MONTH_LABELS[r.month?.split("-")[1]] ?? r.month,
    spend: r.spend,
  }));

  if (corpLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!c) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Corporate account not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/corporates")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Corporates
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-semibold text-foreground" data-testid="text-corporate-name">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.industry ?? "—"}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[c.tier] ?? ""}`}>{TIER_LABELS[c.tier] ?? c.tier}</span>
                  {c.payment_terms && <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[c.payment_terms] ?? c.payment_terms}</span>}
                  {c.kra_pin && <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">KRA: {c.kra_pin}</span>}
                </div>
              </div>
            </div>
            <div className="text-sm space-y-1">
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-muted-foreground" />
                  <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-muted-foreground" />
                  <span className="text-foreground">{c.phone}</span>
                </div>
              )}
              {c.account_manager_name && (
                <p className="text-xs text-muted-foreground">AM: {c.account_manager_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {dashLoading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Orders", value: String(d?.total_orders ?? 0) },
              { label: "Active Orders", value: String(d?.active_orders ?? 0) },
              { label: "Total Spend", value: formatKES(d?.total_spend ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xl font-semibold text-foreground tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Spend Chart */}
          <div className="lg:col-span-3 bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Monthly Spend</p>
            {dashLoading ? (
              <Skeleton className="h-44" />
            ) : spendData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No spend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={spendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(16 58% 46%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(16 58% 46%)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 18% 86%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatKES(v), "Spend"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(35 18% 86%)" }} />
                  <Area type="monotone" dataKey="spend" stroke="hsl(16 58% 46%)" strokeWidth={2} fill="url(#spendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Recent Orders</p>
              <Link href={`/orders`}>
                <a className="text-xs text-primary hover:underline" data-testid="link-all-orders">View all</a>
              </Link>
            </div>
            {dashLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (d?.recent_orders ?? []).length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <div className="divide-y divide-border">
                {(d?.recent_orders ?? []).map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <a className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors" data-testid={`order-row-${order.id}`}>
                      <div>
                        <p className="text-xs font-medium text-foreground">{order.reference}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} colorClass={ORDER_STATUS_COLORS[order.status] ?? ""} />
                    </a>
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
