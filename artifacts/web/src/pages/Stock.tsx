import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Warehouse, Search, Plus, Minus, ClipboardList, AlertTriangle, PackageX, CheckCircle2, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type StockFilter = "all" | "low" | "out";

function stockStatus(stockQty: number | null, moq: number): { label: string; color: string; icon: React.ReactNode } {
  if (stockQty === null || stockQty === undefined) return { label: "Not tracked", color: "text-muted-foreground bg-muted", icon: null };
  if (stockQty === 0) return { label: "Out of stock", color: "text-red-700 bg-red-50 border border-red-200", icon: <PackageX size={11} /> };
  if (stockQty < moq) return { label: "Low stock", color: "text-amber-700 bg-amber-50 border border-amber-200", icon: <AlertTriangle size={11} /> };
  return { label: "In stock", color: "text-green-700 bg-green-50 border border-green-200", icon: <CheckCircle2 size={11} /> };
}

export default function Stock() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [supplierId, setSupplierId] = useState("");
  const [adjustMode, setAdjustMode] = useState<"adjust" | "set">("adjust");
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const { data: productsData, isLoading } = useQuery<any>({
    queryKey: ["stock-products", search, supplierId],
    queryFn: () =>
      fetch(`${BASE}/api/products?limit=200&show_inactive=true${search ? `&search=${encodeURIComponent(search)}` : ""}${supplierId ? `&supplier_id=${supplierId}` : ""}`)
        .then(r => r.json()),
    staleTime: 15_000,
  });

  const { data: suppliersData } = useQuery<any>({
    queryKey: ["suppliers-dropdown"],
    queryFn: () => fetch(`${BASE}/api/suppliers?limit=100`).then(r => r.json()),
    staleTime: 60_000,
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, adjustment, setTo }: { id: string; adjustment?: number; setTo?: number }) => {
      const body = setTo !== undefined ? { setTo } : { adjustment };
      const res = await fetch(`${BASE}/api/products/${id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stock-products"] }),
  });

  const allProducts: any[] = productsData?.items ?? [];
  const suppliers: any[] = suppliersData?.items ?? (Array.isArray(suppliersData) ? suppliersData : []);
  const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.id, s.name]));

  const filtered = allProducts.filter(p => {
    const qty = p.stockQty ?? null;
    const moq = p.moq ?? 1;
    if (filter === "out") return qty === 0;
    if (filter === "low") return qty !== null && qty > 0 && qty < moq;
    return true;
  });

  const totalTracked = allProducts.filter(p => p.stockQty !== null).length;
  const outCount = allProducts.filter(p => p.stockQty === 0).length;
  const lowCount = allProducts.filter(p => p.stockQty !== null && p.stockQty > 0 && p.stockQty < (p.moq ?? 1)).length;

  const handleApply = async (id: string) => {
    const raw = adjustments[id] ?? "";
    const n = parseInt(raw);
    if (isNaN(n)) return;
    if (adjustMode === "adjust" && n === 0) return;
    setSaving(s => ({ ...s, [id]: true }));
    try {
      if (adjustMode === "set") {
        await adjustMutation.mutateAsync({ id, setTo: Math.max(0, n) });
      } else {
        await adjustMutation.mutateAsync({ id, adjustment: n });
      }
      setAdjustments(a => { const copy = { ...a }; delete copy[id]; return copy; });
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Warehouse size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-foreground">Stock Management</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track inventory levels and adjust stock counts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const rows = filtered.map((p: any) => [
                  p.name ?? "",
                  p.supplier?.name ?? "",
                  p.category?.name ?? "",
                  p.stockQty ?? 0,
                  p.moq ?? 1,
                  p.unitPrice ?? 0,
                ]);
                const header = ["Product", "Supplier", "Category", "Stock Qty", "MOQ", "Unit Price (KES)"];
                const csv = [header, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `zawadi-stock-${new Date().toISOString().slice(0,10)}.csv`;
                a.click(); URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors"
              data-testid="btn-export-csv"
            >
              <Download size={13} /> Export CSV
            </button>
            <Link
              href="/purchase-orders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors"
              data-testid="link-purchase-orders"
            >
              <ClipboardList size={13} /> Purchase Orders
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Tracked Products", value: isLoading ? "—" : String(totalTracked), onClick: () => setFilter("all"), active: filter === "all" },
            { label: "Out of Stock", value: isLoading ? "—" : String(outCount), onClick: () => setFilter(filter === "out" ? "all" : "out"), active: filter === "out", danger: outCount > 0 },
            { label: "Low Stock", value: isLoading ? "—" : String(lowCount), onClick: () => setFilter(filter === "low" ? "all" : "low"), active: filter === "low", warn: lowCount > 0 },
          ].map(({ label, value, onClick, active, danger, warn }) => (
            <button
              key={label}
              onClick={onClick}
              className={`bg-card border rounded-xl p-4 shadow-sm text-left transition-all hover:shadow-md ${
                active ? "border-primary/40 ring-1 ring-primary/20" : "border-card-border"
              }`}
              data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-2xl font-semibold tabular-nums ${danger ? "text-red-600" : warn ? "text-amber-600" : "text-foreground"}`}>{value}</p>
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium">Update mode:</span>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
            <button
              onClick={() => { setAdjustMode("adjust"); setAdjustments({}); }}
              className={`px-3 py-1.5 transition-colors ${adjustMode === "adjust" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              data-testid="btn-mode-adjust"
            >
              ± Adjust
            </button>
            <button
              onClick={() => { setAdjustMode("set"); setAdjustments({}); }}
              className={`px-3 py-1.5 transition-colors border-l border-border ${adjustMode === "set" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              data-testid="btn-mode-set"
            >
              = Set to
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {adjustMode === "adjust" ? "Add or remove stock relative to current count" : "Enter absolute quantity to overwrite current count"}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-testid="input-search"
            />
          </div>
          <Select value={supplierId} onValueChange={v => setSupplierId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-supplier">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_100px_130px_180px] px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Stock Qty</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">MOQ</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Status</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
              {adjustMode === "adjust" ? "± Adjust" : "= Set to"}
            </span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Warehouse size={32} className="opacity-30" />
              <p className="text-sm">
                {filter !== "all" ? "No products match this filter" : "No products found"}
              </p>
              {filter !== "all" && (
                <button onClick={() => setFilter("all")} className="text-xs text-primary hover:underline">Show all</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p: any) => {
                const qty = p.stockQty ?? null;
                const moq = p.moq ?? 1;
                const status = stockStatus(qty, moq);
                const adjVal = adjustments[p.id] ?? "";
                const isSaving = saving[p.id] ?? false;

                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_100px_130px_180px] px-5 py-3.5 items-center hover:bg-muted/20 transition-colors ${qty === 0 ? "bg-red-50/30" : qty !== null && qty < moq ? "bg-amber-50/20" : ""}`}
                    data-testid={`row-product-${p.id}`}
                  >
                    {/* Product */}
                    <div className="min-w-0">
                      <Link href={`/catalogue/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1 group" data-testid={`link-product-${p.id}`}>
                        {p.name}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </Link>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>}
                    </div>

                    {/* Supplier */}
                    <p className="text-xs text-muted-foreground truncate pr-2">{supplierMap[p.supplierId] ?? "—"}</p>

                    {/* Stock Qty */}
                    <p className={`text-sm font-semibold tabular-nums text-right pr-4 ${qty === 0 ? "text-red-600" : qty !== null && qty < moq ? "text-amber-600" : "text-foreground"}`}>
                      {qty !== null ? qty.toLocaleString() : <span className="text-muted-foreground font-normal text-xs">—</span>}
                    </p>

                    {/* MOQ */}
                    <p className="text-xs text-muted-foreground text-right pr-4">{moq.toLocaleString()}</p>

                    {/* Status badge */}
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    {/* Adjust */}
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => setAdjustments(a => ({ ...a, [p.id]: String((parseInt(a[p.id] ?? "0") || 0) - 1) }))}
                        className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Decrease"
                        data-testid={`btn-decrease-${p.id}`}
                      >
                        <Minus size={10} />
                      </button>
                      <input
                        type="number"
                        value={adjVal}
                        onChange={e => setAdjustments(a => ({ ...a, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleApply(p.id)}
                        placeholder="0"
                        className="w-14 h-6 rounded border border-input bg-background px-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                        data-testid={`input-adjust-${p.id}`}
                      />
                      <button
                        onClick={() => setAdjustments(a => ({ ...a, [p.id]: String((parseInt(a[p.id] ?? "0") || 0) + 1) }))}
                        className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Increase"
                        data-testid={`btn-increase-${p.id}`}
                      >
                        <Plus size={10} />
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!adjVal || adjVal === "0" || isSaving}
                        onClick={() => handleApply(p.id)}
                        className="h-6 px-2 text-[11px]"
                        data-testid={`btn-apply-${p.id}`}
                      >
                        {isSaving ? "…" : "Apply"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Showing {filtered.length} of {allProducts.length} products
            {filter !== "all" && ` · filtered by "${filter === "out" ? "out of stock" : "low stock"}"`}
          </p>
        )}
      </div>
    </Layout>
  );
}
