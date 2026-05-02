import { Link } from "wouter";
import { BookOpen, ArrowRight } from "lucide-react";
import { useListCollections, getListCollectionsQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";

const OCCASION_LABELS: Record<string, string> = {
  client_gifts: "Client Gifts",
  staff_appreciation: "Staff Appreciation",
  event_giveaways: "Event Giveaways",
  festive_hampers: "Festive Hampers",
  onboarding_kits: "Onboarding Kits",
  custom: "Custom",
};

const OCCASION_COLORS: Record<string, string> = {
  client_gifts: "bg-blue-100 text-blue-800",
  staff_appreciation: "bg-green-100 text-green-800",
  event_giveaways: "bg-amber-100 text-amber-800",
  festive_hampers: "bg-red-100 text-red-800",
  onboarding_kits: "bg-violet-100 text-violet-800",
  custom: "bg-muted text-muted-foreground",
};

const BG_GRADIENTS = [
  "from-amber-50 to-orange-100",
  "from-green-50 to-emerald-100",
  "from-stone-100 to-amber-50",
  "from-red-50 to-orange-50",
  "from-violet-50 to-purple-100",
];

export default function Collections() {
  const { data: collections, isLoading } = useListCollections({}, { query: { queryKey: getListCollectionsQueryKey({}) } });

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Gift Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">Curated sets for every corporate occasion</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-card-border">
                <Skeleton className="h-48 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (collections as any[])?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No collections yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(collections as any[])?.map((col: any, i: number) => (
              <Link key={col.id} href={`/collections/${col.id}`} className="group block bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-collection-${col.id}`}>
                  {/* Cover */}
                  <div className={`h-44 bg-gradient-to-br ${BG_GRADIENTS[i % BG_GRADIENTS.length]} flex items-center justify-center relative`}>
                    <BookOpen size={36} className="text-muted-foreground/20" />
                    {col.isFeatured && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full">Featured</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${OCCASION_COLORS[col.occasion] ?? "bg-muted text-muted-foreground"}`}>
                        {OCCASION_LABELS[col.occasion] ?? col.occasion}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-base font-serif font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{col.name}</h3>
                    {col.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{col.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{col.productCount} products</p>
                        <p className="text-sm font-bold text-primary mt-0.5">
                          {formatKES(col.minPrice)} {col.maxPrice ? `— ${formatKES(col.maxPrice)}` : "+"}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
