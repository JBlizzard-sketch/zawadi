import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, SlidersHorizontal, Package, Star, Plus, X } from "lucide-react";
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
  moq: "1", leadTimeDays: "7", origin: "", description: "",
};

export default function Catalogue() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [occasion, setOccasion] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const params = {
    search: search || undefined,
    category_id: categoryId || undefined,
    supplier_id: supplierId || undefined,
    occasion: occasion || undefined,
    limit,
    offset,
  };

  const { data: productsData, isLoading } = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: suppliersData } = useListSuppliers(undefined, { query: { queryKey: getListSuppliersQueryKey() } });

  const products = (productsData as any)?.items ?? [];
  const total = (productsData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const categoryList = (categories as any[]) ?? [];
  const supplierList = (suppliersData as any[]) ?? [];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openModal = () => { setForm({ ...EMPTY_PRODUCT }); setError(""); setShowModal(true); };

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
          origin: form.origin.trim(),
          description: form.description || undefined,
          bulkTiers: [],
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
          <Button size="sm" onClick={openModal} className="gap-1.5" data-testid="button-new-product">
            <Plus size={14} /> New Product
          </Button>
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
          {total > 0 && (
            <p className="text-xs text-muted-foreground ml-auto">{total} product{total !== 1 ? "s" : ""}</p>
          )}
        </div>

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
              <Link key={product.id} href={`/catalogue/${product.id}`} className="block bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group" data-testid={`card-product-${product.id}`}>
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
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{product.origin}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatKES(product.unitPrice)}</span>
                      <span className="text-xs text-muted-foreground">MOQ {product.moq}</span>
                    </div>
                    {product.leadTimeDays && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{product.leadTimeDays}d lead time</p>
                    )}
                  </div>
              </Link>
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Unit Price (KES) <span className="text-primary">*</span></label>
                  <Input type="number" min="0" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} placeholder="1500" className="h-9 text-sm" data-testid="input-unit-price" />
                </div>
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
