import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, Search, ChevronRight } from "lucide-react";
import { useListCorporates, getListCorporatesQueryKey } from "@workspace/api-client-react";
import { formatKES, TIER_COLORS } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const TIERS = ["standard", "premium", "enterprise"];
const TIER_LABELS: Record<string, string> = { standard: "Standard", premium: "Premium", enterprise: "Enterprise" };

export default function Corporates() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");

  const params = { search: search || undefined, tier: tier || undefined };
  const { data: corporates, isLoading } = useListCorporates(params, { query: { queryKey: getListCorporatesQueryKey(params) } });
  const corpList = (corporates as any[]) ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Corporate Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{corpList.length} active client{corpList.length !== 1 ? "s" : ""}</p>
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
    </Layout>
  );
}
