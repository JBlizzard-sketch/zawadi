import { useState } from "react";
import { useLocation } from "wouter";
import { FileText, ChevronRight } from "lucide-react";
import { useListQuotes, getListQuotesQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate, QUOTE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];
const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

export default function Quotes() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("");

  const params = { status: status || undefined };
  const { data: quotes, isLoading } = useListQuotes(params, { query: { queryKey: getListQuotesQueryKey(params) } });
  const quoteList = (quotes as any[]) ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Quotes</h1>
            <p className="text-sm text-muted-foreground mt-1">{quoteList.length} quote{quoteList.length !== 1 ? "s" : ""}</p>
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-9 text-sm" data-testid="select-quote-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {QUOTE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quote</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Valid Until</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td></td>
                  </tr>
                ))
              ) : quoteList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No quotes found</p>
                  </td>
                </tr>
              ) : (
                quoteList.map((quote: any) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/quotes/${quote.id}`)}
                    data-testid={`row-quote-${quote.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground text-xs">{quote.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{(quote.items as any[])?.length ?? 0} line item{(quote.items as any[])?.length !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(quote.createdAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(quote.validUntil)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={QUOTE_STATUS_LABELS[quote.status] ?? quote.status} colorClass={QUOTE_STATUS_COLORS[quote.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(quote.total)}</td>
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
