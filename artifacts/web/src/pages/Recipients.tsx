import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Upload, Users, Trash2, UserPlus, FileDown } from "lucide-react";
import { useListRecipients, getListRecipientsQueryKey, useBulkCreateRecipients, useDeleteRecipient } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CSV_TEMPLATE = "Name, Email, Title, Department\nAmina Hassan, amina@equity.co.ke, Head of Finance, Finance\nJohn Kamau, jkamau@equity.co.ke, Director, Operations";

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recipients_template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Recipients() {
  const { id: orderId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [template, setTemplate] = useState("Dear {{name}},\n\nThank you for your dedication to our team. This gift is a token of our appreciation.\n\nWarm regards,\nThe Management");
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ created: number; failed: number } | null>(null);

  // Single add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", title: "", department: "" });
  const [addError, setAddError] = useState("");

  const params = { order_id: orderId };
  const { data: recipients, isLoading } = useListRecipients(params, { query: { enabled: !!orderId, queryKey: getListRecipientsQueryKey(params) } });
  const bulkCreate = useBulkCreateRecipients();
  const deleteRecipient = useDeleteRecipient();

  const recipientList = (recipients as any[]) ?? [];

  const addOne = useMutation({
    mutationFn: async (body: typeof addForm) => {
      const res = await fetch(`${BASE}/api/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          name: body.name,
          email: body.email || undefined,
          title: body.title || undefined,
          department: body.department || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListRecipientsQueryKey(params) });
      setAddForm({ name: "", email: "", title: "", department: "" });
      setShowAddForm(false);
      setAddError("");
    },
    onError: (e: any) => setAddError(e.message ?? "Something went wrong."),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Strip header row if it starts with "Name" (case-insensitive)
      const lines = text.trim().split("\n");
      const firstLower = lines[0]?.toLowerCase() ?? "";
      const dataLines = firstLower.startsWith("name") ? lines.slice(1) : lines;
      setCsvText(dataLines.join("\n"));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Recipient Management</h1>
            <p className="text-sm text-muted-foreground mt-1">{recipientList.length} recipient{recipientList.length !== 1 ? "s" : ""} for this order</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(v => !v)} className="gap-1.5" data-testid="button-add-recipient">
            <UserPlus size={14} /> Add One
          </Button>
        </div>

        {/* Single add form */}
        {showAddForm && (
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm mb-6">
            <p className="text-sm font-semibold text-foreground mb-4">Add Recipient</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Name *</label>
                <Input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Wanjiru Njoroge"
                  data-testid="input-recipient-name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="wanjiru@company.co.ke"
                  data-testid="input-recipient-email"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Title</label>
                <Input
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Senior Analyst"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Department</label>
                <Input
                  value={addForm.department}
                  onChange={e => setAddForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="Finance"
                />
              </div>
            </div>
            {addError && <p className="text-xs text-destructive mb-2">{addError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { if (!addForm.name.trim()) { setAddError("Name is required"); return; } addOne.mutate(addForm); }} disabled={addOne.isPending} data-testid="button-save-recipient">
                {addOne.isPending ? "Adding…" : "Add Recipient"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setAddError(""); }}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upload */}
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Upload size={15} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Bulk Upload</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              One recipient per line: <code className="bg-muted px-1 rounded text-[11px]">Name, Email, Title, Department</code>
            </p>

            {/* File picker + download template */}
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" className="gap-1.5 flex-1 text-xs" onClick={() => fileInputRef.current?.click()} data-testid="button-pick-csv">
                <Upload size={12} /> Pick CSV file
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={downloadTemplate} title="Download template CSV">
                <FileDown size={12} /> Template
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </div>

            <Textarea
              data-testid="textarea-csv"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Amina Hassan, amina@equity.co.ke, Head of Finance, Finance\nJohn Kamau, jkamau@equity.co.ke, Director, Operations"}
              className="font-mono text-xs h-28 resize-none mb-3"
            />
            <Button size="sm" onClick={handleUpload} disabled={uploading || !csvText.trim()} data-testid="button-upload-recipients" className="w-full">
              {uploading ? "Uploading…" : "Upload Recipients"}
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
              <p className="text-sm text-muted-foreground">No recipients yet — add one above or upload a list.</p>
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
