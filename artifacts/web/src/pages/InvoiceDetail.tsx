import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, FileText, Send, CheckCircle2, Printer, Building2, ShoppingCart, X, Banknote, CreditCard, Landmark, Smartphone, MessageCircle, Package, Pencil } from "lucide-react";
import { useGetInvoice, getGetInvoiceQueryKey } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, INVOICE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";

const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-PESA", icon: Smartphone, color: "text-green-700 bg-green-50 border-green-200" },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "cheque", label: "Cheque", icon: FileText, color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "cash", label: "Cash", icon: Banknote, color: "text-stone-700 bg-stone-50 border-stone-200" },
  { value: "card", label: "Card", icon: CreditCard, color: "text-purple-700 bg-purple-50 border-purple-200" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: "M-PESA", bank_transfer: "Bank Transfer", cheque: "Cheque", cash: "Cash", card: "Card",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function buildWhatsAppInvoiceMsg(inv: any): string {
  const lines: string[] = [];
  lines.push(`*Invoice ${inv.invoiceNumber}*`);
  if (inv.corporate_name) lines.push(`Client: ${inv.corporate_name}`);
  lines.push(`Amount Due: KES ${Number(inv.totalAmount).toLocaleString("en-KE")} (incl. 16% VAT)`);
  lines.push(`Due Date: ${formatDate(inv.dueDate)}`);
  const items: any[] = inv.line_items ?? [];
  if (items.length) {
    lines.push("");
    lines.push("*Items:*");
    for (const item of items) {
      lines.push(`• ${item.quantity}x ${item.productName} @ KES ${Number(item.unitPrice).toLocaleString("en-KE")} = KES ${Number(item.lineTotal).toLocaleString("en-KE")}`);
    }
  }
  lines.push("");
  lines.push("Please quote the invoice number when making payment.");
  return lines.join("\n");
}

function buildWhatsAppPaymentReminder(inv: any): string {
  const daysOverdue = inv.dueDate ? Math.ceil((Date.now() - new Date(inv.dueDate).getTime()) / 86400000) : 0;
  const lines: string[] = [];
  lines.push(`*Payment Reminder — ${inv.invoiceNumber}*`);
  lines.push("");
  if (inv.corporate_name) lines.push(`Dear ${inv.corporate_name},`);
  lines.push("");
  if (daysOverdue > 0) {
    lines.push(`This is a friendly reminder that invoice *${inv.invoiceNumber}* is now *${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue*.`);
  } else {
    lines.push(`This is a friendly reminder that invoice *${inv.invoiceNumber}* is due on ${formatDate(inv.dueDate)}.`);
  }
  lines.push(`Amount Outstanding: *KES ${Number(inv.totalAmount).toLocaleString("en-KE")}*`);
  lines.push("");
  lines.push("Kindly arrange payment at your earliest convenience and quote the invoice number as your reference.");
  lines.push("");
  lines.push("Thank you for your continued business with Zawadi.");
  return lines.join("\n");
}

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

  const isPaid = inv.status === "paid";
  const isOverdue = inv.status === "overdue" || (inv.status !== "paid" && inv.dueDate && new Date(inv.dueDate) < new Date());

  return (
    <div id="print-invoice" className="hidden print:block font-sans text-[12px] text-gray-900 bg-white" style={{ maxWidth: 740, margin: "0 auto", padding: 40, position: "relative" }}>

      {/* Status watermark stamp */}
      {(isPaid || isOverdue) && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          pointerEvents: "none",
          zIndex: 10,
          textAlign: "center",
          userSelect: "none",
        }}>
          <span style={{
            display: "inline-block",
            fontSize: 88,
            fontWeight: 900,
            letterSpacing: 8,
            textTransform: "uppercase",
            opacity: 0.07,
            color: isPaid ? "#166534" : "#991b1b",
            border: `10px solid ${isPaid ? "#166534" : "#991b1b"}`,
            borderRadius: 8,
            padding: "4px 24px",
            lineHeight: 1,
            fontFamily: "Arial Black, sans-serif",
          }}>
            {isPaid ? "PAID" : "OVERDUE"}
          </span>
        </div>
      )}

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
            {parseFloat(inv.order_discount_pct ?? "0") > 0 && (
              <tr>
                <td style={{ padding: "4px 10px 4px 0", color: "#b5451b" }}>Discount ({parseFloat(inv.order_discount_pct).toFixed(0)}%)</td>
                <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500, color: "#b5451b" }}>− {formatKES(inv.order_discount_amount)}</td>
              </tr>
            )}
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
          {inv.paymentMethod && (
            <p style={{ color: "#15803d", margin: "2px 0 0", fontSize: 10 }}>
              Method: {PAYMENT_METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod}
              {inv.paymentRef ? ` · Ref: ${inv.paymentRef}` : ""}
            </p>
          )}
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

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState("mpesa");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState("");

  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");

  const updateDueDate = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`${BASE}/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date: date }),
      });
      if (!res.ok) throw new Error("Failed to update due date");
      return res.json();
    },
    onSuccess: () => { invalidate(); setEditingDueDate(false); },
  });

  const openPayModal = () => {
    setPayMethod("mpesa");
    setPayRef("");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes("");
    setPayError("");
    setShowPayModal(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
  const markSent = useMutation({ mutationFn: () => updateInvoiceStatus(id, "sent"), onSuccess: invalidate });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          payment_method: payMethod,
          payment_ref: payRef || undefined,
          payment_notes: payNotes || undefined,
          paid_at: payDate,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to record payment"); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setShowPayModal(false); },
    onError: (e: any) => setPayError(e.message ?? "Something went wrong."),
  });

  const busy = markSent.isPending || recordPayment.isPending;

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
                    onClick={openPayModal}
                    disabled={busy}
                    className="gap-1.5 bg-green-700 hover:bg-green-800 text-white"
                    data-testid="button-mark-paid"
                  >
                    <CheckCircle2 size={13} />
                    Record Payment
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
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppInvoiceMsg(inv))}`, "_blank")}
                  className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                  data-testid="button-whatsapp-share"
                >
                  <MessageCircle size={13} /> WhatsApp
                </Button>

                {(inv.status === "sent" || inv.status === "overdue") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppPaymentReminder(inv))}`, "_blank")}
                    className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
                    data-testid="button-payment-reminder"
                  >
                    <MessageCircle size={13} /> Payment Reminder
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

          {/* Aging banner for overdue invoices */}
          {(inv.status === "overdue" || (inv.status === "sent" && inv.dueDate && new Date(inv.dueDate) < new Date())) && (() => {
            const days = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
            return (
              <div className="mx-6 mt-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-sm font-bold">!</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">{days === 0 ? "Due today" : `${days} day${days !== 1 ? "s" : ""} overdue`}</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    Due {formatDate(inv.dueDate)} · {formatKES(inv.totalAmount)} outstanding
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Key info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Issued</p>
                <p className="font-medium text-foreground">{formatDate(inv.createdAt)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</p>
                  {!editingDueDate && (inv.status === "draft" || inv.status === "sent") && (
                    <button onClick={() => { setDueDateInput(inv.dueDate?.slice(0,10) ?? ""); setEditingDueDate(true); }} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={10} />
                    </button>
                  )}
                </div>
                {editingDueDate ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={dueDateInput}
                      onChange={e => setDueDateInput(e.target.value)}
                      className="border border-input rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                      autoFocus
                    />
                    <button onClick={() => updateDueDate.mutate(dueDateInput)} disabled={!dueDateInput || updateDueDate.isPending} className="text-primary font-semibold text-xs hover:underline">Save</button>
                    <button onClick={() => setEditingDueDate(false)} className="text-muted-foreground text-xs hover:underline">Cancel</button>
                  </div>
                ) : (
                  <p className={`font-medium ${inv.status !== "paid" && inv.dueDate && new Date(inv.dueDate) < new Date() ? "text-red-600" : "text-foreground"}`}>
                    {formatDate(inv.dueDate)}
                  </p>
                )}
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
              {inv.paymentMethod && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payment Method</p>
                  <p className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod}</p>
                </div>
              )}
              {inv.paymentRef && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Transaction / Reference</p>
                  <p className="font-mono text-sm font-semibold text-foreground bg-muted px-2 py-1 rounded inline-block" data-testid="text-payment-ref">{inv.paymentRef}</p>
                </div>
              )}
              {inv.paymentNotes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Payment Notes</p>
                  <p className="text-sm text-foreground">{inv.paymentNotes}</p>
                </div>
              )}
            </div>

            {/* Line Items */}
            {(inv.line_items ?? []).length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                  <Package size={13} className="text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Product</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(inv.line_items as any[]).map((item: any, i: number) => (
                      <tr key={i} data-testid={`row-invoice-line-${i}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          {item.brandedPackaging && <span className="text-[10px] text-primary">Branded packaging</span>}
                          {item.personalisationText && <p className="text-[10px] text-muted-foreground italic">{item.personalisationText}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{formatKES(item.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-foreground">{formatKES(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {inv.status === "paid" && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3.5" data-testid="paid-banner">
                <CheckCircle2 size={18} className="text-green-700 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Payment Received</p>
                  <p className="text-xs text-green-700">
                    {inv.paymentMethod ? `${PAYMENT_METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod}` : "Payment recorded"}
                    {inv.paymentRef ? ` · Ref: ${inv.paymentRef}` : ""}
                    {inv.paidAt ? ` · ${formatDate(inv.paidAt)}` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* VAT Breakdown */}
            <div className="bg-muted/40 rounded-xl p-5 space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">VAT Breakdown (KRA-Compliant)</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                <span className="font-medium" data-testid="text-amount">{formatKES(inv.amount)}</span>
              </div>
              {parseFloat(inv.order_discount_pct ?? "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-primary">Discount ({parseFloat(inv.order_discount_pct).toFixed(0)}%)</span>
                  <span className="font-medium text-primary">− {formatKES(inv.order_discount_amount)}</span>
                </div>
              )}
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

      {/* Payment Recording Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" data-testid="payment-modal">
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-serif font-semibold text-foreground">Record Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{inv.invoiceNumber} · {formatKES(inv.totalAmount)}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Payment Method</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPayMethod(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${payMethod === value ? color + " border-current" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                      data-testid={`pay-method-${value}`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  {payMethod === "mpesa" ? "M-PESA Transaction Code" : payMethod === "bank_transfer" ? "Bank Reference / EFT No." : payMethod === "cheque" ? "Cheque Number" : "Reference (optional)"}
                </label>
                <Input
                  value={payRef}
                  onChange={e => setPayRef(e.target.value.toUpperCase())}
                  placeholder={payMethod === "mpesa" ? "e.g. QHX7A2BC1D" : payMethod === "cheque" ? "e.g. 004521" : "Transaction reference…"}
                  className="font-mono"
                  data-testid="input-payment-ref"
                />
                {payMethod === "mpesa" && (
                  <p className="text-[11px] text-muted-foreground/70 mt-1">Enter the M-PESA confirmation code sent via SMS</p>
                )}
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Date</label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  data-testid="input-payment-date"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes <span className="font-normal text-muted-foreground/60">(optional)</span></label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Partial payment, remainder due next week…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  data-testid="textarea-payment-notes"
                />
              </div>

              {payError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setShowPayModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white gap-1.5"
                onClick={() => recordPayment.mutate()}
                disabled={recordPayment.isPending}
                data-testid="button-confirm-payment"
              >
                <CheckCircle2 size={14} />
                {recordPayment.isPending ? "Recording…" : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
