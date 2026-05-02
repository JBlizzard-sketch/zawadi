import { useParams, useLocation } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";
import { useGetInvoice, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate, INVOICE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: invoice, isLoading } = useGetInvoice(id, { query: { enabled: !!id, queryKey: getGetInvoiceQueryKey(id) } });
  const inv = invoice as any;

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

  return (
    <Layout>
      <div className="p-8 max-w-2xl mx-auto">
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
              </div>
              <StatusBadge label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] ?? ""} />
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">VAT Breakdown</p>
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
