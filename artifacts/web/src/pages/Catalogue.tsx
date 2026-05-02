import { useState } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal, Package, Star } from "lucide-react";
import { useListProducts, getListProductsQueryKey, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";

const OCCASIONS = [
  { value: "", label: "All occasions" },
  { value: "client_gifts", label: "Client Gifts" },
  { value: "staff_appreciation", label: "Staff Appreciation" },
  { value: "event_giveaways", label: "Event Giveaways" },
  { value: "festive_hampers", label: "Festive Hampers" },
  { value: "onboarding_kits", label: "Onboarding Kits" },
];

export default function Catalogue() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [occasion, setOccasion] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const params = {
    search: search || undefined,
    category_id: categoryId || undefined,
    occasion: occasion || undefined,
    limit,
    offset,
  };

  const { data: productsData, isLoading } = useListProducts(params, { query: { queryKey: getListProductsQueryKey(params) } });
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const products = (productsData as any)?.items ?? [];
  const total = (productsData as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Product Catalogue</h1>
          <p className="text-sm text-muted-foreground mt-1">Curated Kenyan artisan products for corporate gifting</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-card-border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
          <SlidersHorizontal size={15} className="text-muted-foreground" />
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories as any[])?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={occasion} onValueChange={(v) => { setOccasion(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-occasion">
              <SelectValue placeholder="All occasions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All occasions</SelectItem>
              {OCCASIONS.slice(1).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {total > 0 && (
            <p className="text-xs text-muted-foreground ml-auto">{total} product{total !== 1 ? "s" : ""}</p>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border border-card-border">
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => (
              <Link key={product.id} href={`/catalogue/${product.id}`} className="block bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group" data-testid={`card-product-${product.id}`}>
                  <div className="h-44 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center relative overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package size={32} className="text-muted-foreground/20" />
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                          <Star size={9} fill="currentColor" /> Featured
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{product.origin}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatKES(product.unitPrice)}</span>
                      <span className="text-xs text-muted-foreground">MOQ {product.moq}</span>
                    </div>
                    {product.leadTimeDays && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{product.leadTimeDays}d lead time</p>
                    )}
                  </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-prev-page"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + limit)}
              className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="button-next-page"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
