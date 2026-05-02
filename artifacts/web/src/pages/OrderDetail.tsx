import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Package, Users, AlertCircle } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey, useCancelOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const STATUS_STEPS = ["pending", "confirmed", "in_production", "quality_check", "packaging", "dispatched", "delivered"];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) } });
  const cancelOrder = useCancelOrder();

  const o = order as any;

  const handleCancel = () => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    cancelOrder.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!o) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Order not found.</p>
          <Button variant="link" onClick={() => setLocation("/orders")}>Back to orders</Button>
        </div>
      </Layout>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(o.status);

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => setLocation("/orders")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Orders
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-serif font-semibold text-foreground" data-testid="text-order-reference">{o.reference}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{formatDateTime(o.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={ORDER_STATUS_LABELS[o.status] ?? o.status} colorClass={ORDER_STATUS_COLORS[o.status] ?? ""} />
              {o.status !== "cancelled" && o.status !== "delivered" && (
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelOrder.isPending} data-testid="button-cancel-order">
                  {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
                </Button>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {o.status !== "cancelled" && (
            <div className="mt-6 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-3 h-3 rounded-full border-2 transition-all ${done ? "bg-primary border-primary" : active ? "bg-primary/80 border-primary" : "bg-background border-border"}`} data-testid={`step-${step}`} />
                        <span className={`text-[10px] font-medium ${active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                          {ORDER_STATUS_LABELS[step]}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`h-0.5 w-10 mb-4 ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Order Items</p>
            </div>
            {(o.items ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package size={28} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No items</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(o.items as any[]).map((item: any) => (
                    <tr key={item.id} data-testid={`row-item-${item.id}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        {item.brandedPackaging && <span className="text-[10px] text-primary">Branded packaging</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{formatKES(item.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">{formatKES(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary + Info */}
          <div className="space-y-4">
            {/* Totals */}
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-3">Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatKES(o.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (16%)</span>
                  <span className="font-medium">{formatKES(o.vat)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary text-base" data-testid="text-order-total">{formatKES(o.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery & Recipients */}
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-3">
              {o.deliveryAddress && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Delivery Address</p>
                  <p className="text-sm text-foreground">{o.deliveryAddress}</p>
                </div>
              )}
              {o.deliveryDate && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Delivery Date</p>
                  <p className="text-sm text-foreground">{formatDate(o.deliveryDate)}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Recipients</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Users size={13} /> {o.recipientCount ?? 0}</p>
                </div>
                <Link href={`/orders/${id}/recipients`} className="text-xs font-medium text-primary hover:underline" data-testid="link-manage-recipients">Manage →</Link>
              </div>
            </div>

            {o.notes && (
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertCircle size={12} /> Notes</p>
                <p className="text-sm text-stone-700">{o.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
