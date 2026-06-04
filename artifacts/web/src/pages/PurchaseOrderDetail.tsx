import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ClipboardList, CheckCircle2, Send, Package, X, AlertTriangle, Printer, Pencil, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  acknowledged: "bg-violet-100 text-violet-700 border-violet-200",
  received: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};
const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent to Supplier", acknowledged: "Acknowledged", received: "Received", cancelled: "Cancelled",
};

const TRANSITIONS: Record<string, { label: string; nextStatus: string; icon: React.ElementType; variant?: "default" | "outline" | "destructive" }[]> = {
  draft: [
    { label: "Send to Supplier", nextStatus: "sent", icon: Send },
    { label: "Cancel PO", nextStatus: "cancelled", icon: X, variant: "outline" },
  ],
  sent: [
    { label: "Mark Acknowledged", nextStatus: "acknowledged", icon: CheckCircle2 },
    { label: "Cancel PO", nextStatus: "cancelled", icon: X, variant: "outline" },
  ],
  acknowledged: [
    { label: "Mark Received", nextStatus: "received", icon: Package },
    { label: "Cancel PO", nextStatus: "cancelled", icon: X, variant: "outline" },
  ],
  received: [],
  cancelled: [],
};

function PrintablePurchaseOrder({ po }: { po: any }) {
  const items: any[] = po.items ?? [];
  const total = parseFloat(po.totalAmount ?? "0");
  return (
    <div className="hidden print:block font-sans text-[13px] text-gray-900 max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ZAWADI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Corporate Gifting Platform · Nairobi, Kenya</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">PURCHASE ORDER</p>
          <p className="font-mono text-base font-semibold mt-1 text-gray-800">{po.reference}</p>
          <p className="text-xs text-gray-500 mt-1">Date: {formatDate(po.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Supplier</p>
          <p className="font-bold text-gray-900 text-base">{po.supplier?.name ?? "—"}</p>
          {po.supplier?.county && <p className="text-sm text-gray-600">{po.supplier.county}, Kenya</p>}
          {po.supplier?.email && <p className="text-sm text-gray-600">{po.supplier.email}</p>}
          {po.supplier?.phone && <p className="text-sm text-gray-600">{po.supplier.phone}</p>}
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">PO Details</p>
          <table className="text-sm w-full">
            <tbody>
              <tr><td className="text-gray-500 pr-3 py-0.5">PO Number</td><td className="font-mono font-semibold">{po.reference}</td></tr>
              <tr><td className="text-gray-500 pr-3 py-0.5">Issue Date</td><td>{formatDate(po.createdAt)}</td></tr>
              {po.expectedDate && <tr><td className="text-gray-500 pr-3 py-0.5">Expected By</td><td className="font-semibold text-gray-900">{formatDate(po.expectedDate)}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product / Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Unit Cost (KES)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Line Total (KES)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium">{item.productName}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600">{parseFloat(item.unitCost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right font-medium">{parseFloat(item.lineTotal).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800 bg-gray-50">
              <td colSpan={3} className="px-4 py-3 text-right font-bold">Total Payable (KES)</td>
              <td className="px-4 py-3 text-right font-bold text-lg">{total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {po.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 mb-6">
          <p className="font-semibold text-amber-800 mb-1 text-xs uppercase tracking-wide">Notes / Special Instructions</p>
          <p className="text-sm text-gray-700">{po.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-12 mt-10">
        <div><div className="border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Authorised by — Zawadi Corporate Gifting</p>
          <p className="text-xs text-gray-400 mt-1">Name / Title / Date</p>
        </div></div>
        <div><div className="border-t border-gray-400 pt-2">
          <p className="text-xs text-gray-500">Accepted by — {po.supplier?.name ?? "Supplier"}</p>
          <p className="text-xs text-gray-400 mt-1">Name / Title / Date</p>
        </div></div>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-8 border-t border-gray-100 pt-4">
        This purchase order is subject to Zawadi standard terms and conditions. · Zawadi Corporate Gifting Platform · Nairobi, Kenya
      </p>
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState("");

  const { data: po, isLoading } = useQuery<any>({
    queryKey: ["purchase-order", id],
    queryFn: () => fetch(`${BASE}/api/purchase-orders/${id}`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`${BASE}/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      setConfirmReceive(false);
      setPendingStatus(null);
    },
  });

  const updateMeta = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${BASE}/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase-order", id] }),
  });

  const handleTransition = (nextStatus: string) => {
    if (nextStatus === "received") {
      setConfirmReceive(true);
    } else {
      setPendingStatus(nextStatus);
      updateStatus.mutate(nextStatus);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!po || po.error) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto text-center py-24">
          <ClipboardList size={40} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Purchase order not found.</p>
          <Link href="/purchase-orders" className="mt-3 text-sm text-primary hover:underline block">← Back to POs</Link>
        </div>
      </Layout>
    );
  }

  const items = po.items ?? [];
  const transitions = TRANSITIONS[po.status] ?? [];
  const isReceived = po.status === "received";
  const totalAmount = parseFloat(po.totalAmount ?? "0");

  return (
    <Layout>
      {/* Printable PO — hidden on screen, visible in print */}
      <PrintablePurchaseOrder po={po} />

      <div className="p-8 max-w-3xl mx-auto print:hidden">
        {/* Back */}
        <Link href="/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={14} /> Purchase Orders
        </Link>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Purchase Order</p>
              <h1 className="text-2xl font-serif font-semibold text-foreground font-mono">{po.reference}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Supplier: <span className="font-medium text-foreground">{po.supplier?.name ?? "—"}</span>
              </p>
              {po.supplier?.county && (
                <p className="text-xs text-muted-foreground">{po.supplier.county}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => window.print()} data-testid="button-print-po">
                  <Printer size={13} /> Print PO
                </Button>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${PO_STATUS_COLORS[po.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {PO_STATUS_LABELS[po.status] ?? po.status}
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{formatKES(totalAmount)}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Created</p>
              <p className="text-sm font-medium">{formatDate(po.createdAt)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs text-muted-foreground">Expected Delivery</p>
                {!editingDate && po.status !== "received" && po.status !== "cancelled" && (
                  <button onClick={() => { setDateVal(po.expectedDate ? po.expectedDate.slice(0,10) : ""); setEditingDate(true); }} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                )}
              </div>
              {editingDate ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <Input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} className="h-7 text-xs w-36" />
                  <button onClick={() => { updateMeta.mutate({ expectedDate: dateVal || null }); setEditingDate(false); }} className="text-xs text-primary font-semibold hover:underline">Save</button>
                  <button onClick={() => setEditingDate(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                </div>
              ) : (
                <p className="text-sm font-medium">{po.expectedDate ? formatDate(po.expectedDate) : <span className="text-muted-foreground italic text-xs">Not set</span>}</p>
              )}
            </div>
            {po.receivedDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Received</p>
                <p className="text-sm font-medium text-green-700">{formatDate(po.receivedDate)}</p>
              </div>
            )}
          </div>

          {/* Notes inline edit */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
              {!editingNotes && po.status !== "received" && po.status !== "cancelled" && (
                <button onClick={() => { setNotesVal(po.notes ?? ""); setEditingNotes(true); }} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Add notes for this supplier…"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { updateMeta.mutate({ notes: notesVal.trim() || null }); setEditingNotes(false); }} disabled={updateMeta.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              po.notes
                ? <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2">{po.notes}</p>
                : <p className="text-xs text-muted-foreground italic">No notes — click ✎ to add</p>
            )}
          </div>

          {/* Action buttons */}
          {transitions.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border flex gap-2 flex-wrap">
              {transitions.map((t) => (
                <Button
                  key={t.nextStatus}
                  size="sm"
                  variant={t.variant ?? "default"}
                  className="gap-1.5"
                  disabled={updateStatus.isPending && pendingStatus === t.nextStatus}
                  onClick={() => handleTransition(t.nextStatus)}
                  data-testid={`button-status-${t.nextStatus}`}
                >
                  <t.icon size={13} />
                  {updateStatus.isPending && pendingStatus === t.nextStatus ? "Updating…" : t.label}
                </Button>
              ))}
            </div>
          )}

          {isReceived && (
            <div className="mt-5 pt-5 border-t border-border flex items-center gap-2 text-green-700">
              <CheckCircle2 size={15} />
              <p className="text-sm font-medium">Stock quantities have been updated for all items in this PO.</p>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm mb-5">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Cost</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Total</th>
                {isReceived && <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-foreground">
                    <Link href={`/catalogue/${item.productId}`} className="hover:text-primary hover:underline transition-colors">
                      {item.productName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatKES(item.unitCost)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{formatKES(item.lineTotal)}</td>
                  {isReceived && (
                    <td className="px-5 py-3 text-right">
                      {item.currentStock != null ? (
                        <span className={`text-xs font-medium ${item.currentStock < item.moq ? "text-amber-600" : "text-green-700"}`}>
                          {item.currentStock} in stock
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/20">
              <tr>
                <td colSpan={isReceived ? 3 : 2} className="px-5 py-3 text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</td>
                <td className="px-5 py-3 text-right font-bold text-foreground tabular-nums">{formatKES(totalAmount)}</td>
                {isReceived && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Supplier info */}
        {po.supplier && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-3">Supplier</h2>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{po.supplier.name}</p>
                <p className="text-xs text-muted-foreground">{po.supplier.county}</p>
                {po.supplier.email && <p className="text-xs text-muted-foreground">{po.supplier.email}</p>}
                {po.supplier.phone && <p className="text-xs text-muted-foreground">{po.supplier.phone}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link href={`/suppliers/${po.supplier.id}`} className="text-xs text-primary hover:underline">
                  View supplier →
                </Link>
                {po.supplier.email && (
                  <button
                    onClick={() => {
                      const lines = [
                        `Subject: Purchase Order ${po.reference} — ${po.supplier.name}`,
                        "",
                        `Dear ${po.supplier.name} team,`,
                        "",
                        `Please find our purchase order ${po.reference} for the following items:`,
                        "",
                        ...items.map((item: any) => `  • ${item.quantity}x ${item.productName} @ KES ${Number(item.unitCost).toLocaleString("en-KE")} each`),
                        "",
                        `Total: KES ${Number(totalAmount).toLocaleString("en-KE")}`,
                        po.expectedDate ? `Expected delivery: ${new Date(po.expectedDate).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}` : "",
                        po.notes ? `\nNotes: ${po.notes}` : "",
                        "",
                        "Please confirm receipt of this order at your earliest convenience.",
                        "",
                        "Kind regards,",
                        "Zawadi Corporate Gifting",
                      ].filter(l => l !== undefined);
                      navigator.clipboard.writeText(lines.join("\n")).then(() => {
                        const btn = document.getElementById("po-email-btn");
                        if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { btn.textContent = "Copy supplier email"; }, 2000); }
                      });
                    }}
                    id="po-email-btn"
                    className="text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1 hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <Mail size={11} /> Copy supplier email
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Receive Dialog */}
      {confirmReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Confirm goods received?</h3>
                <p className="text-sm text-muted-foreground">
                  This will mark the PO as received and <strong>add stock quantities</strong> for all items to the product catalogue. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 mb-5 space-y-1">
              {items.map((item: any) => (
                <p key={item.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">+{item.quantity}</span> × {item.productName}
                </p>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmReceive(false)} disabled={updateStatus.isPending}>
                Cancel
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => updateStatus.mutate("received")} disabled={updateStatus.isPending}>
                <Package size={13} />
                {updateStatus.isPending ? "Processing…" : "Confirm — Mark Received"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
