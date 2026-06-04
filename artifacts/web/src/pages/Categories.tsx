import { useState } from "react";
import { useLocation } from "wouter";
import { Tag, Plus, Pencil, Trash2, X, Check, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Categories() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const QUERY_KEY = ["categories-manage"];

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const { data: categories, isLoading } = useQuery<any[]>({
    queryKey: QUERY_KEY,
    queryFn: () => fetch(`${BASE}/api/categories`).then((r) => r.json()),
  });

  const createCategory = useMutation({
    mutationFn: async (body: { name: string; slug: string; description?: string }) => {
      const res = await fetch(`${BASE}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setShowAdd(false); setAddName(""); setAddDesc(""); setAddError("");
    },
    onError: (e: any) => setAddError(e.message ?? "Failed to create category."),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      const res = await fetch(`${BASE}/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slugify(name), description: description || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setEditingId(null); setEditError("");
    },
    onError: (e: any) => setEditError(e.message ?? "Failed to save."),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setConfirmDelete(null); setDeleteError("");
    },
    onError: (e: any) => setDeleteError(e.message ?? "Cannot delete this category."),
  });

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? "");
    setEditError("");
    setConfirmDelete(null);
  };

  const catList = categories ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Product Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage the categories used to organise your catalogue</p>
          </div>
          <Button size="sm" onClick={() => { setShowAdd(true); setAddName(""); setAddDesc(""); setAddError(""); }} className="gap-1.5" data-testid="button-add-category">
            <Plus size={14} /> Add Category
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="mb-4 bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Name *</label>
                <Input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Honey & Spreads"
                  data-testid="input-category-name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
                <Input
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  placeholder="Short description…"
                  data-testid="input-category-desc"
                />
              </div>
            </div>
            {addName.trim() && (
              <p className="text-xs text-muted-foreground/60">Slug: <span className="font-mono">{slugify(addName)}</span></p>
            )}
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!addName.trim() || createCategory.isPending}
                onClick={() => createCategory.mutate({ name: addName.trim(), slug: slugify(addName), description: addDesc.trim() || undefined })}
                data-testid="button-save-category"
              >
                {createCategory.isPending ? "Saving…" : "Save Category"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : catList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Tag size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No categories yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {catList.map((cat: any) => (
                <div key={cat.id} className="px-5 py-4" data-testid={`row-category-${cat.id}`}>
                  {editingId === cat.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          data-testid={`input-edit-name-${cat.id}`}
                        />
                        <Input
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="Description"
                          className="h-8 text-sm"
                          data-testid={`input-edit-desc-${cat.id}`}
                        />
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCategory.mutate({ id: cat.id, name: editName.trim(), description: editDesc.trim() })}
                          disabled={!editName.trim() || updateCategory.isPending}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                          data-testid={`button-confirm-edit-${cat.id}`}
                        >
                          <Check size={12} /> {updateCategory.isPending ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Tag size={14} className="text-primary/70" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{cat.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/60 font-mono hidden sm:block">{cat.slug}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cat.product_count > 0 ? (
                          <button
                            onClick={() => setLocation(`/catalogue?category=${cat.id}`)}
                            className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary bg-primary/6 hover:bg-primary/10 border border-primary/15 rounded-full px-2.5 py-0.5 transition-colors"
                            data-testid={`link-catalogue-${cat.id}`}
                          >
                            <Package size={11} />
                            {cat.product_count} product{cat.product_count !== 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 px-2">0 products</span>
                        )}
                        {confirmDelete === cat.id ? (
                          <>
                            <span className="text-xs text-red-600 mr-1">{deleteError || "Delete?"}</span>
                            <button
                              onClick={() => deleteCategory.mutate(cat.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              data-testid={`button-confirm-delete-${cat.id}`}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(null); setDeleteError(""); }}
                              className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(cat)}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                              data-testid={`button-edit-category-${cat.id}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(cat.id); setDeleteError(""); }}
                              className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors rounded"
                              data-testid={`button-delete-category-${cat.id}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
