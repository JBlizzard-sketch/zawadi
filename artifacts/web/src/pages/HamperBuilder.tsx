import { useState, useMemo } from "react";
import { Gift, Plus, Minus, Trash2, Package, ShoppingCart } from "lucide-react";
import { useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

interface HamperItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  origin: string;
}

const VAT_RATE = 0.16;

export default function HamperBuilder() {
  const [hamper, setHamper] = useState<HamperItem[]>([]);
  const [recipients, setRecipients] = useState(1);
  const [hamperName, setHamperName] = useState("My Zawadi Hamper");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const params = { search: search || undefined, category_id: categoryId || undefined, limit: 20, offset: 0 };
  const { data: productsData, isLoading } = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const products = (productsData as any)?.items ?? [];

  const addProduct = (product: any) => {
    setHamper((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: parseFloat(product.unitPrice), quantity: 1, origin: product.origin }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setHamper((prev) =>
      prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const removeItem = (productId: string) => {
    setHamper((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totals = useMemo(() => {
    const hamperValue = hamper.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const totalUnits = recipients * hamper.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = hamperValue * recipients;
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    return { hamperValue, totalUnits, subtotal, vat, total };
  }, [hamper, recipients]);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Hamper Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Design a custom gift hamper from Kenyan artisan products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Product Browser */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Browse Products</p>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-40">
                  <Input
                    data-testid="input-product-search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 text-sm pl-3"
                  />
                </div>
                <Select value={categoryId} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40 h-9 text-sm" data-testid="select-category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {(categories as any[])?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-card-border rounded-xl">
                <Package size={32} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product: any) => {
                  const inHamper = hamper.find((i) => i.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className={`bg-card border rounded-xl p-4 flex flex-col gap-2 transition-all cursor-pointer hover:shadow-md ${inHamper ? "border-primary/40 bg-primary/5" : "border-card-border"}`}
                      data-testid={`card-product-${product.id}`}
                    >
                      <div className="h-20 bg-gradient-to-br from-amber-50 to-stone-100 rounded-lg flex items-center justify-center mb-1">
                        <Package size={22} className="text-muted-foreground/20" />
                      </div>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.origin}</p>
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <span className="text-xs font-bold text-primary">{formatKES(product.unitPrice)}</span>
                        <button
                          onClick={() => addProduct(product)}
                          className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-all ${inHamper ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                          data-testid={`button-add-${product.id}`}
                        >
                          <Plus size={11} /> {inHamper ? "Add more" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hamper Summary */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hamper Name & Recipients */}
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Hamper Name</label>
                <Input
                  data-testid="input-hamper-name"
                  value={hamperName}
                  onChange={(e) => setHamperName(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Number of Recipients</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRecipients(Math.max(1, recipients - 1))}
                    className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    data-testid="button-decrease-recipients"
                  >
                    <Minus size={13} />
                  </button>
                  <Input
                    data-testid="input-recipients"
                    type="number"
                    min={1}
                    value={recipients}
                    onChange={(e) => setRecipients(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-sm h-8 text-center w-20"
                  />
                  <button
                    onClick={() => setRecipients(recipients + 1)}
                    className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    data-testid="button-increase-recipients"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Gift size={14} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Hamper Contents</p>
                {hamper.length > 0 && (
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{hamper.length} item{hamper.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {hamper.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Gift size={28} className="text-muted-foreground/25 mb-2" />
                  <p className="text-sm text-muted-foreground">Add products from the left to build your hamper</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {hamper.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3" data-testid={`hamper-item-${item.productId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatKES(item.unitPrice)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" data-testid={`button-decrease-${item.productId}`}>
                          <Minus size={10} />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" data-testid={`button-increase-${item.productId}`}>
                          <Plus size={10} />
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-foreground w-16 text-right tabular-nums">{formatKES(item.unitPrice * item.quantity)}</span>
                      <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`button-remove-${item.productId}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Summary */}
            {hamper.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quote Estimate</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hamper value</span>
                    <span className="font-medium">{formatKES(totals.hamperValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipients × {recipients}</span>
                    <span className="font-medium">{formatKES(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (16%)</span>
                    <span className="font-medium">{formatKES(totals.vat)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="font-semibold text-foreground">Total Estimate</span>
                    <span className="font-bold text-primary text-base tabular-nums" data-testid="text-total-estimate">{formatKES(totals.total)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">{totals.totalUnits} total units across {recipients} recipient{recipients !== 1 ? "s" : ""}</p>
                <Button size="sm" className="w-full gap-2 mt-2" data-testid="button-request-quote">
                  <ShoppingCart size={14} /> Request Formal Quote
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
