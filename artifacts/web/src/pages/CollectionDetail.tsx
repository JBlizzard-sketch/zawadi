import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Package } from "lucide-react";
import { useGetCollection, getGetCollectionQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useGetCollection(id, { query: { enabled: !!id, queryKey: getGetCollectionQueryKey(id) } });
  const col = data as any;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 rounded-2xl w-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!col) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Collection not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <button onClick={() => setLocation("/collections")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Collections
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 to-stone-100 rounded-2xl p-8 mb-8 border border-card-border">
          <Badge variant="secondary" className="mb-3">{OCCASION_LABELS[col.occasion] ?? col.occasion}</Badge>
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-3" data-testid="text-collection-name">{col.name}</h1>
          {col.description && <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{col.description}</p>}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-bold text-primary">{formatKES(col.minPrice)} {col.maxPrice ? `— ${formatKES(col.maxPrice)}` : "+"}</span>
            <span className="text-sm text-muted-foreground">{col.productCount} products</span>
          </div>
        </div>

        {/* Products Grid */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Products in this Collection</h2>
        {(col.products ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package size={36} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No products in this collection yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(col.products as any[]).map((product: any) => (
              <Link key={product.id} href={`/catalogue/${product.id}`} className="group block bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-product-${product.id}`}>
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center">
                    <Package size={28} className="text-muted-foreground/20" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.origin}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatKES(product.unitPrice)}</p>
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
