import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package, Clock, MapPin, Tag, ShoppingCart } from "lucide-react";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { formatKES, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id, queryKey: getGetProductQueryKey(id) } });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-80 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="link" onClick={() => setLocation("/catalogue")}>Back to catalogue</Button>
        </div>
      </Layout>
    );
  }

  const p = product as any;
  const bulkTiers: { min_qty: number; price_per_unit: number }[] = p.bulkTiers ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/catalogue")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Catalogue
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image */}
          <div className="lg:col-span-2">
            <div className="aspect-square bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl flex items-center justify-center border border-card-border">
              <Package size={56} className="text-muted-foreground/20" />
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              {p.category && (
                <Badge variant="secondary" className="mb-2 text-xs">{p.category.name}</Badge>
              )}
              <h1 className="text-2xl font-serif font-semibold text-foreground leading-tight" data-testid="text-product-name">{p.name}</h1>
              {p.supplier && (
                <p className="text-sm text-muted-foreground mt-1">by <span className="font-medium text-foreground">{p.supplier.name}</span></p>
              )}
            </div>

            {p.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            )}

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <Tag size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="text-sm font-bold text-foreground" data-testid="text-unit-price">{formatKES(p.unitPrice)}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <ShoppingCart size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Min. Order</p>
                  <p className="text-sm font-bold text-foreground">{p.moq} units</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <Clock size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm font-bold text-foreground">{p.leadTimeDays} days</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <MapPin size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Origin</p>
                  <p className="text-sm font-bold text-foreground">{p.origin}</p>
                </div>
              </div>
            </div>

            {/* Bulk Pricing Tiers */}
            {bulkTiers.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Bulk Pricing</p>
                <div className="border border-card-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Min. Qty</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Price / Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bulkTiers.map((tier, i) => (
                        <tr key={i} className="hover:bg-muted/20" data-testid={`tier-row-${i}`}>
                          <td className="px-4 py-2.5 text-foreground">{tier.min_qty}+ units</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-primary">{formatKES(tier.price_per_unit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tags */}
            {p.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t: string) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {/* Supplier Story Preview */}
            {p.supplier?.story && (
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Producer Story</p>
                <p className="text-sm text-stone-700 leading-relaxed line-clamp-4">{p.supplier.story}</p>
                <button
                  onClick={() => setLocation(`/suppliers/${p.supplier.id}`)}
                  className="text-xs font-medium text-primary mt-2 hover:underline"
                  data-testid="link-supplier-story"
                >
                  Read full story →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
