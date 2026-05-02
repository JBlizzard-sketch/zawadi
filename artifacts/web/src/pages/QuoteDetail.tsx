import { useParams, useLocation } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useGetQuote, getGetQuoteQueryKey, useConvertQuoteToOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, QUOTE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: quote, isLoading } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
  const convertToOrder = useConvertQuoteToOrder();
  const q = quote as any;

  const handleConvert = () => {
    convertToOrder.mutate({ id }, {
      onSuccess: (order: any) => {
        queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });
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
  const canConvert = q.status === "sent" || q.status === "accepted" || q.status === "draft";

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={() => setLocation("/quotes")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Quotes
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Quote</p>
              <h1 className="text-lg font-serif font-semibold text-foreground" data-testid="text-quote-id">{q.id.slice(0, 8).toUpperCase()}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>Created {formatDate(q.createdAt)}</span>
                <span>·</span>
                <span>Valid until {formatDate(q.validUntil)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={QUOTE_STATUS_LABELS[q.status] ?? q.status} colorClass={QUOTE_STATUS_COLORS[q.status] ?? ""} />
              {canConvert && (
                <Button size="sm" onClick={handleConvert} disabled={convertToOrder.isPending} className="gap-2" data-testid="button-convert-to-order">
                  {convertToOrder.isPending ? "Converting..." : "Convert to Order"}
                  <ArrowRight size={14} />
                </Button>
              )}
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
