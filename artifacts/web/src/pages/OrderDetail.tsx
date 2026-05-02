import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package, Users, AlertCircle, FileText, Check, Building2, Printer, Clock, Pencil, X } from "lucide-react";
import { useGetOrder, getGetOrderQueryKey, useCancelOrder } from "@workspace/api-client-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { formatKES, formatDate, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Layout from "@/components/layout/Layout";

const STATUS_STEPS = ["pending", "confirmed", "in_production", "quality_check", "packaging", "dispatched", "delivered"];

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "in_production",
  in_production: "quality_check",
  quality_check: "packaging",
  packaging: "dispatched",
  dispatched: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Confirm Order",
  confirmed: "Start Production",
  in_production: "Quality Check",
  quality_check: "Begin Packaging",
  packaging: "Dispatch",
  dispatched: "Mark Delivered",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function advanceOrderStatus(id: string, status: string) {
  const res = await fetch(`${BASE}/api/orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to advance status");
  return res.json();
}

async function generateInvoice(orderId: string) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const res = await fetch(`${BASE}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId, due_date: dueDate.toISOString() }),
  });
  if (!res.ok) throw new Error("Failed to generate invoice");
  return res.json();
}

function PrintablePackingSlip({ o }: { o: any }) {
  const items: any[] = o.items ?? [];
  return (
    <div id="print-packing-slip" className="hidden print:block font-sans text-[13px] text-gray-900 max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ZAWADI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Corporate Gifting Platform · Nairobi, Kenya</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">PACKING SLIP</p>
          <p className="font-mono text-base font-semibold mt-1">{o.reference}</p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{ORDER_STATUS_LABELS[o.status] ?? o.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</p>
          <p className="font-semibold">{o.corporate_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Order Date</p>
          <p className="font-medium">{formatDate(o.createdAt)}</p>
        </div>
        {o.deliveryDate && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Delivery Date</p>
            <p className="font-medium">{formatDate(o.deliveryDate)}</p>
          </div>
        )}
      </div>

      {o.deliveryAddress && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Delivery Address</p>
          <p className="text-sm font-medium text-gray-800">{o.deliveryAddress}</p>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.productName}</p>
                  {item.brandedPackaging && <p className="text-xs text-gray-400 mt-0.5">✓ Branded packaging</p>}
                  {item.personalisationText && <p className="text-xs text-gray-400 mt-0.5">Note: {item.personalisationText}</p>}
                </td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{formatKES(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatKES(item.lineTotal)}</td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-gray-500">Subtotal (excl. VAT)</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatKES(o.subtotal)}</td>
            </tr>
            <tr className="border-t border-gray-100 bg-gray-50">
              <td colSpan={3} className="px-4 py-2.5 text-right text-xs text-gray-500">VAT @ 16% (KRA)</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatKES(o.vat)}</td>
            </tr>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
              <td className="px-4 py-3 text-right font-bold text-lg">{formatKES(o.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {o.recipientCount > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm font-semibold text-gray-700">Recipients: <span className="font-normal">{o.recipientCount} individual gift recipient{o.recipientCount !== 1 ? "s" : ""}</span></p>
        </div>
      )}

      {o.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Special Instructions</p>
          <p className="text-sm text-stone-700">{o.notes}</p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center mt-8 border-t border-gray-100 pt-4">
        {o.reference} · Zawadi Corporate Gifting Platform · Nairobi, Kenya
        <br />Printed {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })} · All products are 100% Kenyan-made.
      </p>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, queryKey: getGetOrderQueryKey(id) } });
  const cancelOrder = useCancelOrder();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
  const advanceStatus = useMutation({ mutationFn: (status: string) => advanceOrderStatus(id, status), onSuccess: invalidate });
  const createInvoice = useMutation({
    mutationFn: () => generateInvoice(id),
    onSuccess: (inv: any) => {
      invalidate();
      setLocation(`/invoices/${inv.id}`);
    },
  });

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const saveNotes = useMutation({
    mutationFn: (notes: string) =>
      fetch(`${BASE}/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).then(r => r.json()),
    onSuccess: () => { invalidate(); setEditingNotes(false); },
  });

  const o = order as any;

  const handleCancel = () => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    cancelOrder.mutate({ id }, { onSuccess: invalidate });
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
  const nextStatus = NEXT_STATUS[o.status];
  const busy = advanceStatus.isPending || cancelOrder.isPending || createInvoice.isPending;

  return (
    <Layout>
      {/* Hidden printable packing slip */}
      {o && <PrintablePackingSlip o={o} />}

      <div className="p-8 max-w-4xl mx-auto print:hidden">
        <button onClick={() => setLocation("/orders")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Orders
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-serif font-semibold text-foreground" data-testid="text-order-reference">{o.reference}</h1>
              {o.corporate_name && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Building2 size={12} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{o.corporate_name}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{formatDateTime(o.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={ORDER_STATUS_LABELS[o.status] ?? o.status} colorClass={ORDER_STATUS_COLORS[o.status] ?? ""} />

              {nextStatus && o.status !== "cancelled" && (
                <Button size="sm" variant="outline" onClick={() => advanceStatus.mutate(nextStatus)} disabled={busy} data-testid="button-advance-status">
                  {advanceStatus.isPending ? "Updating…" : NEXT_LABEL[o.status]}
                </Button>
              )}

              {o.invoice ? (
                <Button size="sm" variant="outline" onClick={() => setLocation(`/invoices/${o.invoice.id}`)} className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50" data-testid="button-view-invoice">
                  <FileText size={13} />
                  {o.invoice.invoiceNumber}
                </Button>
              ) : (o.status === "confirmed" || o.status === "in_production" || o.status === "dispatched" || o.status === "delivered") && (
                <Button size="sm" variant="outline" onClick={() => createInvoice.mutate()} disabled={busy} className="gap-1.5" data-testid="button-generate-invoice">
                  <FileText size={13} />
                  {createInvoice.isPending ? "Generating…" : "Generate Invoice"}
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5" data-testid="button-print-packing-slip">
                <Printer size={13} /> Packing Slip
              </Button>

              {o.status !== "cancelled" && o.status !== "delivered" && (
                <Button size="sm" variant="destructive" onClick={handleCancel} disabled={busy} data-testid="button-cancel-order">
                  {cancelOrder.isPending ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {o.status !== "cancelled" && (
            <div className="mt-6 overflow-x-auto pb-1">
              <div className="flex items-start min-w-max gap-0">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step} className="flex items-start">
                      {/* Step node + label */}
                      <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
                        <div className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          done
                            ? "bg-primary border-primary text-primary-foreground"
                            : active
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-background border-border text-muted-foreground/40"
                        }`} data-testid={`step-${step}`}>
                          {done ? (
                            <Check size={14} strokeWidth={2.5} />
                          ) : active ? (
                            <>
                              <span className="w-2.5 h-2.5 rounded-full bg-primary block" />
                              <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                            </>
                          ) : (
                            <span className="text-[10px] font-bold">{i + 1}</span>
                          )}
                        </div>
                        <span className={`text-[10px] font-medium text-center leading-tight max-w-[64px] ${
                          active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"
                        }`}>
                          {ORDER_STATUS_LABELS[step]}
                        </span>
                      </div>
                      {/* Connector */}
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mt-4 mx-1 transition-colors duration-300 ${i < currentStep ? "bg-primary" : "bg-border"}`} style={{ minWidth: 20 }} />
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

            {/* Notes — editable */}
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle size={12} /> Internal Notes
                </p>
                {!editingNotes && (
                  <button
                    onClick={() => { setNotesValue(o.notes ?? ""); setEditingNotes(true); }}
                    className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-0.5 transition-colors"
                    data-testid="button-edit-notes"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                    placeholder="Add internal notes visible only to your team…"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveNotes.mutate(notesValue)}
                      disabled={saveNotes.isPending}
                      className="text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-3 py-1 rounded hover:bg-amber-200 transition-colors"
                      data-testid="button-save-notes"
                    >
                      {saveNotes.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-xs text-amber-700 hover:text-amber-900 px-2 py-1 rounded transition-colors flex items-center gap-0.5"
                    >
                      <X size={11} /> Cancel
                    </button>
                  </div>
                </div>
              ) : o.notes ? (
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{o.notes}</p>
              ) : (
                <p className="text-sm text-amber-700/50 italic">No notes — click Edit to add one</p>
              )}
            </div>

            {/* Activity Timeline */}
            {((o.statusLog as any[])?.length > 0) && (
              <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5">
                  <Clock size={12} /> Activity
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Order Created</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                    </div>
                  </div>
                  {(o.statusLog as any[]).map((entry: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">→ {ORDER_STATUS_LABELS[entry.status] ?? entry.status}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(entry.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
