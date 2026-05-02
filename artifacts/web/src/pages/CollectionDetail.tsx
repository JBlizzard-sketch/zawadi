import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Package, Gift, Plus, X, Check, Pencil, Search } from "lucide-react";
import {
  useGetCollection, getGetCollectionQueryKey,
  useListProducts, getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

const OCCASIONS = [
  { value: "client_gifts", label: "Client Gifts" },
  { value: "staff_appreciation", label: "Staff Appreciation" },
  { value: "event_giveaways", label: "Event Giveaways" },
  { value: "festive_hampers", label: "Festive Hampers" },
  { value: "onboarding_kits", label: "Onboarding Kits" },
  { value: "custom", label: "Custom" },
];

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showProducts, setShowProducts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState("");
  const [savingProducts, setSavingProducts] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const { data, isLoading } = useGetCollection(id, { query: { enabled: !!id, queryKey: getGetCollectionQueryKey(id) } });
  const col = data as any;

  const { data: allProductsData } = useListProducts(
    { limit: 200, offset: 0 },
    { query: { queryKey: getListProductsQueryKey({ limit: 200, offset: 0 }), enabled: showProducts } }
  );
  const allProducts = (allProductsData as any)?.products ?? (Array.isArray(allProductsData) ? allProductsData : []);

  const openProducts = () => {
    const existing = new Set<string>((col?.products ?? []).map((p: any) => p.id));
    setSelectedIds(existing);
    setProductSearch("");
    setShowProducts(true);
  };

  const openEdit = () => {
    if (!col) return;
    setEditForm({
      name: col.name ?? "",
      occasion: col.occasion ?? "client_gifts",
      description: col.description ?? "",
      coverImageUrl: col.coverImageUrl ?? "",
      isFeatured: col.isFeatured ?? false,
    });
    setEditError("");
    setShowEdit(true);
  };

  const saveProducts = async () => {
    setSavingProducts(true);
    try {
      const ids = [...selectedIds];
      await fetch(`${BASE}/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: ids }),
      });
      await queryClient.invalidateQueries({ queryKey: getGetCollectionQueryKey(id) });
      setShowProducts(false);
    } finally {
      setSavingProducts(false);
    }
  };

  const removeProduct = async (productId: string) => {
    const remaining = (col.products as any[]).filter((p: any) => p.id !== productId).map((p: any) => p.id);
    await fetch(`${BASE}/api/collections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: remaining }),
    });
    queryClient.invalidateQueries({ queryKey: getGetCollectionQueryKey(id) });
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(`${BASE}/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          occasion: editForm.occasion,
          description: editForm.description.trim() || null,
          coverImageUrl: editForm.coverImageUrl.trim() || null,
          isFeatured: editForm.isFeatured,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: getGetCollectionQueryKey(id) });
      setShowEdit(false);
    } catch (e: any) {
      setEditError(e.message ?? "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = allProducts.filter((p: any) =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 rounded-2xl w-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!col) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Collection not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/collections")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Collections
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl p-8 mb-8 border border-card-border">
          <Badge variant="secondary" className="mb-3">{OCCASION_LABELS[col.occasion] ?? col.occasion}</Badge>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-serif font-semibold text-foreground mb-3" data-testid="text-collection-name">{col.name}</h1>
              {col.description && <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{col.description}</p>}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <span className="text-sm font-bold text-primary">{formatKES(col.minPrice)} {col.maxPrice ? `— ${formatKES(col.maxPrice)}` : "+"}</span>
                <span className="text-sm text-muted-foreground">{col.productCount ?? (col.products?.length ?? 0)} products</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5 bg-white/70 hover:bg-white" data-testid="button-edit-collection">
                <Pencil size={13} /> Edit
              </Button>
              {(col.products ?? []).length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-white/70 hover:bg-white"
                  onClick={() => {
                    const ids = (col.products as any[]).map((p: any) => p.id).join(",");
                    setLocation(`/hamper-builder?products=${ids}&name=${encodeURIComponent(col.name)}`);
                  }}
                  data-testid="button-build-hamper"
                >
                  <Gift size={13} /> Build Hamper
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Products section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Products in this Collection</h2>
          <Button size="sm" onClick={openProducts} className="gap-1.5" data-testid="button-manage-products">
            <Plus size={13} /> Manage Products
          </Button>
        </div>

        {(col.products ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl">
            <Package size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No products in this collection yet</p>
            <p className="text-xs text-muted-foreground/60 mb-5">Add products from your catalogue to build this set</p>
            <Button size="sm" variant="outline" onClick={openProducts} className="gap-1.5">
              <Plus size={13} /> Add Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(col.products as any[]).map((product: any) => (
              <div key={product.id} className="group relative bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-product-${product.id}`}>
                <button
                  onClick={() => removeProduct(product.id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Remove from collection"
                  data-testid={`button-remove-product-${product.id}`}
                >
                  <X size={11} />
                </button>
                <Link href={`/catalogue/${product.id}`}>
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package size={28} className="text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.origin}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatKES(product.unitPrice)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Products Modal */}
      {showProducts && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowProducts(false); }}>
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
              <div>
                <h2 className="text-base font-serif font-semibold text-foreground">Manage Products</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedIds.size} selected</p>
              </div>
              <button onClick={() => setShowProducts(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-8 h-8 text-sm"
                  data-testid="input-product-search"
                />
              </div>
            </div>

            {/* Product list */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No products found</p>
              ) : (
                <div className="space-y-1">
                  {filtered.map((p: any) => {
                    const selected = selectedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          selected ? next.delete(p.id) : next.add(p.id);
                          return next;
                        })}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selected ? "bg-primary/8 border border-primary/20" : "hover:bg-muted/40 border border-transparent"}`}
                        data-testid={`toggle-product-${p.id}`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-primary border-primary" : "border-border bg-background"}`}>
                          {selected && <Check size={11} className="text-primary-foreground" />}
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-muted-foreground/40" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.supplier?.name ?? p.origin}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary flex-shrink-0">{formatKES(p.unitPrice)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between rounded-b-xl flex-shrink-0">
              <p className="text-xs text-muted-foreground">{selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowProducts(false)}>Cancel</Button>
                <Button size="sm" onClick={saveProducts} disabled={savingProducts} data-testid="button-save-products">
                  {savingProducts ? "Saving…" : "Save Selection"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">Edit Collection</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Collection Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Executive Highlands Set" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Occasion</label>
                <Select value={editForm.occasion} onValueChange={v => setEditForm((f: any) => ({ ...f, occasion: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OCCASIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="A curated selection…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cover Image URL</label>
                <Input value={editForm.coverImageUrl} onChange={e => setEditForm((f: any) => ({ ...f, coverImageUrl: e.target.value }))} placeholder="https://images.unsplash.com/…" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.isFeatured}
                  onClick={() => setEditForm((f: any) => ({ ...f, isFeatured: !f.isFeatured }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editForm.isFeatured ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${editForm.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-foreground">Mark as Featured</span>
              </label>
              {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button disabled={!editForm.name?.trim() || savingEdit} onClick={saveEdit} data-testid="button-save-collection">
                {savingEdit ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
