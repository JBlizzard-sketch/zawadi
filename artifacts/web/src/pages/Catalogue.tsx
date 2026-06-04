import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, SlidersHorizontal, Package, Star, Plus, X, FileText, Trash2, Download } from "lucide-react";
import {
  useListProducts, getListProductsQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useListSuppliers, getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

const OCCASIONS = [
  { value: "", label: "All occasions" },
  { value: "client_gifts", label: "Client Gifts" },
  { value: "staff_appreciation", label: "Staff Appreciation" },
  { value: "event_giveaways", label: "Event Giveaways" },
  { value: "festive_hampers", label: "Festive Hampers" },
  { value: "onboarding_kits", label: "Onboarding Kits" },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EMPTY_PRODUCT = {
  name: "", supplierId: "", categoryId: "", unitPrice: "",
  moq: "1", leadTimeDays: "7", origin: "", description: "", stockQty: "",
};

export default function Catalogue() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "");
  const [categoryId, setCategoryId] = useState(() => new URLSearchParams(window.location.search).get("category") ?? "");
  const [supplierId, setSupplierId] = useState(() => new URLSearchParams(window.location.search).get("supplier") ?? "");
  const [occasion, setOccasion] = useState(() => new URLSearchParams(window.location.search).get("occasion") ?? "");
  const [lowStock, setLowStock] = useState(() => new URLSearchParams(window.location.search).get("low_stock") === "true");
  const [showInactive, setShowInactive] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc">("default");
  const [showFavourites, setShowFavourites] = useState(false);
  const [favourites, setFavourites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("zawadi_favourites") ?? "[]"); } catch { return []; }
  });

  const toggleFavourite = (pid: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setFavourites((prev) => {
      const next = prev.includes(pid) ? prev.filter((x) => x !== pid) : [pid, ...prev];
      try { localStorage.setItem("zawadi_favourites", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Recently viewed — read from localStorage (set by ProductDetail on visit)
  const recentIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("zawadi_recently_viewed") ?? "[]"); } catch { return []; }
  })();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [tiers, setTiers] = useState<Array<{ min_qty: string; price_per_unit: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addTier = () => setTiers((t) => [...t, { min_qty: "", price_per_unit: "" }]);
  const updateTier = (i: number, field: "min_qty" | "price_per_unit", val: string) =>
    setTiers((t) => t.map((tier, idx) => idx === i ? { ...tier, [field]: val } : tier));
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i));

  const params = {
    search: search || undefined,
    category_id: categoryId || undefined,
    supplier_id: supplierId || undefined,
    occasion: occasion || undefined,
    low_stock: lowStock ? "true" : undefined,
    show_inactive: showInactive ? "true" : undefined,
    limit,
    offset,
  } as any;

  const { data: productsData, isLoading } = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: suppliersData } = useListSuppliers(undefined, { query: { queryKey: getListSuppliersQueryKey() } });

  const rawProducts = (productsData as any)?.items ?? [];
  const products = [...rawProducts]
    .filter((p: any) => !showFavourites || favourites.includes(p.id))
    .sort((a: any, b: any) => {
      if (sortBy === "price_asc") return Number(a.unitPrice ?? 0) - Number(b.unitPrice ?? 0);
      if (sortBy === "price_desc") return Number(b.unitPrice ?? 0) - Number(a.unitPrice ?? 0);
      return 0;
    });
  const total = (productsData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const categoryList = (categories as any[]) ?? [];
  const supplierList = (suppliersData as any)?.items ?? [];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openModal = () => { setForm({ ...EMPTY_PRODUCT }); setTiers([]); setError(""); setShowModal(true); };

  const handleExportCSV = () => {
    if (!products.length) return;
    const header = "Name,SKU,Category,Supplier,Unit Price (KES),MOQ,Stock Qty,Lead Time (Days),Origin,Status";
    const rows = products.map((p: any) =>
      [
        p.name,
        p.sku ?? "",
        p.category?.name ?? "",
        p.supplier?.name ?? "",
        p.unitPrice,
        p.moq ?? "",
        p.stockQty ?? "",
        p.leadTimeDays ?? "",
        p.origin ?? "",
        p.isActive ? "Active" : "Inactive",
      ]
        .map((v: any) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zawadi-catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (!form.supplierId) { setError("Please select a supplier."); return; }
    if (!form.categoryId) { setError("Please select a category."); return; }
    if (!form.unitPrice || isNaN(Number(form.unitPrice))) { setError("A valid unit price is required."); return; }
    if (!form.origin.trim()) { setError("Origin/county is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          supplierId: form.supplierId,
          categoryId: form.categoryId,
          unitPrice: form.unitPrice,
          moq: parseInt(form.moq) || 1,
          leadTimeDays: parseInt(form.leadTimeDays) || 7,
          stockQty: form.stockQty !== "" ? parseInt(form.stockQty) : null,
          origin: form.origin.trim(),
          description: form.description || undefined,
          bulkTiers: tiers
            .filter((t) => t.min_qty && t.price_per_unit)
            .map((t) => ({ min_qty: parseInt(t.min_qty), price_per_unit: parseFloat(t.price_per_unit) })),
          tags: [],
          occasionTags: [],
          isActive: true,
          isFeatured: false,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.details ?? d.error ?? "Failed to create"); }
      const product = await res.json();
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setShowModal(false);
      setLocation(`/catalogue/${product.id}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Product Catalogue</h1>
            <p className="text-sm text-muted-foreground mt-1">Curated Kenyan artisan products for corporate gifting</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
              <button onClick={() => setSortBy("default")} className={`px-3 py-1.5 transition-colors ${sortBy === "default" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Default</button>
              <button onClick={() => setSortBy("price_asc")} className={`px-3 py-1.5 border-l border-border transition-colors ${sortBy === "price_asc" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Price ↑</button>
              <button onClick={() => setSortBy("price_desc")} className={`px-3 py-1.5 border-l border-border transition-colors ${sortBy === "price_desc" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>Price ↓</button>
            </div>
            {products.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-1.5" data-testid="button-export-catalogue">
                <Download size={14} /> Export CSV
              </Button>
            )}
            <Button size="sm" onClick={openModal} className="gap-1.5" data-testid="button-new-product">
              <Plus size={14} /> New Product
            </Button>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
          <SlidersHorizontal size={15} className="text-muted-foreground" />
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryList.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierId} onValueChange={(v) => { setSupplierId(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-supplier">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {supplierList.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={occasion} onValueChange={(v) => { setOccasion(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-occasion">
              <SelectValue placeholder="All occasions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All occasions</SelectItem>
              {OCCASIONS.slice(1).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto items-center flex-wrap">
            <button
              onClick={() => { setShowFavourites((v) => !v); setOffset(0); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showFavourites ? "bg-yellow-50 border-yellow-300 text-yellow-800" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
              data-testid="filter-favourites"
            >
              ★ Favourites{favourites.length > 0 && ` (${favourites.length})`}
            </button>
            <button
              onClick={() => { setLowStock((v) => !v); setOffset(0); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${lowStock ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
              data-testid="filter-low-stock"
            >
              ⚠ Low Stock
            </button>
            <button
              onClick={() => { setShowInactive((v) => !v); setOffset(0); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showInactive ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
              data-testid="filter-show-inactive"
            >
              {showInactive ? "All products" : "Active only"}
            </button>
            {total > 0 && (
              <p className="text-xs text-muted-foreground">{total} product{total !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>

        {/* Recently Viewed strip */}
        {recentIds.length > 0 && !search && !categoryId && !supplierId && !occasion && !lowStock && (
          <div className="mb-5 bg-card border border-card-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recently Viewed</p>
            <div className="flex gap-2 flex-wrap">
              {recentIds.slice(0, 6).map((rid) => {
                const p = rawProducts.find((x: any) => x.id === rid);
                if (!p) return null;
                return (
                  <Link key={rid} href={`/catalogue/${rid}`} className="flex items-center gap-2 bg-muted hover:bg-muted/80 transition-colors rounded-lg px-3 py-2 text-sm text-foreground border border-border">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt={p.name} className="w-7 h-7 rounded object-cover flex-shrink-0" />
                    ) : (
                      <Package size={14} className="text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{formatKES(p.unitPrice)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border border-card-border">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
            <button onClick={openModal} className="mt-3 text-sm text-primary hover:underline">Add the first product →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => (
              <div key={product.id} className="relative bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group" data-testid={`card-product-${product.id}`}>
                {/* Favourite star button */}
                <button
                  onClick={(e) => toggleFavourite(product.id, e)}
                  className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  data-testid={`btn-favourite-${product.id}`}
                  title={favourites.includes(product.id) ? "Remove from favourites" : "Add to favourites"}
                >
                  <Star size={12} fill={favourites.includes(product.id) ? "#f59e0b" : "none"} stroke={favourites.includes(product.id) ? "#f59e0b" : "#6b7280"} />
                </button>
                <Link href={`/catalogue/${product.id}`} className="block">
                  <div className="h-44 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center relative overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package size={32} className="text-muted-foreground/20" />
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                          <Star size={9} fill="currentColor" /> Featured
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 pb-2">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{product.origin}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatKES(product.unitPrice)}</span>
                      <span className="text-xs text-muted-foreground">MOQ {product.moq}</span>
                    </div>
                    {product.leadTimeDays && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{product.leadTimeDays}d lead time</p>
                    )}
                    {product.stockQty != null && (
                      <p className={`text-[11px] font-medium mt-0.5 ${
                        product.stockQty === 0 ? "text-red-600" :
                        product.stockQty < product.moq ? "text-amber-600" :
                        "text-green-700"
                      }`}>
                        {product.stockQty === 0 ? "Out of stock" :
                         product.stockQty < product.moq ? `Low stock · ${product.stockQty} left` :
                         `${product.stockQty} in stock`}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="px-4 pb-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setLocation(`/quotes?product=${product.id}`); }}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg py-1.5 transition-colors"
                    data-testid={`button-quote-product-${product.id}`}
                  >
                    <FileText size={11} /> Request Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-prev-page"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + limit)}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-next-page"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" data-testid="modal-new-product">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold text-foreground">Add New Product</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Product Name <span className="text-primary">*</span></label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sisal Woven Gift Basket" className="h-9 text-sm" data-testid="input-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Supplier <span className="text-primary">*</span></label>
                  <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v)}>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Category <span className="text-primary">*</span></label>
                  <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-category-modal">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Unit Price (KES) <span className="text-primary">*</span></label>
                  <Input type="number" min="0" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} placeholder="1500" className="h-9 text-sm" data-testid="input-unit-price" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Stock Qty</label>
                  <Input type="number" min="0" value={form.stockQty} onChange={(e) => set("stockQty", e.target.value)} placeholder="e.g. 200" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">MOQ</label>
                  <Input type="number" min="1" value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="1" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Lead Time (days)</label>
                  <Input type="number" min="1" value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} placeholder="7" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Origin / County <span className="text-primary">*</span></label>
                <Input value={form.origin} onChange={(e) => set("origin", e.target.value)} placeholder="e.g. Nairobi, Kenya" className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Brief description of the product..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Bulk Pricing Tiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Volume Pricing Tiers</label>
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-xs text-primary hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <Plus size={11} /> Add tier
                  </button>
                </div>
                {tiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No tiers — use base unit price for all quantities.</p>
                ) : (
                  <div className="space-y-2">
                    {tiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            min={1}
                            value={tier.min_qty}
                            onChange={(e) => updateTier(i, "min_qty", e.target.value)}
                            placeholder="Min qty"
                            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={tier.price_per_unit}
                            onChange={(e) => updateTier(i, "price_per_unit", e.target.value)}
                            placeholder="Price/unit (KES)"
                            className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTier(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">Each row: when order qty ≥ Min qty → that price/unit applies.</p>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name || !form.supplierId || !form.categoryId || !form.unitPrice} data-testid="button-confirm-product">
                {submitting ? "Adding…" : "Add Product"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
