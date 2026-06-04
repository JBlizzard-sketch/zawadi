import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layers, Search, CheckCircle2, MapPin, Plus, X, Clock, Eye, CheckCheck, XCircle, Package, Download } from "lucide-react";
import { useListSuppliers, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

const COUNTIES = ["Nairobi", "Kajiado", "Murang'a", "Kirinyaga", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos", "Nyeri", "Meru", "Embu", "Laikipia"];
const ONBOARDING_STATUSES = ["pending", "in_review", "approved", "rejected"];
const ONBOARDING_LABELS: Record<string, string> = { pending: "Pending", in_review: "In Review", approved: "Approved", rejected: "Rejected" };
const ONBOARDING_COLORS: Record<string, string> = {
  pending: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200",
  in_review: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  rejected: "bg-red-100 text-red-600 border-red-200 hover:bg-red-200",
};
const ONBOARDING_ACTIVE: Record<string, string> = {
  pending: "bg-stone-600 text-white border-stone-600",
  in_review: "bg-blue-600 text-white border-blue-600",
  approved: "bg-green-700 text-white border-green-700",
  rejected: "bg-red-600 text-white border-red-600",
};
const ONBOARDING_ICONS: Record<string, React.ElementType> = {
  pending: Clock, in_review: Eye, approved: CheckCheck, rejected: XCircle,
};

function exportCSV(rows: any[]) {
  const headers = ["Name", "County", "Email", "Phone", "Onboarding Status", "Verified", "Products", "Tags"];
  const lines = rows.map((s: any) => [
    s.name, s.county ?? "", s.email ?? "", s.phone ?? "",
    s.onboardingStatus ?? "", s.isVerified ? "Yes" : "No",
    String(s.product_count ?? 0), (s.tags ?? []).join("; "),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`));
  const csv = [headers.map((h) => `"${h}"`).join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zawadi-suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EMPTY = { name: "", contactName: "", email: "", phone: "", county: "Nairobi", description: "", onboardingStatus: "pending" };

export default function Suppliers() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [onboardingStatus, setOnboardingStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 24;

  const { data: pipeline } = useQuery<Record<string, number>>({
    queryKey: ["suppliers-pipeline"],
    queryFn: () => fetch(`${BASE}/api/suppliers/pipeline`).then(r => r.json()),
    staleTime: 30_000,
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const params = { search: search || undefined, county: county || undefined, onboarding_status: onboardingStatus || undefined, limit: LIMIT, offset } as any;
  const { data: suppliers, isLoading } = useListSuppliers(params, { query: { queryKey: getListSuppliersQueryKey(params) } });
  const supplierList = (suppliers as any)?.items ?? [];
  const total: number = (suppliers as any)?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openModal = () => { setForm({ ...EMPTY }); setError(""); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Supplier name is required."); return; }
    if (!form.county) { setError("County is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          county: form.county,
          description: form.description || undefined,
          onboardingStatus: form.onboardingStatus,
          isVerified: false,
          tags: [],
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create"); }
      const supplier = await res.json();
      await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
      setShowModal(false);
      setLocation(`/suppliers/${supplier.id}`);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Supplier Directory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading…" : `${total} supplier${total !== 1 ? "s" : ""} · Kenya's finest artisan producers`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportCSV(supplierList)} data-testid="button-export-csv">
              <Download size={13} /> Export CSV
            </Button>
            <Button size="sm" onClick={openModal} className="gap-1.5" data-testid="button-new-supplier">
              <Plus size={14} /> New Supplier
            </Button>
          </div>
        </div>

        {/* Onboarding Pipeline Summary */}
        {pipeline && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {ONBOARDING_STATUSES.map((s) => {
              const Icon = ONBOARDING_ICONS[s];
              const count = pipeline[s] ?? 0;
              const active = onboardingStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => { setOnboardingStatus(active ? "" : s); setOffset(0); }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all ${active ? ONBOARDING_ACTIVE[s] : ONBOARDING_COLORS[s]}`}
                  data-testid={`pipeline-${s}`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{count}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide mt-0.5 opacity-80">{ONBOARDING_LABELS[s]}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCounty("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!county ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
              data-testid="filter-all-counties"
            >
              All Counties
            </button>
            {COUNTIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCounty(county === c ? "" : c); setOffset(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${county === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                data-testid={`filter-county-${c.toLowerCase()}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-card-border">
                <Skeleton className="h-40 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : supplierList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No suppliers found</p>
            <button onClick={openModal} className="mt-3 text-sm text-primary hover:underline">Onboard the first supplier →</button>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {supplierList.map((supplier: any) => (
              <Link key={supplier.id} href={`/suppliers/${supplier.id}`} className="group block bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-supplier-${supplier.id}`}>
                  <div className="h-36 bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center relative overflow-hidden">
                    {supplier.coverImageUrl ? (
                      <img src={supplier.coverImageUrl} alt={supplier.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Layers size={32} className="text-muted-foreground/20" />
                    )}
                    {supplier.isVerified && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-200 shadow-sm">
                          <CheckCircle2 size={9} /> Verified
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-serif font-semibold text-foreground group-hover:text-primary transition-colors">{supplier.name}</h3>
                    <div className="flex items-center gap-1 mt-1 mb-2">
                      <MapPin size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{supplier.county}</span>
                    </div>
                    {supplier.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{supplier.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      {supplier.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {supplier.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-[10px] py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      {supplier.product_count > 0 && (
                        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground/70 bg-muted/50 rounded-full px-2 py-0.5 flex-shrink-0">
                          <Package size={10} />
                          {supplier.product_count} product{supplier.product_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
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
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" data-testid="modal-new-supplier">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold text-foreground">Onboard New Supplier</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Business Name <span className="text-primary">*</span></label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Savannah Honey Co." className="h-9 text-sm" data-testid="input-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">County <span className="text-primary">*</span></label>
                  <Select value={form.county} onValueChange={(v) => set("county", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Onboarding Status</label>
                  <Select value={form.onboardingStatus} onValueChange={(v) => set("onboardingStatus", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ONBOARDING_STATUSES.map((s) => <SelectItem key={s} value={s}>{ONBOARDING_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Contact Name</label>
                <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Primary contact" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@supplier.co.ke" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Phone</label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 700 000 000" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Brief description of their products and story..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name || !form.county} data-testid="button-confirm-supplier">
                {submitting ? "Saving…" : "Add Supplier"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
