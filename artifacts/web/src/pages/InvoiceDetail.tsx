import { useParams, useLocation } from "wouter";
import { ArrowLeft, FileText, Send, CheckCircle2, Printer, Building2, ShoppingCart } from "lucide-react";
import { useGetInvoice, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, INVOICE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function updateInvoiceStatus(id: string, status: string) {
  const res = await fetch(`${BASE}/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update invoice");
  return res.json();
}

function PrintableInvoice({ inv }: { inv: any }) {
  return (
    <div id="print-invoice" className="hidden print:block font-sans text-[13px] text-gray-900 max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-10 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">ZAWADI</h1>
          <p className="text-xs text-gray-500 mt-0.5">Corporate Gifting Platform</p>
          <p className="text-xs text-gray-500">Nairobi, Kenya</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">TAX INVOICE</p>
          <p className="font-mono text-base font-semibold mt-1">{inv.invoiceNumber}</p>
          <p className="text-xs text-gray-500 mt-1">Status: {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}</p>
        </div>
      </div>

      {/* Dates & KRA */}
      <div className="grid grid-cols-3 gap-6 mb-8 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Issued</p>
          <p className="font-medium">{formatDate(inv.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Due Date</p>
          <p className="font-medium">{formatDate(inv.dueDate)}</p>
        </div>
        {inv.kraPin && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">KRA PIN</p>
            <p className="font-mono font-semibold">{inv.kraPin}</p>
          </div>
        )}
      </div>

      {/* VAT Breakdown */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-3">Goods / Services (excl. VAT)</td>
              <td className="px-4 py-3 text-right font-medium">{formatKES(inv.amount)}</td>
            </tr>
            <tr className="border-t border-gray-100">
              <td className="px-4 py-3">VAT @ 16% (KRA)</td>
              <td className="px-4 py-3 text-right font-medium">{formatKES(inv.vatAmount)}</td>
            </tr>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="px-4 py-3 font-bold">Total Payable</td>
              <td className="px-4 py-3 text-right font-bold text-lg">{formatKES(inv.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {inv.paidAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-green-800 font-semibold text-sm">✓ Payment received on {formatDate(inv.paidAt)}</p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 text-center mt-10 border-t border-gray-100 pt-4">
        This is a KRA-compliant VAT invoice issued by Zawadi Corporate Gifting Platform · Nairobi, Kenya.
        <br />Invoice {inv.invoiceNumber} · Generated {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useGetInvoice(id, { query: { enabled: !!id, queryKey: getGetInvoiceQueryKey(id) } });
  const inv = invoice as any;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
  const markSent = useMutation({ mutationFn: () => updateInvoiceStatus(id, "sent"), onSuccess: invalidate });
  const markPaid = useMutation({ mutationFn: () => updateInvoiceStatus(id, "paid"), onSuccess: invalidate });

  const busy = markSent.isPending || markPaid.isPending;

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!inv) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Invoice not found.</p>
          <Button variant="link" onClick={() => setLocation("/invoices")}>Back to invoices</Button>
        </div>
      </Layout>
    );
  }

  const canMarkSent = inv.status === "draft";
  const canMarkPaid = inv.status === "sent" || inv.status === "overdue";

  return (
    <Layout>
      {/* Hidden printable version */}
      {inv && <PrintableInvoice inv={inv} />}

      <div className="p-8 max-w-2xl mx-auto print:hidden">
        <button onClick={() => setLocation("/invoices")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Invoices
        </button>

        {/* Invoice Card */}
        <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-primary" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tax Invoice</p>
                </div>
                <h1 className="text-xl font-serif font-semibold text-foreground font-mono" data-testid="text-invoice-number">{inv.invoiceNumber}</h1>
                {inv.corporate_name && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Building2 size={12} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{inv.corporate_name}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] ?? ""} />

                {canMarkSent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markSent.mutate()}
                    disabled={busy}
                    className="gap-1.5"
                    data-testid="button-mark-sent"
                  >
                    <Send size={13} />
                    {markSent.isPending ? "Sending…" : "Mark as Sent"}
                  </Button>
                )}

                {canMarkPaid && (
                  <Button
                    size="sm"
                    onClick={() => markPaid.mutate()}
                    disabled={busy}
                    className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
                    data-testid="button-mark-paid"
                  >
                    <CheckCircle2 size={13} />
                    {markPaid.isPending ? "Recording…" : "Record Payment"}
                  </Button>
                )}

                {inv.orderId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/orders/${inv.orderId}`)}
                    className="gap-1.5"
                    data-testid="button-view-order"
                  >
                    <ShoppingCart size={13} />
                    View Order
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-1.5"
                  data-testid="button-print-invoice"
                >
                  <Printer size={13} /> Print / PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Key info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Issued</p>
                <p className="font-medium text-foreground">{formatDate(inv.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Due Date</p>
                <p className="font-medium text-foreground">{formatDate(inv.dueDate)}</p>
              </div>
              {inv.kraPin && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">KRA PIN</p>
                  <p className="font-mono text-sm font-medium text-foreground" data-testid="text-kra-pin">{inv.kraPin}</p>
                </div>
              )}
              {inv.paidAt && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid On</p>
                  <p className="font-medium text-green-700">{formatDate(inv.paidAt)}</p>
                </div>
              )}
            </div>

            {/* VAT Breakdown */}
            <div className="bg-muted/40 rounded-xl p-5 space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">VAT Breakdown (KRA-Compliant)</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                <span className="font-medium" data-testid="text-amount">{formatKES(inv.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT @ 16% (KRA)</span>
                <span className="font-medium" data-testid="text-vat-amount">{formatKES(inv.vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-semibold text-foreground">Total Payable</span>
                <span className="font-bold text-primary text-lg" data-testid="text-total-amount">{formatKES(inv.totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              This is a KRA-compliant VAT invoice. Zawadi Corporate Gifting Platform · Nairobi, Kenya.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
