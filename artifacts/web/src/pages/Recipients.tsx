import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Upload, Users, Trash2 } from "lucide-react";
import { useListRecipients, getListRecipientsQueryKey, useBulkCreateRecipients, useDeleteRecipient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";

export default function Recipients() {
  const { id: orderId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState("Dear {{name}},\n\nThank you for your dedication to our team. This gift is a token of our appreciation.\n\nWarm regards,\nThe Management");
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ created: number; failed: number } | null>(null);

  const params = { order_id: orderId };
  const { data: recipients, isLoading } = useListRecipients(params, { query: { enabled: !!orderId, queryKey: getListRecipientsQueryKey(params) } });
  const bulkCreate = useBulkCreateRecipients();
  const deleteRecipient = useDeleteRecipient();

  const recipientList = (recipients as any[]) ?? [];

  const handleUpload = () => {
    if (!csvText.trim()) return;
    setUploading(true);
    const lines = csvText.trim().split("\n");
    const parsed = lines.map((line) => {
      const [name, email, title, department] = line.split(",").map((s) => s.trim());
      return { name, email: email || undefined, title: title || undefined, department: department || undefined };
    }).filter((r) => r.name);

    bulkCreate.mutate(
      { data: { order_id: orderId, recipients: parsed, default_message_template: template } } as any,
      {
        onSuccess: (result: any) => {
          setUploadResult({ created: result.created, failed: result.failed });
          setCsvText("");
          queryClient.invalidateQueries({ queryKey: getListRecipientsQueryKey(params) });
          setUploading(false);
        },
        onError: () => setUploading(false),
      }
    );
  };

  const handleDelete = (recipientId: string) => {
    deleteRecipient.mutate({ id: recipientId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRecipientsQueryKey(params) }),
    });
  };

  const previewMessage = template
    .replace("{{name}}", "Wanjiru Njoroge")
    .replace("{{title}}", "Senior Analyst")
    .replace("{{department}}", "Finance");

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => setLocation(`/orders/${orderId}`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Order
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Recipient Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{recipientList.length} recipient{recipientList.length !== 1 ? "s" : ""} for this order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upload */}
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={15} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Bulk Upload</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">One recipient per line: <code className="bg-muted px-1 rounded text-[11px]">Name, Email, Title, Department</code></p>
            <Textarea
              data-testid="textarea-csv"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Amina Hassan, amina@equity.co.ke, Head of Finance, Finance\nJohn Kamau, jkamau@equity.co.ke, Director, Operations"}
              className="font-mono text-xs h-28 resize-none mb-3"
            />
            <Button size="sm" onClick={handleUpload} disabled={uploading || !csvText.trim()} data-testid="button-upload-recipients" className="w-full">
              {uploading ? "Uploading..." : "Upload Recipients"}
            </Button>
            {uploadResult && (
              <p className="text-xs mt-2 text-center text-muted-foreground" data-testid="text-upload-result">
                {uploadResult.created} uploaded{uploadResult.failed > 0 ? `, ${uploadResult.failed} failed` : ""}
              </p>
            )}
          </div>

          {/* Template */}
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-2">Personalisation Template</p>
            <p className="text-xs text-muted-foreground mb-3">Use <code className="bg-muted px-1 rounded text-[11px]">{"{{name}}"}</code>, <code className="bg-muted px-1 rounded text-[11px]">{"{{title}}"}</code>, <code className="bg-muted px-1 rounded text-[11px]">{"{{department}}"}</code></p>
            <Textarea
              data-testid="textarea-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="text-xs h-28 resize-none mb-3"
            />
            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1.5">Preview</p>
              <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">{previewMessage}</p>
            </div>
          </div>
        </div>

        {/* Recipient List */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Recipients</p>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : recipientList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No recipients yet. Upload a list above.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Title / Dept</th>
                  <th className="px-5 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recipientList.map((r: any) => (
                  <tr key={r.id} className="group" data-testid={`row-recipient-${r.id}`}>
                    <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{r.email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden lg:table-cell">
                      {[r.title, r.department].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        data-testid={`button-delete-recipient-${r.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
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
