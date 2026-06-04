import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { FileText, ChevronRight, Plus, Trash2, X, ChevronDown, Package, Search, Download } from "lucide-react";
import {
  useListQuotes, getListQuotesQueryKey,
  useListCorporates, getListCorporatesQueryKey,
  useListProducts, getListProductsQueryKey,
  useCreateQuote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, QUOTE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];
const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

const VAT_RATE = 0.16;

interface LineItem {
  productId: string;
  productName: string;
  basePrice: number;
  unitPrice: number;
  bulkTiers: Array<{ min_qty: number; price_per_unit: number }>;
  quantity: number;
}

function getEffectivePrice(
  basePrice: number,
  tiers: Array<{ min_qty: number; price_per_unit: number }>,
  qty: number
): number {
  if (!tiers?.length) return basePrice;
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  for (const tier of sorted) {
    if (qty >= tier.min_qty) return tier.price_per_unit;
  }
  return basePrice;
}

function exportCSV(rows: any[]) {
  const headers = ["Reference", "Client", "Status", "Subtotal (KES)", "VAT (KES)", "Total (KES)", "Valid Until", "Created"];
  const lines = rows.map((q: any) => [
    q.reference ?? q.id.slice(0, 8).toUpperCase(),
    q.corporateName ?? "",
    q.status,
    Number(q.subtotal ?? 0).toFixed(2),
    Number(q.vat ?? 0).toFixed(2),
    Number(q.total ?? 0).toFixed(2),
    q.validUntil ? new Date(q.validUntil).toISOString().slice(0, 10) : "",
    q.createdAt ? new Date(q.createdAt).toISOString().slice(0, 10) : "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`));
  const csv = [headers.map((h) => `"${h}"`).join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zawadi-quotes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Quotes() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") ?? "");
  const [search, setSearch] = useState("");
  const [filterCorporateId, setFilterCorporateId] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const [showModal, setShowModal] = useState(false);
  const [modalCorporateId, setModalCorporateId] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalValidUntil, setModalValidUntil] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: "", productName: "", basePrice: 0, unitPrice: 0, bulkTiers: [], quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hamperLabel, setHamperLabel] = useState("");

  const params = { status: status || undefined, search: search || undefined, corporate_id: filterCorporateId || undefined, limit: LIMIT, offset };
  const { data: quotes, isLoading } = useListQuotes(params as any, { query: { queryKey: getListQuotesQueryKey(params as any) } });
  const quoteList = (quotes as any)?.items ?? [];
  const total: number = (quotes as any)?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const { data: corporates } = useListCorporates(undefined, { query: { queryKey: getListCorporatesQueryKey() } });
  const { data: productsData } = useListProducts({ limit: 50, offset: 0 }, { query: { queryKey: getListProductsQueryKey({ limit: 50, offset: 0 }), enabled: showModal } });
  const createQuote = useCreateQuote();

  const corporateList = (corporates as any[]) ?? [];
  const productList = (productsData as any)?.items ?? [];

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const resetModal = () => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setModalValidUntil(d.toISOString().slice(0, 10));
    setModalCorporateId("");
    setModalNotes("");
    setLineItems([{ productId: "", productName: "", basePrice: 0, unitPrice: 0, bulkTiers: [], quantity: 1 }]);
    setSubmitError("");
    setHamperLabel("");
  };

  const openModal = () => {
    resetModal();
    setShowModal(true);
  };

  // Auto-open modal pre-filled from URL params (?corporateId= or ?hamperId=)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const corpId = sp.get("corporateId");
    const hamperId = sp.get("hamperId");

    if (corpId) {
      const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setModalValidUntil(d.toISOString().slice(0, 10));
      setModalCorporateId(corpId);
      setLineItems([{ productId: "", productName: "", basePrice: 0, unitPrice: 0, bulkTiers: [], quantity: 1 }]);
      setSubmitError("");
      setShowModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (hamperId) {
      fetch(`${BASE}/api/hampers/${hamperId}`)
        .then(r => r.json())
        .then(data => {
          if (!data?.id) return;
          const items: LineItem[] = (data.items ?? []).map((item: any) => ({
            productId: item.productId,
            productName: item.product?.name ?? "Product",
            basePrice: parseFloat(item.product?.unitPrice ?? item.unitPrice ?? "0"),
            unitPrice: parseFloat(item.unitPrice ?? item.product?.unitPrice ?? "0"),
            bulkTiers: item.product?.bulkTiers ?? [],
            quantity: item.quantity ?? 1,
          }));
          if (items.length > 0) setLineItems(items);
          setHamperLabel(data.name ?? "Saved Hamper");
          setShowModal(true);
        });
      window.history.replaceState({}, "", window.location.pathname);
    }

    const productId = sp.get("product");
    if (productId) {
      fetch(`${BASE}/api/products/${productId}`)
        .then(r => r.json())
        .then(data => {
          if (!data?.id) return;
          setLineItems([{
            productId: data.id,
            productName: data.name ?? "Product",
            basePrice: parseFloat(data.unitPrice ?? "0"),
            unitPrice: parseFloat(data.unitPrice ?? "0"),
            bulkTiers: data.bulkTiers ?? [],
            quantity: 1,
          }]);
          const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          setModalValidUntil(d.toISOString().slice(0, 10));
          setSubmitError("");
          setShowModal(true);
        });
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLineProduct = (index: number, productId: string) => {
    const product = productList.find((p: any) => p.id === productId);
    const basePrice = parseFloat(product?.unitPrice ?? "0");
    const bulkTiers: Array<{ min_qty: number; price_per_unit: number }> = product?.bulkTiers ?? [];
    const qty = lineItems[index]?.quantity ?? 1;
    const unitPrice = getEffectivePrice(basePrice, bulkTiers, qty);
    setLineItems((prev) => prev.map((item, i) =>
      i === index
        ? { ...item, productId, productName: product?.name ?? "", basePrice, bulkTiers, unitPrice }
        : item
    ));
  };

  const setLineQty = (index: number, qty: number) => {
    setLineItems((prev) => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, qty);
      const unitPrice = getEffectivePrice(item.basePrice, item.bulkTiers, newQty);
      return { ...item, quantity: newQty, unitPrice };
    }));
  };

  const addLine = () => setLineItems((prev) => [...prev, { productId: "", productName: "", basePrice: 0, unitPrice: 0, bulkTiers: [], quantity: 1 }]);
  const removeLine = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const validLines = lineItems.filter((l) => l.productId);
  const modalSubtotal = validLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const modalTotal = modalSubtotal * (1 + VAT_RATE);

  const handleSubmit = () => {
    if (!modalCorporateId) { setSubmitError("Please select a corporate account."); return; }
    if (validLines.length === 0) { setSubmitError("Please add at least one product."); return; }
    setSubmitting(true);
    setSubmitError("");

    createQuote.mutate(
      {
        data: {
          corporate_id: modalCorporateId,
          items: validLines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
          notes: modalNotes || undefined,
          valid_until: modalValidUntil || undefined,
        } as any,
      },
      {
        onSuccess: (quote: any) => {
          setSubmitting(false);
          setShowModal(false);
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey(params) });
          setLocation(`/quotes/${quote.id}`);
        },
        onError: (err: any) => {
          setSubmitting(false);
          setSubmitError(err?.message ?? "Failed to create quote.");
        },
      }
    );
  };

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Quotes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading…" : `${total} quote${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Reference or client…"
                className="h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
                data-testid="input-search"
              />
              {search && (
                <button onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <Select value={filterCorporateId} onValueChange={(v) => { setFilterCorporateId(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-corporate-filter">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {corporateList.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-38 h-9 text-sm" data-testid="select-quote-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {QUOTE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => exportCSV(quoteList)} data-testid="button-export-csv">
              <Download size={13} /> Export CSV
            </Button>
            <Button size="sm" className="gap-2 h-9" onClick={openModal} data-testid="button-new-quote">
              <Plus size={14} /> New Quote
            </Button>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quote</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Valid Until</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td></td>
                  </tr>
                ))
              ) : quoteList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {search ? `No quotes matching "${search}"` : "No quotes found"}
                    </p>
                    {search ? (
                      <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">Clear search</button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={openModal} className="gap-1.5">
                        <Plus size={13} /> Create your first quote
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                quoteList.map((quote: any) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/quotes/${quote.id}`)}
                    data-testid={`row-quote-${quote.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground text-sm font-mono">{quote.reference ?? quote.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{quote.corporate_name ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(quote.createdAt)}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {quote.validUntil ? (() => {
                        const days = Math.ceil((new Date(quote.validUntil).getTime() - Date.now()) / 86400000);
                        const isActiveSent = quote.status === "sent";
                        if (isActiveSent && days < 0)
                          return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Expired {Math.abs(days)}d ago</span>;
                        if (isActiveSent && days <= 7)
                          return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">Expires in {days}d</span>;
                        return <span className="text-xs text-muted-foreground">{formatDate(quote.validUntil)}</span>;
                      })() : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge label={QUOTE_STATUS_LABELS[quote.status] ?? quote.status} colorClass={QUOTE_STATUS_COLORS[quote.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(quote.total)}</td>
                    <td className="px-5 py-3"><ChevronRight size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + LIMIT)}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* New Quote Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40 backdrop-blur-sm" data-testid="modal-new-quote">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-serif font-semibold text-foreground">New Quote</h2>
                {hamperLabel && (
                  <p className="text-xs text-primary/80 flex items-center gap-1 mt-0.5">
                    <Package size={11} /> Pre-filled from "{hamperLabel}"
                  </p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Corporate + Valid Until row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Corporate Account <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select
                      value={modalCorporateId}
                      onChange={(e) => { setModalCorporateId(e.target.value); setSubmitError(""); }}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="select-corporate"
                    >
                      <option value="">— Select corporate —</option>
                      {corporateList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Valid Until</label>
                  <input
                    type="date"
                    value={modalValidUntil}
                    onChange={(e) => setModalValidUntil(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-valid-until"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items <span className="text-destructive">*</span></label>
                  <button onClick={addLine} className="text-xs text-primary hover:underline flex items-center gap-0.5" data-testid="button-add-line">
                    <Plus size={11} /> Add line
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((line, i) => {
                    const hasDiscount = line.productId && line.unitPrice < line.basePrice;
                    return (
                    <div key={i} data-testid={`line-item-${i}`}>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <select
                            value={line.productId}
                            onChange={(e) => setLineProduct(i, e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                            data-testid={`select-product-${i}`}
                          >
                            <option value="">— Product —</option>
                            {productList.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({formatKES(p.unitPrice)})</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => setLineQty(i, parseInt(e.target.value) || 1)}
                          className="w-20 h-9 rounded-lg border border-input bg-background px-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid={`input-qty-${i}`}
                          placeholder="Qty"
                        />
                        {lineItems.length > 1 && (
                          <button onClick={() => removeLine(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" data-testid={`button-remove-line-${i}`}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {hasDiscount && (
                        <p className="text-[10px] text-green-700 font-medium mt-1 ml-1 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                          Volume price: {formatKES(line.unitPrice)}/unit
                          <span className="text-muted-foreground line-through ml-1">{formatKES(line.basePrice)}</span>
                        </p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Running total */}
              {validLines.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatKES(modalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">VAT (16%)</span>
                    <span className="font-medium">{formatKES(modalSubtotal * VAT_RATE)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-1">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-primary tabular-nums">{formatKES(modalTotal)}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes (optional)</label>
                <Textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Special requirements, event context, delivery preferences..."
                  className="text-sm resize-none h-20"
                  data-testid="textarea-notes"
                />
              </div>

              {submitError && (
                <p className="text-xs text-destructive font-medium" data-testid="text-submit-error">{submitError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !modalCorporateId || validLines.length === 0} className="gap-2" data-testid="button-confirm-quote">
                {submitting ? "Creating…" : "Create Quote"}
                {!submitting && <FileText size={13} />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
