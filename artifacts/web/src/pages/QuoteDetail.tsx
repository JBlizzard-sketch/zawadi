import { useParams, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Send, XCircle, Printer, Building2 } from "lucide-react";
import { useGetQuote, getGetQuoteQueryKey, useConvertQuoteToOrder } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, QUOTE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function PrintableQuote({ q }: { q: any }) {
  const items: any[] = q.items ?? [];
  return (
    <div id="print-quote" className="hidden print:block font-sans text-[13px] text-gray-900 max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-10 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ZAWADI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Corporate Gifting Platform</p>
          <p className="text-xs text-gray-500">Nairobi, Kenya · zawadi.co.ke</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">QUOTATION</p>
          <p className="font-mono text-base font-semibold mt-1">{q.reference ?? q.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-gray-500 mt-1">Status: {QUOTE_STATUS_LABELS[q.status] ?? q.status}</p>
        </div>
      </div>

      {/* Dates & Client */}
      <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prepared For</p>
          <p className="font-semibold">{q.corporate_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issue Date</p>
          <p className="font-medium">{formatDate(q.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Valid Until</p>
          <p className="font-medium text-red-700">{formatDate(q.validUntil)}</p>
        </div>
      </div>

      {/* Line Items */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product / Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{formatKES(item.unit_price)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatKES(item.line_total)}</td>
              </tr>
            ))}
            <tr className="border-t border-gray-100 bg-gray-50/50">
              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal (excl. VAT)</td>
              <td className="px-4 py-2 text-right font-medium">{formatKES(q.subtotal)}</td>
            </tr>
            <tr className="border-t border-gray-100 bg-gray-50/50">
              <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">VAT @ 16% (KRA)</td>
              <td className="px-4 py-2 text-right font-medium">{formatKES(q.vat)}</td>
            </tr>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td colSpan={3} className="px-4 py-3 text-right font-bold">Total (incl. VAT)</td>
              <td className="px-4 py-3 text-right font-bold text-lg">{formatKES(q.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {q.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{q.notes}</p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-sm">
        <p className="font-semibold text-gray-700 mb-1">Payment Terms</p>
        <p className="text-gray-500 text-xs">This quotation is valid for 30 days from the issue date. Prices include 16% VAT as required by KRA. A 50% deposit is required to confirm the order. All products are sourced from verified Kenyan artisan suppliers.</p>
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-10 border-t border-gray-100 pt-4">
        Quotation {q.reference ?? q.id.slice(0, 8).toUpperCase()} · Zawadi Corporate Gifting Platform · Nairobi, Kenya
        <br />Generated {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })} · This is not a tax invoice.
      </p>
    </div>
  );
}

async function updateQuoteStatus(id: string, status: string) {
  const res = await fetch(`${BASE}/api/quotes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update quote status");
  return res.json();
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
  const convertToOrder = useConvertQuoteToOrder();
  const q = quote as any;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });

  const markSent = useMutation({ mutationFn: () => updateQuoteStatus(id, "sent"), onSuccess: invalidate });
  const markAccepted = useMutation({ mutationFn: () => updateQuoteStatus(id, "accepted"), onSuccess: invalidate });
  const markRejected = useMutation({ mutationFn: () => updateQuoteStatus(id, "rejected"), onSuccess: invalidate });

  const handleConvert = () => {
    convertToOrder.mutate({ id }, {
      onSuccess: (order: any) => {
        invalidate();
        setLocation(`/orders/${order.id}`);
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!q) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Quote not found.</p>
          <Button variant="link" onClick={() => setLocation("/quotes")}>Back to quotes</Button>
        </div>
      </Layout>
    );
  }

  const items: any[] = q.items ?? [];
  const isDraft = q.status === "draft";
  const isSent = q.status === "sent";
  const canConvert = q.status === "sent" || q.status === "accepted" || q.status === "draft";
  const canMarkSent = isDraft;
  const canMarkAccepted = isSent;
  const canMarkRejected = isSent;
  const busy = markSent.isPending || markAccepted.isPending || markRejected.isPending || convertToOrder.isPending;

  return (
    <Layout>
      {/* Hidden printable version */}
      {q && <PrintableQuote q={q} />}

      <div className="p-8 max-w-3xl mx-auto print:hidden">
        <button onClick={() => setLocation("/quotes")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Quotes
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Quotation</p>
              <h1 className="text-xl font-serif font-semibold text-foreground font-mono" data-testid="text-quote-id">
                {q.reference ?? q.id.slice(0, 8).toUpperCase()}
              </h1>
              {q.corporate_name && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Building2 size={12} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{q.corporate_name}</p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>Created {formatDate(q.createdAt)}</span>
                <span>·</span>
                <span className={new Date(q.validUntil) < new Date() ? "text-destructive font-medium" : ""}>
                  Valid until {formatDate(q.validUntil)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={QUOTE_STATUS_LABELS[q.status] ?? q.status} colorClass={QUOTE_STATUS_COLORS[q.status] ?? ""} />

              {canMarkSent && (
                <Button size="sm" variant="outline" onClick={() => markSent.mutate()} disabled={busy} className="gap-1.5" data-testid="button-mark-sent">
                  <Send size={13} />
                  {markSent.isPending ? "Sending…" : "Mark as Sent"}
                </Button>
              )}

              {canMarkAccepted && (
                <Button size="sm" variant="outline" onClick={() => markAccepted.mutate()} disabled={busy} className="gap-1.5 border-green-600/40 text-green-700 hover:bg-green-50" data-testid="button-mark-accepted">
                  <ArrowRight size={13} />
                  {markAccepted.isPending ? "Accepting…" : "Mark Accepted"}
                </Button>
              )}

              {canMarkRejected && (
                <Button size="sm" variant="outline" onClick={() => markRejected.mutate()} disabled={busy} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5" data-testid="button-mark-rejected">
                  <XCircle size={13} />
                  {markRejected.isPending ? "Rejecting…" : "Reject"}
                </Button>
              )}

              {canConvert && q.status !== "rejected" && (
                <Button size="sm" onClick={handleConvert} disabled={busy} className="gap-2" data-testid="button-convert-to-order">
                  {convertToOrder.isPending ? "Converting..." : "Convert to Order"}
                  <ArrowRight size={14} />
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5" data-testid="button-print-quote">
                <Printer size={13} /> Print / PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Line Items</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Product</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Qty</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Unit Price</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">No line items</td>
                </tr>
              ) : items.map((item: any, i: number) => (
                <tr key={i} data-testid={`row-line-item-${i}`}>
                  <td className="px-5 py-3 font-medium text-foreground">{item.product_name}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{formatKES(item.unit_price)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">{formatKES(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm max-w-xs ml-auto">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatKES(q.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (16%)</span>
              <span className="font-medium">{formatKES(q.vat)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-primary text-base" data-testid="text-quote-total">{formatKES(q.total)}</span>
            </div>
          </div>
        </div>

        {q.notes && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 mt-4">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">Notes</p>
            <p className="text-sm text-stone-700">{q.notes}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
