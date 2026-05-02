import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Building2, Mail, Phone, FileText, ShoppingCart, Receipt, ChevronRight, Pencil, X, Users2, Plus, Trash2, Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetCorporate, getGetCorporateQueryKey,
  useGetCorporateDashboard, getGetCorporateDashboardQueryKey,
  useListQuotes, getListQuotesQueryKey,
  useListInvoices, getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { formatKES, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, QUOTE_STATUS_COLORS, INVOICE_STATUS_COLORS, TIER_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

const TIERS = ["standard", "premium", "enterprise"];
const TIER_LABELS: Record<string, string> = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };
const PAYMENT_LABELS: Record<string, string> = { prepaid: "Prepaid", net_15: "Net 15", net_30: "Net 30", net_60: "Net 60" };
const INDUSTRIES = ["Banking & Finance", "Technology", "Legal & Professional", "Consulting", "NGO & Development", "Healthcare", "FMCG & Retail", "Real Estate", "Education", "Media & PR", "Logistics", "Telecommunications", "Other"];
const PAYMENT_TERMS = ["net_7", "net_14", "net_30", "net_60"];
const PAYMENT_TERM_LABELS: Record<string, string> = { net_7: "Net 7", net_14: "Net 14", net_30: "Net 30", net_60: "Net 60" };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CorporateDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");

  // Contacts state
  const CONTACTS_KEY = ["contacts", id];
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "", isPrimary: false, notes: "" });
  const [contactError, setContactError] = useState("");

  const { data: corporate, isLoading: corpLoading } = useGetCorporate(id, { query: { enabled: !!id, queryKey: getGetCorporateQueryKey(id) } });
  const { data: dashboard, isLoading: dashLoading } = useGetCorporateDashboard(id, { query: { enabled: !!id, queryKey: getGetCorporateDashboardQueryKey(id) } });
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: CONTACTS_KEY,
    queryFn: () => fetch(`${BASE}/api/corporates/${id}/contacts`).then(r => r.json()),
    enabled: !!id,
  });

  const c = corporate as any;
  const d = dashboard as any;

  const MONTH_LABELS: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  const saveCorporate = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await fetch(`${BASE}/api/corporates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to save"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetCorporateQueryKey(id) });
      setShowEdit(false);
    },
    onError: (e: any) => setSaveError(e.message ?? "Something went wrong."),
  });

  const openAddContact = () => {
    setEditingContact(null);
    setContactForm({ name: "", title: "", email: "", phone: "", isPrimary: false, notes: "" });
    setContactError("");
    setShowContactModal(true);
  };
  const openEditContact = (ct: any) => {
    setEditingContact(ct);
    setContactForm({ name: ct.name, title: ct.title ?? "", email: ct.email ?? "", phone: ct.phone ?? "", isPrimary: ct.isPrimary, notes: ct.notes ?? "" });
    setContactError("");
    setShowContactModal(true);
  };

  const saveContact = useMutation({
    mutationFn: async (body: typeof contactForm) => {
      const url = editingContact
        ? `${BASE}/api/corporates/${id}/contacts/${editingContact.id}`
        : `${BASE}/api/corporates/${id}/contacts`;
      const res = await fetch(url, {
        method: editingContact ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CONTACTS_KEY }); setShowContactModal(false); },
    onError: (e: any) => setContactError(e.message ?? "Something went wrong."),
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await fetch(`${BASE}/api/corporates/${id}/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTACTS_KEY }),
  });

  const openEdit = () => {
    setSaveError("");
    setEditForm({
      name: c?.name ?? "",
      email: c?.email ?? "",
      phone: c?.phone ?? "",
      industry: c?.industry ?? "",
      tier: c?.tier ?? "standard",
      kraPin: c?.kraPin ?? "",
      city: c?.city ?? "",
      paymentTerms: c?.paymentTerms ?? "net_30",
      accountManagerName: c?.accountManagerName ?? "",
    });
    setShowEdit(true);
  };

  const quoteParams = { corporate_id: id };
  const invoiceParams = { corporate_id: id };
  const { data: quotesData, isLoading: quotesLoading } = useListQuotes(quoteParams, { query: { enabled: !!id, queryKey: getListQuotesQueryKey(quoteParams) } });
  const { data: invoicesData, isLoading: invoicesLoading } = useListInvoices(invoiceParams, { query: { enabled: !!id, queryKey: getListInvoicesQueryKey(invoiceParams) } });
  const quoteList = (quotesData as any[]) ?? [];
  const invoiceList = (invoicesData as any[]) ?? [];

  const spendData = (d?.spend_by_month ?? []).map((r: { month: string; spend: number }) => ({
    month: MONTH_LABELS[r.month?.split("-")[1]] ?? r.month,
    spend: r.spend,
  }));

  if (corpLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!c) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Corporate account not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/corporates")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Corporates
        </button>

        {/* Header */}
        <div className="bg-card border border-card-border rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 size={22} className="text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-semibold text-foreground" data-testid="text-corporate-name">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.industry ?? "—"}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${TIER_COLORS[c.tier] ?? ""}`}>{TIER_LABELS[c.tier] ?? c.tier}</span>
                  {c.paymentTerms && <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[c.paymentTerms] ?? c.paymentTerms}</span>}
                  {c.kraPin && <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">KRA: {c.kraPin}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={openEdit} className="gap-1.5" data-testid="button-edit-corporate">
                  <Pencil size={13} /> Edit
                </Button>
                <Link
                  href={`/quotes/new?corporateId=${c.id}&corporateName=${encodeURIComponent(c.name)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  data-testid="button-new-quote"
                >
                  <FileText size={13} /> New Quote
                </Link>
                <Link
                  href={`/hamper-builder`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors"
                  data-testid="button-hamper-builder"
                >
                  <ShoppingCart size={13} /> Hamper Builder
                </Link>
              </div>
              <div className="text-sm space-y-1 text-right">
                {c.email && (
                  <div className="flex items-center gap-2 justify-end">
                    <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>
                    <Mail size={13} className="text-muted-foreground" />
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-foreground">{c.phone}</span>
                    <Phone size={13} className="text-muted-foreground" />
                  </div>
                )}
                {c.accountManagerName && (
                  <p className="text-xs text-muted-foreground">AM: {c.accountManagerName}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {dashLoading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Orders", value: String(d?.total_orders ?? 0) },
              { label: "Active Orders", value: String(d?.active_orders ?? 0) },
              { label: "Total Spend", value: formatKES(d?.total_spend ?? 0) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-xl font-semibold text-foreground tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Spend Chart */}
          <div className="lg:col-span-3 bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Monthly Spend</p>
            {dashLoading ? (
              <Skeleton className="h-44" />
            ) : spendData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No spend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={spendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(16 58% 46%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(16 58% 46%)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 18% 86%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(25 12% 46%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatKES(v), "Spend"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(35 18% 86%)" }} />
                  <Area type="monotone" dataKey="spend" stroke="hsl(16 58% 46%)" strokeWidth={2} fill="url(#spendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Recent Orders</p>
              <Link href={`/orders`} className="text-xs text-primary hover:underline" data-testid="link-all-orders">View all</Link>
            </div>
            {dashLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (d?.recent_orders ?? []).length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No orders yet</div>
            ) : (
              <div className="divide-y divide-border">
                {(d?.recent_orders ?? []).map((order: any) => (
                  <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors" data-testid={`order-row-${order.id}`}>
                      <div>
                        <p className="text-xs font-medium text-foreground">{order.reference}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <StatusBadge label={ORDER_STATUS_LABELS[order.status] ?? order.status} colorClass={ORDER_STATUS_COLORS[order.status] ?? ""} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quotes Panel */}
        <div className="mt-6 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Quotes</p>
            </div>
            <Link href={`/quotes/new?corporateId=${c.id}&corporateName=${encodeURIComponent(c.name)}`} className="text-xs font-medium text-primary hover:underline" data-testid="link-new-quote-bottom">
              + New Quote
            </Link>
          </div>
          {quotesLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : quoteList.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No quotes yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Reference</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Issued</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Valid Until</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quoteList.map((q: any) => (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setLocation(`/quotes/${q.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{q.reference ?? `QT-${q.id.slice(0, 6)}`}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(q.createdAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{q.validUntil ? formatDate(q.validUntil) : "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={QUOTE_STATUS_LABELS[q.status] ?? q.status} colorClass={QUOTE_STATUS_COLORS[q.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{formatKES(q.total)}</td>
                    <td className="px-3 py-3 text-muted-foreground"><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Contacts Panel */}
        <div className="mt-6 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Contacts</p>
              {contacts.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{contacts.length}</span>
              )}
            </div>
            <button
              onClick={openAddContact}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              data-testid="button-add-contact"
            >
              <Plus size={12} /> Add Contact
            </button>
          </div>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-2">
              <Users2 size={28} className="text-muted-foreground/30" />
              <p>No contacts yet</p>
              <button onClick={openAddContact} className="text-xs text-primary hover:underline">+ Add first contact</button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map((ct: any) => (
                <div key={ct.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors group" data-testid={`contact-row-${ct.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{ct.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{ct.name}</p>
                        {ct.isPrimary && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            <Star size={8} className="fill-amber-500 text-amber-500" /> Primary
                          </span>
                        )}
                      </div>
                      {ct.title && <p className="text-xs text-muted-foreground">{ct.title}</p>}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ct.email && (
                          <a href={`mailto:${ct.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Mail size={10} /> {ct.email}
                          </a>
                        )}
                        {ct.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone size={10} /> {ct.phone}
                          </span>
                        )}
                      </div>
                      {ct.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{ct.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditContact(ct)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-edit-contact-${ct.id}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove ${ct.name}?`)) deleteContact.mutate(ct.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      data-testid={`button-delete-contact-${ct.id}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoices Panel */}
        <div className="mt-6 mb-2 bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Receipt size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Invoices</p>
          </div>
          {invoicesLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : invoiceList.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No invoices yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Invoice No.</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Issued</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Due</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoiceList.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{inv.invoiceNumber ?? inv.reference ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{formatDate(inv.createdAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">{formatKES(inv.totalAmount ?? inv.total)}</td>
                    <td className="px-3 py-3 text-muted-foreground"><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">{editingContact ? "Edit Contact" : "Add Contact"}</h2>
              <button onClick={() => setShowContactModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name *</label>
                <Input value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Mwangi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Title / Role</label>
                <Input value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} placeholder="Procurement Manager" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                  <Input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.co.ke" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone</label>
                  <Input value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 722 000 000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={contactForm.notes}
                  onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Prefers email, handles all gifting budgets over KES 50k"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))}
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Mark as primary contact</span>
              </label>
              {contactError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{contactError}</p>}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowContactModal(false)}>Cancel</Button>
              <Button
                disabled={!contactForm.name.trim() || saveContact.isPending}
                onClick={() => saveContact.mutate(contactForm)}
                data-testid="button-save-contact"
              >
                {saveContact.isPending ? "Saving…" : editingContact ? "Save Changes" : "Add Contact"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Corporate Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-card-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-base font-serif font-semibold text-foreground">Edit Client</h2>
              <button onClick={() => setShowEdit(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Company Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Acacia Holdings Ltd" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="info@acacia.co.ke" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Phone</label>
                  <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 700 000 000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Industry</label>
                  <Select value={editForm.industry} onValueChange={v => setEditForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tier</label>
                  <Select value={editForm.tier} onValueChange={v => setEditForm(f => ({ ...f, tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIERS.map(t => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">KRA PIN</label>
                  <Input value={editForm.kraPin} onChange={e => setEditForm(f => ({ ...f, kraPin: e.target.value }))} placeholder="P051234567A" className="font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">City</label>
                  <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Nairobi" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Terms</label>
                  <Select value={editForm.paymentTerms} onValueChange={v => setEditForm(f => ({ ...f, paymentTerms: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{PAYMENT_TERM_LABELS[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Account Manager</label>
                  <Input value={editForm.accountManagerName} onChange={e => setEditForm(f => ({ ...f, accountManagerName: e.target.value }))} placeholder="Jane Wambui" />
                </div>
              </div>
              {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button
                disabled={!editForm.name.trim() || saveCorporate.isPending}
                onClick={() => saveCorporate.mutate(editForm)}
              >
                {saveCorporate.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
