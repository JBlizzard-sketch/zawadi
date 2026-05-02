import { useState } from "react";
import { useLocation } from "wouter";
import { ShoppingCart, ChevronRight, Search, X, Download, Plus, Trash2, ChevronDown } from "lucide-react";
import {
  useListOrders, getListOrdersQueryKey,
  useListCorporates, getListCorporatesQueryKey,
  useListProducts, getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/layout/Layout";

const STATUSES = [
  "pending", "confirmed", "in_production", "quality_check",
  "packaging", "dispatched", "delivered", "cancelled",
];

const VAT_RATE = 0.16;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LineItem { productId: string; productName: string; unitPrice: number; quantity: number; }

function exportCSV(rows: any[]) {
  if (!rows.length) return;
  const headers = ["Reference", "Date", "Client", "Status", "Recipients", "Total (KES)"];
  const lines = rows.map((o) => [
    o.reference ?? "",
    o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-KE") : "",
    o.corporate_name ?? "",
    o.status ?? "",
    String(o.recipientCount ?? 0),
    String(parseFloat(o.total ?? "0").toFixed(2)),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zawadi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [modalCorporateId, setModalCorporateId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ productId: "", productName: "", unitPrice: 0, quantity: 1 }]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const params = { status: status || undefined, search: search || undefined, limit, offset };
  const { data: ordersData, isLoading } = useListOrders(params, { query: { queryKey: getListOrdersQueryKey(params) } });

  const orders = (ordersData as any)?.items ?? [];
  const total = (ordersData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const { data: corporates } = useListCorporates(undefined, { query: { queryKey: getListCorporatesQueryKey(), enabled: showModal } });
  const { data: productsData } = useListProducts({ limit: 50, offset: 0 }, { query: { queryKey: getListProductsQueryKey({ limit: 50, offset: 0 }), enabled: showModal } });

  const corporateList = (corporates as any[]) ?? [];
  const productList = (productsData as any)?.items ?? [];

  const createOrder = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(params) });
      setShowModal(false);
      setLocation(`/orders/${order.id}`);
    },
  });

  const openModal = () => {
    setModalCorporateId(""); setLineItems([{ productId: "", productName: "", unitPrice: 0, quantity: 1 }]);
    setDeliveryAddress(""); setDeliveryDate(""); setModalNotes(""); setSubmitError("");
    setShowModal(true);
  };

  const setLineProduct = (i: number, productId: string) => {
    const p = productList.find((p: any) => p.id === productId);
    setLineItems((prev) => prev.map((item, idx) =>
      idx === i ? { ...item, productId, productName: p?.name ?? "", unitPrice: parseFloat(p?.unitPrice ?? "0") } : item
    ));
  };
  const setLineQty = (i: number, qty: number) => setLineItems((prev) => prev.map((item, idx) => idx === i ? { ...item, quantity: Math.max(1, qty) } : item));
  const addLine = () => setLineItems((prev) => [...prev, { productId: "", productName: "", unitPrice: 0, quantity: 1 }]);
  const removeLine = (i: number) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  const validLines = lineItems.filter((l) => l.productId);
  const modalSubtotal = validLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const modalVAT = modalSubtotal * VAT_RATE;
  const modalTotal = modalSubtotal + modalVAT;

  const handleSubmit = () => {
    if (!modalCorporateId) { setSubmitError("Please select a corporate account."); return; }
    if (validLines.length === 0) { setSubmitError("Please add at least one product."); return; }
    setSubmitError("");
    createOrder.mutate({
      corporate_id: modalCorporateId,
      items: validLines.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
      delivery_address: deliveryAddress || undefined,
      delivery_date: deliveryDate || undefined,
      notes: modalNotes || undefined,
    });
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">{total} order{total !== 1 ? "s" : ""} total</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportCSV(orders)}
              disabled={orders.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-export-csv"
            >
              <Download size={13} /> Export CSV
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Search reference or client…"
                className="h-9 pl-8 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
                data-testid="input-search"
              />
              {search && (
                <button onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2 h-9" onClick={openModal} data-testid="button-new-order">
              <Plus size={14} /> New Order
            </Button>
          </div>
        </div>

        {/* Status Pipeline */}
        <div className="bg-card border border-card-border rounded-xl p-4 mb-6 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STATUSES.filter(s => s !== "cancelled").map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => { setStatus(status === s ? "" : s); setOffset(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    status === s ? ORDER_STATUS_COLORS[s] + " ring-1 ring-offset-1 ring-primary/30" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`filter-status-${s}`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
                {i < STATUSES.filter(s => s !== "cancelled").length - 1 && (
                  <ChevronRight size={12} className="text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Recipients</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <ShoppingCart size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No orders found</p>
                    <Button size="sm" variant="outline" onClick={openModal} className="gap-1.5">
                      <Plus size={13} /> Create first order
                    </Button>
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/orders/${order.id}`)}
                    data-testid={`row-order-${order.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{order.reference}</p>
                      {order.corporate_name && <p className="text-xs text-muted-foreground">{order.corporate_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} colorClass={ORDER_STATUS_COLORS[order.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground hidden lg:table-cell">{order.recipientCount ?? 0}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(order.total)}</td>
                    <td className="px-5 py-3">
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button disabled={currentPage === 1} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors" data-testid="button-prev-page">Previous</button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setOffset(offset + limit)} className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors" data-testid="button-next-page">Next</button>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" data-testid="modal-new-order">
          <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-base font-serif font-semibold text-foreground">New Order</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              {/* Corporate */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Corporate Account <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select
                    value={modalCorporateId}
                    onChange={(e) => { setModalCorporateId(e.target.value); setSubmitError(""); }}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="select-corporate"
                  >
                    <option value="">— Select corporate account —</option>
                    {corporateList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Products <span className="text-destructive">*</span></label>
                  <button onClick={addLine} className="text-xs text-primary hover:underline flex items-center gap-0.5" data-testid="button-add-line">
                    <Plus size={11} /> Add product
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((line, i) => (
                    <div key={i} className="flex gap-2 items-center" data-testid={`line-item-${i}`}>
                      <div className="relative flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => setLineProduct(i, e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                          data-testid={`select-product-${i}`}
                        >
                          <option value="">— Select product —</option>
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
                  ))}
                </div>
              </div>

              {/* Running total */}
              {validLines.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
                    <span className="font-medium">{formatKES(modalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">VAT @ 16% (KRA)</span>
                    <span className="font-medium">{formatKES(modalVAT)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-1">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-primary tabular-nums">{formatKES(modalTotal)}</span>
                  </div>
                </div>
              )}

              {/* Delivery */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-delivery-date"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Upper Hill, Nairobi"
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-delivery-address"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Notes (optional)</label>
                <Textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Personalisation details, event context, special packaging…"
                  className="text-sm resize-none h-20"
                  data-testid="textarea-notes"
                />
              </div>

              {submitError && (
                <p className="text-xs text-destructive font-medium" data-testid="text-submit-error">{submitError}</p>
              )}
              {createOrder.isError && (
                <p className="text-xs text-destructive font-medium">Failed to create order. Please try again.</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex gap-3 justify-end flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={createOrder.isPending}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createOrder.isPending || !modalCorporateId || validLines.length === 0}
                className="gap-2"
                data-testid="button-confirm-order"
              >
                {createOrder.isPending ? "Creating…" : "Create Order"}
                {!createOrder.isPending && <ShoppingCart size={13} />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
