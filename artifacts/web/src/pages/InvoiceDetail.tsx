import { useParams, useLocation } from "wouter";
import { ArrowLeft, FileText, Send, CheckCircle2, Printer, Building2, ShoppingCart } from "lucide-react";
import { useGetInvoice, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

function PrintableInvoice({ inv, settings }: { inv: any; settings: any }) {
  const s = settings ?? {};
  const lineItems: any[] = inv.line_items ?? [];
  const hasLines = lineItems.length > 0;

  return (
    <div id="print-invoice" className="hidden print:block font-sans text-[12px] text-gray-900 bg-white" style={{ maxWidth: 740, margin: "0 auto", padding: 40 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1a1a1a", paddingBottom: 20, marginBottom: 24 }}>
        <div>
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="Logo" style={{ height: 44, objectFit: "contain", marginBottom: 6 }} />
          ) : (
            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#1a1a1a", margin: 0 }}>{s.companyName || "ZAWADI"}</p>
          )}
          {s.companyName && s.logoUrl && (
            <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>{s.companyName}</p>
          )}
          {s.address && <p style={{ fontSize: 10, color: "#777", margin: "2px 0 0" }}>{s.address}, {s.city ?? "Nairobi"}</p>}
          {s.phone && <p style={{ fontSize: 10, color: "#777", margin: "1px 0 0" }}>{s.phone}</p>}
          {s.email && <p style={{ fontSize: 10, color: "#777", margin: "1px 0 0" }}>{s.email}</p>}
          {s.kraPin && <p style={{ fontSize: 10, color: "#444", margin: "4px 0 0", fontFamily: "monospace" }}>KRA PIN (Supplier): {s.kraPin}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#b5451b", letterSpacing: 1, margin: 0 }}>TAX INVOICE</p>
          <p style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, margin: "4px 0 0" }}>{inv.invoiceNumber}</p>
          {inv.order_reference && (
            <p style={{ fontSize: 10, color: "#777", margin: "2px 0 0" }}>Order Ref: {inv.order_reference}</p>
          )}
          <p style={{ fontSize: 10, color: "#777", margin: "4px 0 0" }}>Status: <strong>{INVOICE_STATUS_LABELS[inv.status] ?? inv.status}</strong></p>
        </div>
      </div>

      {/* Billing parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ background: "#f9f7f4", borderRadius: 6, padding: "10px 14px" }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 4px", fontWeight: 600 }}>Issued By</p>
          <p style={{ fontWeight: 700, margin: 0 }}>{s.companyName || "Zawadi Corporate Gifting"}</p>
          {s.address && <p style={{ color: "#555", margin: "1px 0 0" }}>{s.address}</p>}
          <p style={{ color: "#555", margin: "1px 0 0" }}>{s.city ?? "Nairobi"}, {s.country ?? "Kenya"}</p>
          {s.kraPin && <p style={{ fontFamily: "monospace", margin: "3px 0 0", color: "#333" }}>KRA PIN: {s.kraPin}</p>}
        </div>
        <div style={{ background: "#f9f7f4", borderRadius: 6, padding: "10px 14px" }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 4px", fontWeight: 600 }}>Billed To</p>
          <p style={{ fontWeight: 700, margin: 0 }}>{inv.corporate_name ?? "—"}</p>
          {inv.corporate_address && <p style={{ color: "#555", margin: "1px 0 0" }}>{inv.corporate_address}, Kenya</p>}
          {inv.kraPin && <p style={{ fontFamily: "monospace", margin: "3px 0 0", color: "#333" }}>KRA PIN: {inv.kraPin}</p>}
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Invoice Date", value: formatDate(inv.createdAt) },
          { label: "Due Date", value: formatDate(inv.dueDate) },
          { label: "Payment Terms", value: s.defaultPaymentTermsDays ? `Net ${s.defaultPaymentTermsDays} days` : "Net 30 days" },
        ].map(({ label, value }) => (
          <div key={label} style={{ borderLeft: "2px solid #e5ded6", paddingLeft: 10 }}>
            <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 2px", fontWeight: 600 }}>{label}</p>
            <p style={{ fontWeight: 600, margin: 0 }}>{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Line Items Table */}
      {hasLines && (
        <div style={{ marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#1a1a1a", color: "#fff" }}>
                <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600 }}>Item / Product</th>
                <th style={{ textAlign: "center", padding: "7px 10px", fontWeight: 600, width: 60 }}>Qty</th>
                <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600, width: 100 }}>Unit Price</th>
                <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600, width: 110 }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #e8e2da", background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ fontWeight: 500 }}>{item.productName}</span>
                    {item.brandedPackaging && <span style={{ fontSize: 9, color: "#b5451b", marginLeft: 6 }}>[Branded Pkg]</span>}
                    {item.personalisationText && (
                      <span style={{ display: "block", fontSize: 9, color: "#888", marginTop: 1 }}>"{item.personalisationText}"</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "7px 10px" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", padding: "7px 10px" }}>{formatKES(item.unitPrice)}</td>
                  <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 500 }}>{formatKES(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <table style={{ fontSize: 12, minWidth: 260 }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 10px 4px 0", color: "#555" }}>Subtotal (excl. VAT)</td>
              <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500 }}>{formatKES(inv.amount)}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 10px 4px 0", color: "#555" }}>VAT @ 16% (KRA)</td>
              <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500 }}>{formatKES(inv.vatAmount)}</td>
            </tr>
            <tr style={{ borderTop: "2px solid #1a1a1a" }}>
              <td style={{ padding: "8px 10px 4px 0", fontWeight: 800, fontSize: 13 }}>Total Payable</td>
              <td style={{ textAlign: "right", padding: "8px 0 4px", fontWeight: 800, fontSize: 15, color: "#b5451b" }}>{formatKES(inv.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Paid stamp */}
      {inv.paidAt && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "8px 14px", marginBottom: 20 }}>
          <p style={{ color: "#166534", fontWeight: 700, margin: 0 }}>✓ PAID — Payment received on {formatDate(inv.paidAt)}</p>
        </div>
      )}

      {/* Banking Details */}
      {(s.bankName || s.bankAccount) && (
        <div style={{ background: "#f9f7f4", border: "1px solid #e5ded6", borderRadius: 6, padding: "10px 14px", marginBottom: 20 }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 6px", fontWeight: 600 }}>Banking Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
            {s.bankName && <span><strong>Bank:</strong> {s.bankName}</span>}
            {s.bankAccount && <span><strong>Account:</strong> <span style={{ fontFamily: "monospace" }}>{s.bankAccount}</span></span>}
            {s.bankBranch && <span><strong>Branch:</strong> {s.bankBranch}</span>}
            {s.swiftCode && <span><strong>SWIFT:</strong> <span style={{ fontFamily: "monospace" }}>{s.swiftCode}</span></span>}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{ fontSize: 9, color: "#aaa", textAlign: "center", borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }}>
        {s.invoiceFooter || "This is a KRA-compliant VAT invoice. Thank you for your business."}
        {" "}· Invoice {inv.invoiceNumber} · Generated {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
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

  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => fetch(`${BASE}/api/settings`).then(r => r.json()),
  });

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
      {inv && <PrintableInvoice inv={inv} settings={settings} />}

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
