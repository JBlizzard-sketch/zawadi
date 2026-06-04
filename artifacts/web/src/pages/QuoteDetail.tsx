import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Send, XCircle, Printer, Building2, Copy, Truck, X, MessageCircle, Tag, Check, Pencil } from "lucide-react";
import { useGetQuote, getGetQuoteQueryKey, useConvertQuoteToOrder } from "@workspace/api-client-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, QUOTE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function PrintableQuote({ q, settings }: { q: any; settings: any }) {
  const s = settings ?? {};
  const items: any[] = q.items ?? [];

  return (
    <div id="print-quote" className="hidden print:block font-sans text-[12px] text-gray-900 bg-white" style={{ maxWidth: 740, margin: "0 auto", padding: 40 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1a1a1a", paddingBottom: 20, marginBottom: 24 }}>
        <div>
          {s.logoUrl ? (
            <img src={s.logoUrl} alt="Logo" style={{ height: 44, objectFit: "contain", marginBottom: 6 }} />
          ) : (
            <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: "#1a1a1a", margin: 0 }}>{s.companyName || "ZAWADI"}</p>
          )}
          {s.companyName && s.logoUrl && <p style={{ fontSize: 11, color: "#555", margin: "2px 0 0" }}>{s.companyName}</p>}
          {s.address && <p style={{ fontSize: 10, color: "#777", margin: "2px 0 0" }}>{s.address}, {s.city ?? "Nairobi"}</p>}
          {s.phone && <p style={{ fontSize: 10, color: "#777", margin: "1px 0 0" }}>{s.phone}</p>}
          {s.email && <p style={{ fontSize: 10, color: "#777", margin: "1px 0 0" }}>{s.email}</p>}
          {s.website && <p style={{ fontSize: 10, color: "#777", margin: "1px 0 0" }}>{s.website}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#b5451b", letterSpacing: 1, margin: 0 }}>QUOTATION</p>
          <p style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, margin: "4px 0 0" }}>{q.reference ?? q.id?.slice(0, 8).toUpperCase()}</p>
          <p style={{ fontSize: 10, color: "#777", margin: "4px 0 0" }}>Status: <strong>{QUOTE_STATUS_LABELS[q.status] ?? q.status}</strong></p>
          <p style={{ fontSize: 10, color: "#999", margin: "2px 0 0", fontStyle: "italic" }}>This is not a tax invoice</p>
        </div>
      </div>

      {/* Billing parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ background: "#f9f7f4", borderRadius: 6, padding: "10px 14px" }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 4px", fontWeight: 600 }}>Prepared By</p>
          <p style={{ fontWeight: 700, margin: 0 }}>{s.companyName || "Zawadi Corporate Gifting"}</p>
          {s.address && <p style={{ color: "#555", margin: "1px 0 0" }}>{s.address}</p>}
          <p style={{ color: "#555", margin: "1px 0 0" }}>{s.city ?? "Nairobi"}, {s.country ?? "Kenya"}</p>
          {s.accountManagerName && <p style={{ margin: "4px 0 0", fontSize: 10 }}>AM: <strong>{s.accountManagerName}</strong></p>}
          {s.accountManagerEmail && <p style={{ color: "#555", margin: "1px 0 0", fontSize: 10 }}>{s.accountManagerEmail}</p>}
          {s.accountManagerPhone && <p style={{ color: "#555", margin: "1px 0 0", fontSize: 10 }}>{s.accountManagerPhone}</p>}
        </div>
        <div style={{ background: "#f9f7f4", borderRadius: 6, padding: "10px 14px" }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 4px", fontWeight: 600 }}>Prepared For</p>
          <p style={{ fontWeight: 700, margin: 0 }}>{q.corporate_name ?? "—"}</p>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Issue Date", value: formatDate(q.createdAt) },
          { label: "Valid Until", value: formatDate(q.validUntil) },
          { label: "Payment Terms", value: s.defaultPaymentTermsDays ? `Net ${s.defaultPaymentTermsDays} days` : "Net 30 days" },
        ].map(({ label, value }) => (
          <div key={label} style={{ borderLeft: "2px solid #e5ded6", paddingLeft: 10 }}>
            <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 2px", fontWeight: 600 }}>{label}</p>
            <p style={{ fontWeight: 600, margin: 0, color: label === "Valid Until" ? "#b5451b" : "#1a1a1a" }}>{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Line Items */}
      <div style={{ marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#1a1a1a", color: "#fff" }}>
              <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 600 }}>Product / Description</th>
              <th style={{ textAlign: "center", padding: "7px 10px", fontWeight: 600, width: 60 }}>Qty</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600, width: 100 }}>Unit Price</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontWeight: 600, width: 110 }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: "1px solid #e8e2da", background: i % 2 === 0 ? "#fff" : "#faf8f5" }}>
                <td style={{ padding: "7px 10px", fontWeight: 500 }}>{item.product_name}</td>
                <td style={{ textAlign: "center", padding: "7px 10px" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", padding: "7px 10px" }}>{formatKES(item.unit_price)}</td>
                <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 500 }}>{formatKES(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <table style={{ fontSize: 12, minWidth: 260 }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 10px 4px 0", color: "#555" }}>Subtotal (excl. VAT)</td>
              <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500 }}>{formatKES(q.subtotal)}</td>
            </tr>
            {parseFloat(q.discountPct ?? "0") > 0 && (
              <tr>
                <td style={{ padding: "4px 10px 4px 0", color: "#b5451b" }}>Discount ({parseFloat(q.discountPct).toFixed(0)}%)</td>
                <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500, color: "#b5451b" }}>− {formatKES(q.discountAmount)}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "4px 10px 4px 0", color: "#555" }}>VAT @ 16% (KRA)</td>
              <td style={{ textAlign: "right", padding: "4px 0", fontWeight: 500 }}>{formatKES(q.vat)}</td>
            </tr>
            <tr style={{ borderTop: "2px solid #1a1a1a" }}>
              <td style={{ padding: "8px 10px 4px 0", fontWeight: 800, fontSize: 13 }}>Total (incl. VAT)</td>
              <td style={{ textAlign: "right", padding: "8px 0 4px", fontWeight: 800, fontSize: 15, color: "#b5451b" }}>{formatKES(q.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {q.notes && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#92400e", margin: "0 0 4px", fontWeight: 600 }}>Notes</p>
          <p style={{ color: "#44403c", margin: 0, whiteSpace: "pre-wrap" }}>{q.notes}</p>
        </div>
      )}

      {/* Terms */}
      <div style={{ background: "#f9f7f4", border: "1px solid #e5ded6", borderRadius: 6, padding: "10px 14px", marginBottom: 20 }}>
        <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#999", margin: "0 0 6px", fontWeight: 600 }}>Terms & Conditions</p>
        <p style={{ color: "#555", margin: 0, fontSize: 10, lineHeight: 1.5 }}>
          This quotation is valid until the date shown above. A 50% deposit is required to confirm the order. All products are sourced from verified Kenyan artisan suppliers. Prices include 16% VAT as required by KRA.
          {s.invoiceFooter ? ` ${s.invoiceFooter}` : ""}
        </p>
      </div>

      <p style={{ fontSize: 9, color: "#aaa", textAlign: "center", borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 }}>
        {s.companyName || "Zawadi Corporate Gifting"} · {s.city ?? "Nairobi"}, {s.country ?? "Kenya"}
        {s.kraPin ? ` · KRA PIN: ${s.kraPin}` : ""}
        {" "}· Quote {q.reference} · Generated {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

function buildWhatsAppQuoteMsg(q: any): string {
  const lines: string[] = [];
  lines.push(`*Quotation ${q.reference ?? q.id?.slice(0, 8).toUpperCase()}*`);
  if (q.corporate_name) lines.push(`Prepared for: ${q.corporate_name}`);
  lines.push(`Total: KES ${Number(q.total).toLocaleString("en-KE")} (incl. 16% VAT)`);
  lines.push(`Valid until: ${formatDate(q.validUntil)}`);
  const items: any[] = q.items ?? [];
  if (items.length) {
    lines.push("");
    lines.push("*Items:*");
    for (const item of items) {
      lines.push(`• ${item.quantity}x ${item.product_name} @ KES ${Number(item.unit_price).toLocaleString("en-KE")} = KES ${Number(item.line_total).toLocaleString("en-KE")}`);
    }
  }
  lines.push("");
  lines.push("To accept this quote, please reply to this message or contact us.");
  return lines.join("\n");
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

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertAddress, setConvertAddress] = useState("");
  const [convertDate, setConvertDate] = useState("");

  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState("");

  const [editingValidUntil, setEditingValidUntil] = useState(false);
  const [validUntilInput, setValidUntilInput] = useState("");

  const updateValidUntil = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`${BASE}/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valid_until: date }),
      });
      if (!res.ok) throw new Error("Failed to update valid until");
      return res.json();
    },
    onSuccess: () => { invalidate(); setEditingValidUntil(false); },
  });

  const applyDiscount = useMutation({
    mutationFn: async (pct: number) => {
      const res = await fetch(`${BASE}/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount_pct: pct }),
      });
      if (!res.ok) throw new Error("Failed to apply discount");
      return res.json();
    },
    onSuccess: () => { invalidate(); setEditingDiscount(false); },
  });

  const { data: quote, isLoading } = useGetQuote(id, { query: { enabled: !!id, queryKey: getGetQuoteQueryKey(id) } });
  const convertToOrder = useConvertQuoteToOrder();
  const q = quote as any;

  const { data: settings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => fetch(`${BASE}/api/settings`).then(r => r.json()),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(id) });

  const markSent = useMutation({ mutationFn: () => updateQuoteStatus(id, "sent"), onSuccess: invalidate });
  const markAccepted = useMutation({ mutationFn: () => updateQuoteStatus(id, "accepted"), onSuccess: invalidate });
  const markRejected = useMutation({ mutationFn: () => updateQuoteStatus(id, "rejected"), onSuccess: invalidate });

  const duplicateQuote = useMutation({
    mutationFn: async () => {
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch(`${BASE}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corporate_id: q.corporateId,
          notes: q.notes ? `Copy of ${q.reference ?? id.slice(0, 8)} — ${q.notes}` : `Copy of ${q.reference ?? id.slice(0, 8)}`,
          valid_until: validUntil,
          items: (q.items ?? []).map((item: any) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            branded_packaging: item.brandedPackaging ?? false,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to duplicate quote");
      return res.json();
    },
    onSuccess: (newQuote: any) => {
      queryClient.invalidateQueries({ queryKey: ["listQuotes"] });
      setLocation(`/quotes/${newQuote.id}`);
    },
  });

  const openConvertModal = () => {
    setConvertAddress("");
    setConvertDate("");
    setShowConvertModal(true);
  };

  const handleConvert = () => {
    fetch(`${BASE}/api/quotes/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delivery_address: convertAddress.trim() || undefined,
        delivery_date: convertDate || undefined,
      }),
    })
      .then(r => r.json())
      .then((order: any) => {
        if (order?.id) {
          invalidate();
          queryClient.invalidateQueries({ queryKey: ["listOrders"] });
          setShowConvertModal(false);
          setLocation(`/orders/${order.id}`);
        }
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
  const busy = markSent.isPending || markAccepted.isPending || markRejected.isPending || convertToOrder.isPending || duplicateQuote.isPending;

  return (
    <Layout>
      {/* Hidden printable version */}
      {q && <PrintableQuote q={q} settings={settings} />}

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
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span>Created {formatDate(q.createdAt)}</span>
                <span>·</span>
                {editingValidUntil ? (
                  <span className="flex items-center gap-1.5">
                    <span>Valid until</span>
                    <input
                      type="date"
                      value={validUntilInput}
                      onChange={e => setValidUntilInput(e.target.value)}
                      className="border border-input rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                      autoFocus
                    />
                    <button onClick={() => updateValidUntil.mutate(validUntilInput)} disabled={!validUntilInput || updateValidUntil.isPending} className="text-primary font-semibold hover:underline">Save</button>
                    <button onClick={() => setEditingValidUntil(false)} className="text-muted-foreground hover:underline">Cancel</button>
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 ${new Date(q.validUntil) < new Date() ? "text-destructive font-medium" : ""}`}>
                    Valid until {formatDate(q.validUntil)}
                    {(q.status === "draft" || q.status === "sent") && (
                      <button onClick={() => { setValidUntilInput(q.validUntil?.slice(0,10) ?? ""); setEditingValidUntil(true); }} className="text-muted-foreground hover:text-foreground ml-0.5"><Pencil size={10} /></button>
                    )}
                  </span>
                )}
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
                <Button size="sm" onClick={openConvertModal} disabled={busy} className="gap-2" data-testid="button-convert-to-order">
                  Convert to Order
                  <Truck size={13} />
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={() => duplicateQuote.mutate()} disabled={busy} className="gap-1.5" data-testid="button-duplicate-quote">
                <Copy size={13} />
                {duplicateQuote.isPending ? "Duplicating…" : "Duplicate"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppQuoteMsg(q))}`, "_blank")}
                className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                data-testid="button-whatsapp-share"
              >
                <MessageCircle size={13} /> WhatsApp
              </Button>

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

            {/* Discount row */}
            {isDraft ? (
              editingDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="text-primary text-xs font-medium flex-1">Discount %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={discountInput}
                    onChange={e => setDiscountInput(e.target.value)}
                    className="w-16 h-7 rounded border border-input bg-background px-2 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="0"
                    autoFocus
                    data-testid="input-discount-pct"
                  />
                  <button
                    onClick={() => applyDiscount.mutate(parseFloat(discountInput) || 0)}
                    disabled={applyDiscount.isPending}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Apply"
                    data-testid="button-apply-discount"
                  >
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingDiscount(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setDiscountInput(parseFloat(q.discountPct ?? "0").toFixed(0)); setEditingDiscount(true); }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-edit-discount"
                  >
                    <Tag size={11} />
                    {parseFloat(q.discountPct ?? "0") > 0
                      ? `Discount (${parseFloat(q.discountPct).toFixed(0)}%) — edit`
                      : "Add discount"}
                  </button>
                  {parseFloat(q.discountPct ?? "0") > 0 && (
                    <span className="font-medium text-primary">− {formatKES(q.discountAmount)}</span>
                  )}
                </div>
              )
            ) : (
              parseFloat(q.discountPct ?? "0") > 0 && (
                <div className="flex justify-between">
                  <span className="text-primary">Discount ({parseFloat(q.discountPct).toFixed(0)}%)</span>
                  <span className="font-medium text-primary">− {formatKES(q.discountAmount)}</span>
                </div>
              )
            )}

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

      {/* Convert to Order — delivery modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-primary" />
                <h2 className="text-base font-semibold text-foreground">Convert to Order</h2>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Optionally add delivery details for this order. You can always update them later.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Delivery Address <span className="text-muted-foreground/50">(optional)</span></label>
                <textarea
                  rows={2}
                  value={convertAddress}
                  onChange={e => setConvertAddress(e.target.value)}
                  placeholder="e.g. Safaricom HQ, Waiyaki Way, Westlands, Nairobi"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  data-testid="input-convert-address"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Expected Delivery Date <span className="text-muted-foreground/50">(optional)</span></label>
                <input
                  type="date"
                  value={convertDate}
                  onChange={e => setConvertDate(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-convert-date"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1 gap-2" onClick={handleConvert} data-testid="button-confirm-convert">
                <Truck size={13} /> Confirm & Create Order
              </Button>
              <Button variant="outline" onClick={() => setShowConvertModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
