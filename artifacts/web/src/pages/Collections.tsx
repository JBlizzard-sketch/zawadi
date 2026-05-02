import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, ArrowRight, Plus, X } from "lucide-react";
import { useListCollections, getListCollectionsQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const OCCASIONS = [
  { value: "client_gifts", label: "Client Gifts" },
  { value: "staff_appreciation", label: "Staff Appreciation" },
  { value: "event_giveaways", label: "Event Giveaways" },
  { value: "festive_hampers", label: "Festive Hampers" },
  { value: "onboarding_kits", label: "Onboarding Kits" },
  { value: "custom", label: "Custom" },
];

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

const OCCASION_COLORS: Record<string, string> = {
  client_gifts: "bg-blue-100 text-blue-800",
  staff_appreciation: "bg-green-100 text-green-800",
  event_giveaways: "bg-amber-100 text-amber-800",
  festive_hampers: "bg-red-100 text-red-800",
  onboarding_kits: "bg-violet-100 text-violet-800",
  custom: "bg-muted text-muted-foreground",
};

const BG_GRADIENTS = [
  "from-amber-50 to-orange-100",
  "from-green-50 to-emerald-100",
  "from-stone-100 to-amber-50",
  "from-red-50 to-orange-50",
  "from-violet-50 to-purple-100",
];

const EMPTY = { name: "", occasion: "client_gifts", description: "", coverImageUrl: "", isFeatured: false };

export default function Collections() {
  const queryClient = useQueryClient();
  const { data: collections, isLoading } = useListCollections({}, { query: { queryKey: getListCollectionsQueryKey({}) } });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openModal = () => { setForm({ ...EMPTY }); setError(""); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.occasion) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          occasion: form.occasion,
          description: form.description.trim() || undefined,
          coverImageUrl: form.coverImageUrl.trim() || undefined,
          isFeatured: form.isFeatured,
          minPrice: "0",
          maxPrice: "0",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await queryClient.invalidateQueries({ queryKey: getListCollectionsQueryKey({}) });
      closeModal();
    } catch (e: any) {
      setError(e.message ?? "Failed to create collection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Gift Collections</h1>
            <p className="text-sm text-muted-foreground mt-1">Curated sets for every corporate occasion</p>
          </div>
          <Button size="sm" onClick={openModal} className="gap-1.5" data-testid="button-new-collection">
            <Plus size={14} /> New Collection
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-card-border">
                <Skeleton className="h-48 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (collections as any[])?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Create your first curated gift set</p>
            <Button size="sm" onClick={openModal} className="gap-1.5">
              <Plus size={14} /> New Collection
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(collections as any[])?.map((col: any, i: number) => (
              <Link key={col.id} href={`/collections/${col.id}`} className="group block bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-collection-${col.id}`}>
                  {/* Cover */}
                  <div className={`h-44 relative overflow-hidden ${col.coverImageUrl ? "" : `bg-gradient-to-br ${BG_GRADIENTS[i % BG_GRADIENTS.length]}`}`}>
                    {col.coverImageUrl ? (
                      <img
                        src={col.coverImageUrl}
                        alt={col.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <BookOpen size={36} className="text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {col.isFeatured && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full">Featured</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${OCCASION_COLORS[col.occasion] ?? "bg-muted text-muted-foreground"}`}>
                        {OCCASION_LABELS[col.occasion] ?? col.occasion}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-base font-serif font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{col.name}</h3>
                    {col.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{col.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{col.productCount ?? 0} products</p>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          {formatKES(col.minPrice)} {col.maxPrice ? `— ${formatKES(col.maxPrice)}` : "+"}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Collection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">New Gift Collection</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Collection Name *</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Executive Highlands Set"
                  data-testid="input-collection-name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Occasion *</label>
                <Select value={form.occasion} onValueChange={v => setForm(f => ({ ...f, occasion: v }))}>
                  <SelectTrigger data-testid="select-occasion"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OCCASIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="A thoughtfully curated selection of premium Kenyan-made products…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  data-testid="input-collection-description"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cover Image URL</label>
                <Input
                  value={form.coverImageUrl}
                  onChange={e => setForm(f => ({ ...f, coverImageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/…"
                  data-testid="input-collection-cover"
                />
                <p className="text-[11px] text-muted-foreground/70 mt-1">Paste a direct image URL (Unsplash, etc.). Leave blank for a gradient placeholder.</p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isFeatured}
                    onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${form.isFeatured ? "bg-primary" : "bg-muted-foreground/30"}`}
                    data-testid="toggle-featured"
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.isFeatured ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-foreground">Mark as Featured</span>
                  <span className="text-xs text-muted-foreground">(shown prominently on dashboard)</span>
                </label>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
                data-testid="button-confirm-collection"
              >
                {submitting ? "Creating…" : "Create Collection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
