import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package, Clock, MapPin, Tag, ShoppingCart, Gift, Star, Leaf, Pencil, X, Plus, Trash2, ImagePlus, CheckCircle2 } from "lucide-react";
import { useGetProduct, getGetProductQueryKey, useListCategories, getListCategoriesQueryKey, useListSuppliers, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TierRow { min_qty: string; price_per_unit: string; }

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [saveError, setSaveError] = useState("");

  // Image management
  const [showAddImage, setShowAddImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageError, setImageError] = useState("");

  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id, queryKey: getGetProductQueryKey(id) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey(), enabled: showEdit } });
  const { data: suppliersData } = useListSuppliers(undefined, { query: { queryKey: getListSuppliersQueryKey(), enabled: showEdit } });

  const categoryList = (categories as any[]) ?? [];
  const supplierList = (suppliersData as any[]) ?? [];

  const saveProduct = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${BASE}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
      setShowEdit(false);
    },
    onError: (e: any) => setSaveError(e.message ?? "Something went wrong."),
  });

  const addImage = useMutation({
    mutationFn: async ({ url, alt, isPrimary }: { url: string; alt: string; isPrimary: boolean }) => {
      const res = await fetch(`${BASE}/api/products/${id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, alt: alt || null, isPrimary }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to add image"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
      setImageUrl(""); setImageAlt(""); setShowAddImage(false); setImageError("");
    },
    onError: (e: any) => setImageError(e.message ?? "Failed to add image."),
  });

  const setPrimaryImage = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(`${BASE}/api/products/${id}/images/${imageId}/primary`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed to set primary");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) }),
  });

  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(`${BASE}/api/products/${id}/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete image");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) }),
  });

  const openEdit = () => {
    if (!product) return;
    const p = product as any;
    setSaveError("");
    setEditForm({
      name: p.name ?? "",
      supplierId: p.supplierId ?? p.supplier?.id ?? "",
      categoryId: p.categoryId ?? p.category?.id ?? "",
      unitPrice: p.unitPrice ?? "",
      moq: String(p.moq ?? 1),
      leadTimeDays: String(p.leadTimeDays ?? 7),
      origin: p.origin ?? "",
      description: p.description ?? "",
      isActive: String(p.isActive ?? true),
    });
    setTiers(
      (p.bulkTiers ?? []).map((t: any) => ({
        min_qty: String(t.min_qty ?? ""),
        price_per_unit: String(t.price_per_unit ?? ""),
      }))
    );
    setShowEdit(true);
  };

  const addTier = () => setTiers(prev => [...prev, { min_qty: "", price_per_unit: "" }]);
  const removeTier = (i: number) => setTiers(prev => prev.filter((_, idx) => idx !== i));
  const updateTier = (i: number, field: keyof TierRow, value: string) =>
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const handleSave = () => {
    const validTiers = tiers
      .filter(t => t.min_qty && t.price_per_unit)
      .map(t => ({ min_qty: parseInt(t.min_qty, 10), price_per_unit: parseFloat(t.price_per_unit) }))
      .sort((a, b) => a.min_qty - b.min_qty);

    saveProduct.mutate({
      ...editForm,
      unitPrice: editForm.unitPrice,
      moq: parseInt(editForm.moq) || 1,
      leadTimeDays: parseInt(editForm.leadTimeDays) || 7,
      isActive: editForm.isActive !== "false",
      bulkTiers: validTiers,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-80 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="link" onClick={() => setLocation("/catalogue")}>Back to catalogue</Button>
        </div>
      </Layout>
    );
  }

  const p = product as any;
  const bulkTiers: { min_qty: number; price_per_unit: number }[] = p.bulkTiers ?? [];
  const occasionTags: string[] = p.occasionTags ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setLocation("/catalogue")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back">
            <ArrowLeft size={16} /> Back to Catalogue
          </button>
          <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5" data-testid="button-edit-product">
            <Pencil size={13} /> Edit Product
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-square bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100 rounded-2xl border border-card-border relative overflow-hidden flex items-center justify-center">
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt={p.images[0].alt ?? p.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={56} className="text-muted-foreground/20" />
              )}
              {p.isFeatured && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    <Star size={10} fill="currentColor" /> Featured
                  </span>
                </div>
              )}
            </div>

            {/* Image Gallery Management */}
            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Images</p>
                <button
                  onClick={() => { setShowAddImage(v => !v); setImageError(""); }}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  data-testid="button-add-image"
                >
                  <ImagePlus size={11} /> Add Image
                </button>
              </div>

              {showAddImage && (
                <div className="mb-3 p-3 bg-muted/40 rounded-lg space-y-2">
                  <Input
                    placeholder="Image URL (https://…)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="input-image-url"
                  />
                  <Input
                    placeholder="Alt text (optional)"
                    value={imageAlt}
                    onChange={e => setImageAlt(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="input-image-alt"
                  />
                  {imageError && <p className="text-xs text-red-600">{imageError}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={!imageUrl.trim() || addImage.isPending}
                      onClick={() => {
                        if (!imageUrl.trim()) return;
                        const isFirst = (p.images ?? []).length === 0;
                        addImage.mutate({ url: imageUrl.trim(), alt: imageAlt.trim(), isPrimary: isFirst });
                      }}
                      data-testid="button-save-image"
                    >
                      {addImage.isPending ? "Adding…" : "Add Image"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddImage(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {(p.images ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic">No images added yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(p.images ?? []).map((img: any) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted/30">
                      <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
                      {img.isPrimary && (
                        <div className="absolute top-1 left-1">
                          <CheckCircle2 size={14} className="text-primary drop-shadow" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                        {!img.isPrimary && (
                          <button
                            onClick={() => setPrimaryImage.mutate(img.id)}
                            className="text-[10px] font-semibold text-white bg-primary/90 rounded px-1.5 py-0.5 hover:bg-primary w-full text-center"
                            data-testid={`button-set-primary-${img.id}`}
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => deleteImage.mutate(img.id)}
                          className="text-[10px] font-semibold text-white bg-red-600/80 rounded px-1.5 py-0.5 hover:bg-red-600 w-full text-center"
                          data-testid={`button-delete-image-${img.id}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Occasion Tags */}
            {occasionTags.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ideal For</p>
                <div className="flex flex-wrap gap-2">
                  {occasionTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/8 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                      <Gift size={10} />
                      {OCCASION_LABELS[tag] ?? tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              {p.category && (
                <Badge variant="secondary" className="mb-2 text-xs">{p.category.name}</Badge>
              )}
              <h1 className="text-2xl font-serif font-semibold text-foreground leading-tight" data-testid="text-product-name">{p.name}</h1>
              {p.supplier && (
                <button
                  onClick={() => setLocation(`/suppliers/${p.supplier.id}`)}
                  className="text-sm text-muted-foreground mt-1 hover:text-primary transition-colors"
                  data-testid="link-supplier"
                >
                  by <span className="font-medium underline-offset-2 hover:underline">{p.supplier.name}</span>
                </button>
              )}
            </div>

            {p.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            )}

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <Tag size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="text-sm font-bold text-foreground" data-testid="text-unit-price">{formatKES(p.unitPrice)}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <ShoppingCart size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Min. Order</p>
                  <p className="text-sm font-bold text-foreground">{p.moq} units</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <Clock size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm font-bold text-foreground">{p.leadTimeDays} days</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <MapPin size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Origin</p>
                  <p className="text-sm font-bold text-foreground">{p.origin}</p>
                </div>
              </div>
            </div>

            {/* Bulk Pricing Tiers */}
            {bulkTiers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground">Bulk Pricing</p>
                  <button onClick={openEdit} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Pencil size={10} /> Edit tiers
                  </button>
                </div>
                <div className="border border-card-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Quantity</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Price / Unit</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-muted/10">
                        <td className="px-4 py-2.5 text-muted-foreground">1–{bulkTiers[0].min_qty - 1} units</td>
                        <td className="px-4 py-2.5 text-right font-medium text-foreground">{formatKES(p.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">—</td>
                      </tr>
                      {bulkTiers.map((tier, i) => {
                        const savings = Math.round((1 - tier.price_per_unit / parseFloat(p.unitPrice)) * 100);
                        return (
                          <tr key={i} className="hover:bg-muted/20" data-testid={`tier-row-${i}`}>
                            <td className="px-4 py-2.5 text-foreground">{tier.min_qty}+ units</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-primary">{formatKES(tier.price_per_unit)}</td>
                            <td className="px-4 py-2.5 text-right text-xs font-medium text-green-700">Save {savings}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Tags */}
            {p.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t: string) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                size="lg"
                className="w-full gap-2 text-sm"
                onClick={() => setLocation(`/hamper-builder?add=${p.id}&name=${encodeURIComponent(p.name)}`)}
                data-testid="button-add-to-hamper"
              >
                <Gift size={15} /> Add to Hamper Builder
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => setLocation("/quotes")}
                data-testid="button-request-quote"
              >
                <ShoppingCart size={15} /> Request a Quote
              </Button>
            </div>

            {/* Supplier Story */}
            {p.supplier?.story && (
              <div className="bg-gradient-to-br from-amber-50/80 to-stone-50 border border-amber-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf size={14} className="text-green-700" />
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Producer Story</p>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed line-clamp-4">{p.supplier.story}</p>
                <button
                  onClick={() => setLocation(`/suppliers/${p.supplier.id}`)}
                  className="text-xs font-semibold text-primary mt-3 hover:underline flex items-center gap-1"
                  data-testid="link-supplier-story"
                >
                  Read full supplier story →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">Edit Product</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Product Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Handwoven Sisal Basket" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Supplier</label>
                  <Select value={editForm.supplierId} onValueChange={v => setEditForm(f => ({ ...f, supplierId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>{supplierList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Category</label>
                  <Select value={editForm.categoryId} onValueChange={v => setEditForm(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categoryList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Unit Price (KES) *</label>
                  <Input type="number" min="0" step="0.01" value={editForm.unitPrice} onChange={e => setEditForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="1500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Min. Order (MOQ)</label>
                  <Input type="number" min="1" value={editForm.moq} onChange={e => setEditForm(f => ({ ...f, moq: e.target.value }))} placeholder="10" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Lead Time (days)</label>
                  <Input type="number" min="1" value={editForm.leadTimeDays} onChange={e => setEditForm(f => ({ ...f, leadTimeDays: e.target.value }))} placeholder="7" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Origin / County</label>
                <Input value={editForm.origin} onChange={e => setEditForm(f => ({ ...f, origin: e.target.value }))} placeholder="Murang'a, Kenya" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this product…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Bulk Pricing Tiers */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bulk Pricing Tiers</p>
                  <button
                    type="button"
                    onClick={addTier}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    data-testid="button-add-tier"
                  >
                    <Plus size={11} /> Add Tier
                  </button>
                </div>
                {tiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 italic">No volume discounts set. Click "Add Tier" to offer bulk pricing.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">Min. Qty</p>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">Price / Unit (KES)</p>
                      <span />
                    </div>
                    {tiers.map((tier, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center" data-testid={`tier-row-edit-${i}`}>
                        <Input
                          type="number"
                          min="1"
                          value={tier.min_qty}
                          onChange={e => updateTier(i, "min_qty", e.target.value)}
                          placeholder="50"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price_per_unit}
                          onChange={e => updateTier(i, "price_per_unit", e.target.value)}
                          placeholder="1200"
                          className="h-8 text-sm"
                        />
                        <button
                          onClick={() => removeTier(i)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded"
                          data-testid={`button-remove-tier-${i}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {tiers.length > 0 && editForm.unitPrice && (
                      <p className="text-[11px] text-muted-foreground/70 pt-1">
                        Tiers are sorted by min. qty on save. Prices should be below the unit price of {formatKES(editForm.unitPrice)}.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Active status toggle */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Product Status</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Inactive products are hidden from the catalogue</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(f => ({ ...f, isActive: f.isActive === "false" ? "true" : "false" }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${editForm.isActive === "false" ? "bg-muted-foreground/30" : "bg-primary"}`}
                  data-testid="toggle-is-active"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${editForm.isActive === "false" ? "translate-x-0.5" : "translate-x-4"}`} />
                </button>
              </div>

              {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button
                disabled={!editForm.name.trim() || !editForm.unitPrice || saveProduct.isPending}
                onClick={handleSave}
              >
                {saveProduct.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
