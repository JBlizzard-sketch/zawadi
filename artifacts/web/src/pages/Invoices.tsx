import { useState } from "react";
import { useLocation } from "wouter";
import { Receipt, ChevronRight, Download } from "lucide-react";
import { useListInvoices, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate, INVOICE_STATUS_COLORS } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"];
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

function exportCSV(rows: any[]) {
  if (!rows.length) return;
  const headers = ["Invoice No.", "Issued", "Due Date", "Client", "Status", "Total (KES)"];
  const lines = rows.map((inv) => [
    inv.invoiceNumber ?? "",
    inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-KE") : "",
    inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-KE") : "",
    inv.corporate_name ?? "",
    inv.status ?? "",
    String(parseFloat(inv.totalAmount ?? "0").toFixed(2)),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `zawadi-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function Invoices() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") ?? "");

  const params = { status: status || undefined };
  const { data: invoices, isLoading } = useListInvoices(params, { query: { queryKey: getListInvoicesQueryKey(params) } });
  const invoiceList = (invoices as any[]) ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">KRA-compliant VAT invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(invoiceList)}
              disabled={invoiceList.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-export-csv"
            >
              <Download size={13} /> Export CSV
            </button>
          <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-9 text-sm" data-testid="select-invoice-status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INVOICE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Issued</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Due Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td></td>
                  </tr>
                ))
              ) : invoiceList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Receipt size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No invoices found</p>
                  </td>
                </tr>
              ) : (
                invoiceList.map((inv: any) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/invoices/${inv.id}`)}
                    data-testid={`row-invoice-${inv.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-foreground font-mono text-sm">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.corporate_name ?? (inv.kraPin ? `KRA: ${inv.kraPin}` : "—")}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(inv.createdAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatDate(inv.dueDate)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] ?? ""} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatKES(inv.totalAmount)}</td>
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
