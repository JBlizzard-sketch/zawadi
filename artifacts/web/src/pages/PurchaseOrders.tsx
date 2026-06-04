import { useState } from "react";
import { useLocation } from "wouter";
import { ClipboardList, Plus, X, Search, ChevronRight, Trash2, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function exportCSV(rows: any[]) {
  const headers = ["PO Number", "Supplier", "Status", "Total (KES)", "Expected Date", "Created"];
  const lines = rows.map((p: any) => [
    p.poNumber ?? p.id.slice(0, 8).toUpperCase(),
    p.supplierName ?? "",
    p.status,
    Number(p.total ?? 0).toFixed(2),
    p.expectedDate ? new Date(p.expectedDate).toISOString().slice(0, 10) : "",
    p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`));
  const csv = [headers.map((h) => `"${h}"`).join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zawadi-purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

const PO_STATUSES = ["draft", "sent", "acknowledged", "received", "cancelled"];
const PO_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", acknowledged: "Acknowledged", received: "Received", cancelled: "Cancelled",
};
const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  acknowledged: "bg-violet-100 text-violet-700 border-violet-200",
  received: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

interface POItem {
  productId: string;
  productName: string;
  unitCost: string;
  quantity: string;
}

export default function PurchaseOrders() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const [showModal, setShowModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<POItem[]>([{ productId: "", productName: "", unitCost: "", quantity: "1" }]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  params.set("limit", String(LIMIT));
  params.set("offset", String(offset));

  const { data: posData, isLoading } = useQuery<any>({
    queryKey: ["purchase-orders", search, status, offset],
    queryFn: () => fetch(`${BASE}/api/purchase-orders?${params}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const poList = posData?.items ?? [];
  const total: number = posData?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const { data: suppliersData } = useQuery<any>({
    queryKey: ["suppliers-all"],
    queryFn: () => fetch(`${BASE}/api/suppliers?limit=200`).then((r) => r.json()),
    enabled: showModal,
    staleTime: 60_000,
  });
  const supplierList = suppliersData?.items ?? [];

  const selectedSupplier = supplierList.find((s: any) => s.id === supplierId);

  const { data: productsData } = useQuery<any>({
    queryKey: ["products-for-po", supplierId],
    queryFn: () => fetch(`${BASE}/api/products?supplier_id=${supplierId}&limit=100`).then((r) => r.json()),
    enabled: showModal && !!supplierId,
    staleTime: 60_000,
  });
  const productList = productsData?.items ?? [];

  const openModal = () => {
    setSupplierId(""); setItems([{ productId: "", productName: "", unitCost: "", quantity: "1" }]);
    setNotes(""); setExpectedDate(""); setSubmitError(""); setShowModal(true);
  };

  const setItemField = (i: number, field: keyof POItem, val: string) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (field === "productId") {
        const p = productList.find((p: any) => p.id === val);
        return { ...item, productId: val, productName: p?.name ?? "", unitCost: p?.unitPrice ?? "" };
      }
      return { ...item, [field]: val };
    }));
  };

  const addItem = () => setItems((p) => [...p, { productId: "", productName: "", unitCost: "", quantity: "1" }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const validItems = items.filter((l) => l.productId && l.unitCost && l.quantity);
  const modalTotal = validItems.reduce((s, l) => s + (parseFloat(l.unitCost) || 0) * (parseInt(l.quantity) || 1), 0);

  const handleSubmit = async () => {
    if (!supplierId) { setSubmitError("Please select a supplier."); return; }
    if (validItems.length === 0) { setSubmitError("Add at least one product."); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch(`${BASE}/api/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          notes: notes || undefined,
          expectedDate: expectedDate || undefined,
          items: validItems.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            unitCost: l.unitCost,
            quantity: parseInt(l.quantity) || 1,
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create"); }
      const po = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setShowModal(false);
      setLocation(`/purchase-orders/${po.id}`);
    } catch (e: any) {
      setSubmitError(e.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading…" : `${total} PO${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
                placeholder="Reference or supplier…"
                className="h-9 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
              />
              {search && (
                <button onClick={() => { setSearch(""); setOffset(0); }} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-38 h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PO_STATUSES.map((s) => <SelectItem key={s} value={s}>{PO_STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={() => exportCSV(poList)} data-testid="button-export-csv">
              <Download size={13} /> Export CSV
            </Button>
            <Button size="sm" className="gap-2 h-9" onClick={openModal}>
              <Plus size={14} /> New PO
            </Button>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Expected</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Created</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td />
                  </tr>
                ))
              ) : poList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {search || status ? "No POs match your filters" : "No purchase orders yet"}
                    </p>
                    {!search && !status && (
                      <Button size="sm" variant="outline" onClick={openModal} className="gap-1.5">
                        <Plus size={13} /> Create your first PO
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                poList.map((po: any) => (
                  <tr
                    key={po.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/purchase-orders/${po.id}`)}
                    data-testid={`row-po-${po.id}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{po.reference}</td>
                    <td className="px-5 py-3 text-foreground">{po.supplierName ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${PO_STATUS_COLORS[po.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                        {PO_STATUS_LABELS[po.status] ?? po.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatKES(po.totalAmount)}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{po.expectedDate ? formatDate(po.expectedDate) : "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden lg:table-cell">{formatDate(po.createdAt)}</td>
                    <td className="px-5 py-3"><ChevronRight size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setOffset(offset + LIMIT)}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-serif font-semibold">New Purchase Order</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Supplier <span className="text-primary">*</span></label>
                <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setItems([{ productId: "", productName: "", unitCost: "", quantity: "1" }]); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose supplier…" /></SelectTrigger>
                  <SelectContent>
                    {supplierList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items <span className="text-primary">*</span></label>
                  <button onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus size={11} /> Add line</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_90px_90px_28px] gap-2 items-start">
                      <Select value={item.productId} onValueChange={(v) => setItemField(i, "productId", v)} disabled={!supplierId}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={supplierId ? "Select product…" : "Choose supplier first"} /></SelectTrigger>
                        <SelectContent>
                          {productList.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <input
                        type="number" min="0" step="0.01"
                        value={item.unitCost}
                        onChange={(e) => setItemField(i, "unitCost", e.target.value)}
                        placeholder="Unit cost"
                        className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                      />
                      <input
                        type="number" min="1"
                        value={item.quantity}
                        onChange={(e) => setItemField(i, "quantity", e.target.value)}
                        placeholder="Qty"
                        className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                      />
                      <button onClick={() => removeItem(i)} disabled={items.length === 1} className="mt-2 text-muted-foreground hover:text-red-500 disabled:opacity-30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {validItems.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    Total: <span className="font-semibold text-foreground">{formatKES(modalTotal)}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Expected Delivery</label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Notes</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" className="h-9 text-sm" />
                </div>
              </div>

              {submitError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submitError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !supplierId || validItems.length === 0}>
                {submitting ? "Creating…" : "Create PO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
