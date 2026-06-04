import { useState } from "react";
import { useLocation } from "wouter";
import { Gift, ChevronRight, Trash2, Package, Edit2, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatKES, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Hampers() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: hampers, isLoading } = useQuery<any[]>({
    queryKey: ["hampers"],
    queryFn: () => fetch(`${BASE}/api/hampers`).then((r) => r.json()),
  });

  const deleteHamper = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/hampers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hampers"] });
      setConfirmDelete(null);
    },
  });

  const hamperList = hampers ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Saved Hampers</h1>
            <p className="text-sm text-muted-foreground mt-1">Hamper templates you can reopen and edit in the builder</p>
          </div>
          <Button size="sm" onClick={() => setLocation("/hamper-builder")} className="gap-1.5" data-testid="button-new-hamper">
            <Gift size={14} /> New Hamper
          </Button>
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : hamperList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 bg-primary/8 rounded-2xl flex items-center justify-center mb-4">
                <Gift size={28} className="text-primary/50" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No saved hampers yet</p>
              <p className="text-xs text-muted-foreground mb-5">Build and save a hamper template from the Hamper Builder</p>
              <Button size="sm" onClick={() => setLocation("/hamper-builder")} className="gap-1.5">
                <Gift size={13} /> Open Hamper Builder
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Saved</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value</th>
                  <th className="px-5 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hamperList.map((h: any) => (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-hamper-${h.id}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-stone-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package size={14} className="text-primary/60" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{h.name ?? "Untitled Hamper"}</p>
                          {h.corporateId && <p className="text-xs text-muted-foreground mt-0.5">Linked to corporate</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs hidden sm:table-cell">
                      {h.itemCount ?? 0} item{(h.itemCount ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs hidden md:table-cell">
                      {formatDate(h.updatedAt ?? h.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground tabular-nums">
                      {formatKES(h.totalPrice ?? 0)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete === h.id ? (
                          <>
                            <button
                              onClick={() => deleteHamper.mutate(h.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              data-testid={`button-confirm-delete-${h.id}`}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setLocation(`/quotes?hamperId=${h.id}`)}
                              className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
                              data-testid={`button-quote-hamper-${h.id}`}
                            >
                              <FileText size={11} /> Quote
                            </button>
                            <button
                              onClick={() => setLocation(`/hamper-builder?hamperId=${h.id}`)}
                              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1"
                              data-testid={`button-edit-hamper-${h.id}`}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete(h.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded"
                              data-testid={`button-delete-hamper-${h.id}`}
                            >
                              <Trash2 size={13} />
                            </button>
                            <ChevronRight size={14} className="text-muted-foreground/40" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
