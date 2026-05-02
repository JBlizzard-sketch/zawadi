import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Mail, CheckCircle2, Package, Leaf, ExternalLink } from "lucide-react";
import { useGetSupplier, getGetSupplierQueryKey, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: supplier, isLoading } = useGetSupplier(id, { query: { enabled: !!id, queryKey: getGetSupplierQueryKey(id) } });

  const productParams = { supplier_id: id, limit: 6, offset: 0 };
  const { data: productsData, isLoading: productsLoading } = useListProducts(
    productParams,
    { query: { enabled: !!id, queryKey: getListProductsQueryKey(productParams) } }
  );

  const s = supplier as any;
  const products = (productsData as any)?.items ?? [];

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!s) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Supplier not found.</p>
          <button onClick={() => setLocation("/suppliers")} className="text-sm text-primary hover:underline mt-2 block mx-auto">Back to suppliers</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => setLocation("/suppliers")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" data-testid="button-back">
          <ArrowLeft size={16} /> Back to Suppliers
        </button>

        {/* Hero */}
        <div className="rounded-2xl mb-6 border border-card-border relative overflow-hidden">
          {s.coverImageUrl && (
            <div className="h-48 relative overflow-hidden">
              <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          )}
          <div className={`bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 p-8 ${s.coverImageUrl ? "-mt-16 relative z-10 bg-transparent" : ""}`}>
          <div className={s.coverImageUrl ? "" : "absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_30%_80%,hsl(16,58%,46%),transparent_60%)]"} />
          <div className="relative">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-foreground" data-testid="text-supplier-name">{s.name}</h1>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={13} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{s.county}, Kenya</span>
                </div>
              </div>
              {s.isVerified && (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200" data-testid="badge-verified">
                  <CheckCircle2 size={12} /> Verified Supplier
                </span>
              )}
            </div>
            {s.description && <p className="text-sm text-stone-700 leading-relaxed max-w-2xl">{s.description}</p>}
            {s.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {s.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Story */}
          {s.story && (
            <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Leaf size={12} className="text-green-700" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Producer Story</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{s.story}</p>
            </div>
          )}

          {/* Contact + Status */}
          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Contact</p>
              <div className="space-y-3">
                {s.contactName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Person</p>
                    <p className="text-sm font-medium text-foreground">{s.contactName}</p>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${s.email}`} className="text-sm text-primary hover:underline truncate">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-foreground">{s.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Partnership</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Onboarding Status</p>
                  <p className="text-sm font-medium capitalize text-foreground">{s.onboardingStatus?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="text-sm font-medium text-foreground">{new Date(s.createdAt).getFullYear()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products by this Supplier */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-serif font-semibold text-foreground">Products from {s.name}</h2>
            <Link href="/catalogue" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View all <ExternalLink size={11} />
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-card-border">
                  <Skeleton className="h-36 w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-card border border-card-border rounded-xl text-center">
              <Package size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No products listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/catalogue/${product.id}`}
                  className="group block bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center relative overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package size={28} className="text-muted-foreground/20" />
                    )}
                    {product.isFeatured && (
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full shadow-sm">Featured</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</p>
                    <p className="text-xs text-muted-foreground mb-1">{product.origin}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-primary">{formatKES(product.unitPrice)}</span>
                      <span className="text-[11px] text-muted-foreground">MOQ {product.moq}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
