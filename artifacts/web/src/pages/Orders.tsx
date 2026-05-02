import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const STATUSES = [
  "pending", "confirmed", "in_production", "quality_check",
  "packaging", "dispatched", "delivered", "cancelled",
];

export default function Orders() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const params = { status: status || undefined, limit, offset };
  const { data: ordersData, isLoading } = useListOrders(params, { query: { queryKey: getListOrdersQueryKey(params) } });

  const orders = (ordersData as any)?.items ?? [];
  const total = (ordersData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">{total} order{total !== 1 ? "s" : ""} total</p>
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Pipeline */}
        <div className="bg-card border border-card-border rounded-xl p-4 mb-6 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STATUSES.filter(s => s !== "cancelled").map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => { setStatus(status === s ? "" : s); setOffset(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    status === s ? ORDER_STATUS_COLORS[s] + " ring-1 ring-offset-1 ring-primary/30" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`filter-status-${s}`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
                {i < STATUSES.filter(s => s !== "cancelled").length - 1 && (
                  <ChevronRight size={12} className="text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Recipients</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <ShoppingCart size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/orders/${order.id}`)}
                    data-testid={`row-order-${order.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{order.reference}</p>
                      {order.corporate_name && <p className="text-xs text-muted-foreground">{order.corporate_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} colorClass={ORDER_STATUS_COLORS[order.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground hidden lg:table-cell">{order.recipientCount ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(order.total)}</td>
                    <td className="px-5 py-3">
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button disabled={currentPage === 1} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors" data-testid="button-prev-page">Previous</button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors" data-testid="button-next-page">Next</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
