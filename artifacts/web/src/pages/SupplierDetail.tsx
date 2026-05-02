import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Mail, CheckCircle2, Package, Leaf, ExternalLink, Pencil, X, Users, Award, ShieldCheck, TreePine } from "lucide-react";
import { useGetSupplier, getGetSupplierQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/layout/Layout";

const COUNTIES = ["Nairobi", "Kajiado", "Murang'a", "Kirinyaga", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Nyeri", "Meru", "Embu", "Laikipia"];
const ONBOARDING_LABELS: Record<string, string> = { pending: "Pending", in_review: "In Review", approved: "Approved", rejected: "Rejected" };
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");

  const { data: supplier, isLoading } = useGetSupplier(id, { query: { enabled: !!id, queryKey: getGetSupplierQueryKey(id) } });

  const toggleVerified = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !s?.isVerified }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSupplierQueryKey(id) }),
  });

  const saveSupplier = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`${BASE}/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetSupplierQueryKey(id) });
      setShowEdit(false);
    },
    onError: (e: any) => setSaveError(e.message ?? "Something went wrong."),
  });

  const openEdit = () => {
    setSaveError("");
    setEditForm({
      name: s?.name ?? "",
      contactName: s?.contactName ?? "",
      email: s?.email ?? "",
      phone: s?.phone ?? "",
      county: s?.county ?? "Nairobi",
      description: s?.description ?? "",
      story: s?.story ?? "",
      onboardingStatus: s?.onboardingStatus ?? "pending",
      womenLed: s?.womenLed ? "true" : "false",
      artisanCount: s?.artisanCount != null ? String(s.artisanCount) : "",
      certifications: Array.isArray(s?.certifications) ? (s.certifications as string[]).join(", ") : "",
      esgNotes: s?.esgNotes ?? "",
    });
    setShowEdit(true);
  };

  const productParams = { supplier_id: id, limit: 6, offset: 0 };
  const { data: productsData, isLoading: productsLoading } = useListProducts(
    productParams,
    { query: { enabled: !!id, queryKey: getListProductsQueryKey(productParams) } }
  );

  const s = supplier as any;
  const products = (productsData as any)?.items ?? [];

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!s) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Supplier not found.</p>
          <button onClick={() => setLocation("/suppliers")} className="text-sm text-primary hover:underline mt-2 block mx-auto">Back to suppliers</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => setLocation("/suppliers")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Suppliers
        </button>

        {/* Hero */}
        <div className="rounded-2xl mb-6 border border-card-border relative overflow-hidden">
          {s.coverImageUrl && (
            <div className="h-48 relative overflow-hidden">
              <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          )}
          <div className={`bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 p-8 ${s.coverImageUrl ? "-mt-16 relative z-10 bg-transparent" : ""}`}>
          <div className={s.coverImageUrl ? "" : "absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_80%,hsl(16,58%,46%),transparent_60%)]"} />
          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-foreground" data-testid="text-supplier-name">{s.name}</h1>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{s.county}, Kenya</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {s.isVerified ? (
                  <button
                    onClick={() => toggleVerified.mutate()}
                    disabled={toggleVerified.isPending}
                    className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-200 transition-colors disabled:opacity-60"
                    data-testid="badge-verified"
                  >
                    <CheckCircle2 size={12} /> Verified Supplier
                  </button>
                ) : (
                  <button
                    onClick={() => toggleVerified.mutate()}
                    disabled={toggleVerified.isPending}
                    className="inline-flex items-center gap-1.5 bg-white/70 text-muted-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-white transition-colors disabled:opacity-60"
                    data-testid="button-verify-supplier"
                  >
                    <CheckCircle2 size={12} /> Mark as Verified
                  </button>
                )}
                <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5 bg-white/70 hover:bg-white" data-testid="button-edit-supplier">
                  <Pencil size={13} /> Edit
                </Button>
              </div>
            </div>
            {s.description && <p className="text-sm text-stone-700 leading-relaxed max-w-2xl">{s.description}</p>}
            {s.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {s.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Story */}
          {s.story && (
            <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Leaf size={12} className="text-green-700" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Producer Story</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{s.story}</p>
            </div>
          )}

          {/* Contact + Status */}
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Contact</p>
              <div className="space-y-3">
                {s.contactName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Person</p>
                    <p className="text-sm font-medium text-foreground">{s.contactName}</p>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${s.email}`} className="text-sm text-primary hover:underline truncate">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-foreground">{s.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Partnership</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Onboarding Status</p>
                  <p className="text-sm font-medium capitalize text-foreground">{s.onboardingStatus?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="text-sm font-medium text-foreground">{new Date(s.createdAt).getFullYear()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ESG / Impact Section */}
        {(s.womenLed || s.artisanCount || (s.certifications?.length > 0) || s.esgNotes) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TreePine size={16} className="text-green-700" />
              <h2 className="text-base font-serif font-semibold text-foreground">Impact & ESG Profile</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {s.womenLed && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col items-center text-center gap-2" data-testid="badge-women-led">
                  <Users size={20} className="text-rose-600" />
                  <p className="text-xs font-semibold text-rose-800">Women-Led</p>
                  <p className="text-[11px] text-rose-600 leading-tight">Female-founded or majority female-led enterprise</p>
                </div>
              )}
              {s.artisanCount && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col items-center text-center gap-2" data-testid="stat-artisan-count">
                  <span className="text-2xl font-bold text-amber-700">{s.artisanCount}</span>
                  <p className="text-xs font-semibold text-amber-800">Artisans Employed</p>
                  <p className="text-[11px] text-amber-600 leading-tight">Direct livelihoods supported</p>
                </div>
              )}
              {s.certifications?.map((cert: string) => (
                <div key={cert} className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                  <Award size={20} className="text-green-700" />
                  <p className="text-xs font-semibold text-green-800">{cert}</p>
                  <ShieldCheck size={13} className="text-green-600" />
                </div>
              ))}
            </div>
            {s.esgNotes && (
              <div className="bg-green-50/60 border border-green-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Leaf size={12} /> ESG Notes
                </p>
                <p className="text-sm text-stone-700 leading-relaxed">{s.esgNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Products by this Supplier */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-serif font-semibold text-foreground">Products from {s.name}</h2>
            <Link href="/catalogue" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View all <ExternalLink size={11} />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-card-border">
                  <Skeleton className="h-36 w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-card border border-card-border rounded-xl text-center">
              <Package size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No products listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/catalogue/${product.id}`}
                  className="group block bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center relative overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package size={28} className="text-muted-foreground/20" />
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shadow-sm">Featured</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{product.origin}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatKES(product.unitPrice)}</span>
                      <span className="text-[11px] text-muted-foreground">MOQ {product.moq}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Supplier Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">Edit Supplier</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Business Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Kijani Crafts Ltd" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">County</label>
                  <Select value={editForm.county} onValueChange={v => setEditForm(f => ({ ...f, county: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Onboarding Status</label>
                  <Select value={editForm.onboardingStatus} onValueChange={v => setEditForm(f => ({ ...f, onboardingStatus: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ONBOARDING_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Contact Person</label>
                <Input value={editForm.contactName} onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Mary Njeri" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="hello@kijani.co.ke" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone</label>
                  <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 700 000 000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Short Description</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Artisan cooperative producing handwoven…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Producer Story</label>
                <textarea
                  rows={4}
                  value={editForm.story}
                  onChange={e => setEditForm(f => ({ ...f, story: e.target.value }))}
                  placeholder="Tell the story behind this supplier…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* ESG / Impact */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Leaf size={11} /> Impact & ESG
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editForm.womenLed === "true"}
                      onClick={() => setEditForm(f => ({ ...f, womenLed: f.womenLed === "true" ? "false" : "true" }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${editForm.womenLed === "true" ? "bg-rose-500" : "bg-muted-foreground/30"}`}
                      data-testid="toggle-women-led"
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${editForm.womenLed === "true" ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm text-foreground">Women-Led Enterprise</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Artisans / Employees Supported</label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.artisanCount}
                      onChange={e => setEditForm(f => ({ ...f, artisanCount: e.target.value }))}
                      placeholder="e.g. 42"
                      data-testid="input-artisan-count"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Certifications <span className="font-normal text-muted-foreground/70">(comma-separated)</span></label>
                    <Input
                      value={editForm.certifications}
                      onChange={e => setEditForm(f => ({ ...f, certifications: e.target.value }))}
                      placeholder="UTZ Certified, Rainforest Alliance, KEBS"
                      data-testid="input-certifications"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">ESG Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.esgNotes}
                      onChange={e => setEditForm(f => ({ ...f, esgNotes: e.target.value }))}
                      placeholder="Describe environmental and social impact…"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      data-testid="textarea-esg-notes"
                    />
                  </div>
                </div>
              </div>
              {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button
                disabled={!editForm.name.trim() || saveSupplier.isPending}
                onClick={() => {
                  const { womenLed, artisanCount, certifications, esgNotes, ...rest } = editForm;
                  saveSupplier.mutate({
                    ...rest,
                    womenLed: womenLed === "true",
                    artisanCount: artisanCount ? parseInt(artisanCount, 10) : null,
                    certifications: certifications
                      ? certifications.split(",").map((c: string) => c.trim()).filter(Boolean)
                      : [],
                    esgNotes: esgNotes || null,
                  });
                }}
              >
                {saveSupplier.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
