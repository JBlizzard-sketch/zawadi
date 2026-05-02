import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, Search, ChevronRight, Plus, X } from "lucide-react";
import { useListCorporates, getListCorporatesQueryKey } from "@workspace/api-client-react";
import { formatKES, TIER_COLORS } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

const TIERS = ["standard", "premium", "enterprise"];
const TIER_LABELS: Record<string, string> = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };
const INDUSTRIES = ["Banking & Finance", "Technology", "Legal & Professional", "Consulting", "NGO & Development", "Healthcare", "FMCG & Retail", "Real Estate", "Education", "Media & PR", "Logistics", "Other"];
const PAYMENT_TERMS = ["net_7", "net_14", "net_30", "net_60"];
const PAYMENT_TERM_LABELS: Record<string, string> = { net_7: "Net 7", net_14: "Net 14", net_30: "Net 30", net_60: "Net 60" };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EMPTY = { name: "", email: "", phone: "", industry: "", tier: "standard", kraPin: "", city: "", paymentTerms: "net_30", accountManagerName: "" };

export default function Corporates() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const params = { search: search || undefined, tier: tier || undefined };
  const { data: corporates, isLoading } = useListCorporates(params, { query: { queryKey: getListCorporatesQueryKey(params) } });
  const corpList = (corporates as any[]) ?? [];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openModal = () => { setForm({ ...EMPTY }); setError(""); setShowModal(true); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Company name is required."); return; }
    if (!form.email.trim()) { setError("Email address is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/corporates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone || undefined,
          industry: form.industry || undefined,
          tier: form.tier,
          kraPin: form.kraPin || undefined,
          city: form.city || undefined,
          paymentTerms: form.paymentTerms || undefined,
          accountManagerName: form.accountManagerName || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create"); }
      const corp = await res.json();
      await queryClient.invalidateQueries({ queryKey: getListCorporatesQueryKey() });
      setShowModal(false);
      setLocation(`/corporates/${corp.id}`);
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
            <h1 className="text-2xl font-serif font-semibold text-foreground">Corporate Accounts</h1>
            <p className="text-sm text-muted-foreground mt-1">{corpList.length} active client{corpList.length !== 1 ? "s" : ""}</p>
          </div>
          <Button size="sm" onClick={openModal} className="gap-1.5" data-testid="button-new-corporate">
            <Plus size={14} /> New Client
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={tier} onValueChange={(v) => setTier(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-tier">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Industry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Orders</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Spend</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-5 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-10" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td></td>
                  </tr>
                ))
              ) : corpList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Building2 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No corporate accounts found</p>
                    <button onClick={openModal} className="mt-3 text-sm text-primary hover:underline">Add the first client →</button>
                  </td>
                </tr>
              ) : (
                corpList.map((corp: any) => (
                  <tr
                    key={corp.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/corporates/${corp.id}`)}
                    data-testid={`row-corporate-${corp.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground">{corp.name}</p>
                      <p className="text-xs text-muted-foreground">{corp.email}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{corp.industry ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[corp.tier] ?? ""}`}>
                        {TIER_LABELS[corp.tier] ?? corp.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground hidden lg:table-cell">{corp.totalOrders}</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(corp.totalSpend)}</td>
                    <td className="px-5 py-3"><ChevronRight size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm" data-testid="modal-new-corporate">
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold text-foreground">New Corporate Client</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Company Name <span className="text-primary">*</span></label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Safaricom PLC" className="h-9 text-sm" data-testid="input-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Email <span className="text-primary">*</span></label>
                    <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="billing@company.co.ke" className="h-9 text-sm" data-testid="input-email" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Phone</label>
                    <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 700 000 000" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Industry</label>
                    <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Tier</label>
                    <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">KRA PIN</label>
                    <Input value={form.kraPin} onChange={(e) => set("kraPin", e.target.value)} placeholder="P051234567M" className="h-9 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">City</label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Nairobi" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Payment Terms</label>
                    <Select value={form.paymentTerms} onValueChange={(v) => set("paymentTerms", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((pt) => <SelectItem key={pt} value={pt}>{PAYMENT_TERM_LABELS[pt]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Account Manager</label>
                    <Input value={form.accountManagerName} onChange={(e) => set("accountManagerName", e.target.value)} placeholder="Full name" className="h-9 text-sm" />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !form.name || !form.email} data-testid="button-confirm-corporate">
                {submitting ? "Creating…" : "Create Client"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
