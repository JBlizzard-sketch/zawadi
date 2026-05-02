import { useParams, useLocation } from "wouter";
import { ArrowLeft, Package, Clock, MapPin, Tag, ShoppingCart, Gift, Star, Leaf } from "lucide-react";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

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
            <Skeleton className="h-80 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-10 w-full" />
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
  const occasionTags: string[] = p.occasionTags ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/catalogue")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Catalogue
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-square bg-gradient-to-br from-amber-50 via-stone-50 to-amber-100 rounded-2xl border border-card-border relative overflow-hidden flex items-center justify-center">
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt={p.images[0].alt ?? p.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={56} className="text-muted-foreground/20" />
              )}
              {p.isFeatured && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    <Star size={10} fill="currentColor" /> Featured
                  </span>
                </div>
              )}
            </div>

            {/* Occasion Tags */}
            {occasionTags.length > 0 && (
              <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ideal For</p>
                <div className="flex flex-wrap gap-2">
                  {occasionTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium bg-primary/8 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                      <Gift size={10} />
                      {OCCASION_LABELS[tag] ?? tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              {p.category && (
                <Badge variant="secondary" className="mb-2 text-xs">{p.category.name}</Badge>
              )}
              <h1 className="text-2xl font-serif font-semibold text-foreground leading-tight" data-testid="text-product-name">{p.name}</h1>
              {p.supplier && (
                <button
                  onClick={() => setLocation(`/suppliers/${p.supplier.id}`)}
                  className="text-sm text-muted-foreground mt-1 hover:text-primary transition-colors"
                  data-testid="link-supplier"
                >
                  by <span className="font-medium underline-offset-2 hover:underline">{p.supplier.name}</span>
                </button>
              )}
            </div>

            {p.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            )}

            {/* Key specs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <Tag size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="text-sm font-bold text-foreground" data-testid="text-unit-price">{formatKES(p.unitPrice)}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <ShoppingCart size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Min. Order</p>
                  <p className="text-sm font-bold text-foreground">{p.moq} units</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <Clock size={14} className="text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm font-bold text-foreground">{p.leadTimeDays} days</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
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
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Quantity</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Price / Unit</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-muted/10">
                        <td className="px-4 py-2.5 text-muted-foreground">1–{bulkTiers[0].min_qty - 1} units</td>
                        <td className="px-4 py-2.5 text-right font-medium text-foreground">{formatKES(p.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">—</td>
                      </tr>
                      {bulkTiers.map((tier, i) => {
                        const savings = Math.round((1 - tier.price_per_unit / parseFloat(p.unitPrice)) * 100);
                        return (
                          <tr key={i} className="hover:bg-muted/20" data-testid={`tier-row-${i}`}>
                            <td className="px-4 py-2.5 text-foreground">{tier.min_qty}+ units</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-primary">{formatKES(tier.price_per_unit)}</td>
                            <td className="px-4 py-2.5 text-right text-xs font-medium text-green-700">Save {savings}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Tags */}
            {p.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t: string) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                size="lg"
                className="w-full gap-2 text-sm"
                onClick={() => setLocation(`/hamper-builder?add=${p.id}&name=${encodeURIComponent(p.name)}`)}
                data-testid="button-add-to-hamper"
              >
                <Gift size={15} /> Add to Hamper Builder
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => setLocation("/quotes")}
                data-testid="button-request-quote"
              >
                <ShoppingCart size={15} /> Request a Quote
              </Button>
            </div>

            {/* Supplier Story */}
            {p.supplier?.story && (
              <div className="bg-gradient-to-br from-amber-50/80 to-stone-50 border border-amber-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf size={14} className="text-green-700" />
                  <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Producer Story</p>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed line-clamp-4">{p.supplier.story}</p>
                <button
                  onClick={() => setLocation(`/suppliers/${p.supplier.id}`)}
                  className="text-xs font-semibold text-primary mt-3 hover:underline flex items-center gap-1"
                  data-testid="link-supplier-story"
                >
                  Read full supplier story →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
