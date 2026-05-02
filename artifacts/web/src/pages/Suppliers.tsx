import { useState } from "react";
import { Link } from "wouter";
import { Layers, Search, CheckCircle2, MapPin } from "lucide-react";
import { useListSuppliers, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";

const COUNTIES = ["Nairobi", "Kajiado", "Murang'a", "Kirinyaga", "Mombasa", "Kisumu", "Nakuru"];

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");

  const params = { search: search || undefined, county: county || undefined };
  const { data: suppliers, isLoading } = useListSuppliers(params, { query: { queryKey: getListSuppliersQueryKey(params) } });
  const supplierList = (suppliers as any[]) ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-semibold text-foreground">Supplier Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Kenya's finest artisan producers and their stories</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCounty("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!county ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
              data-testid="filter-all-counties"
            >
              All Counties
            </button>
            {COUNTIES.map((c) => (
              <button
                key={c}
                onClick={() => setCounty(county === c ? "" : c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${county === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                data-testid={`filter-county-${c.toLowerCase()}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-card-border">
                <Skeleton className="h-40 rounded-none" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : supplierList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers size={40} className="text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-muted-foreground">No suppliers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {supplierList.map((supplier: any) => (
              <Link key={supplier.id} href={`/suppliers/${supplier.id}`} className="group block bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5" data-testid={`card-supplier-${supplier.id}`}>
                  <div className="h-36 bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center relative">
                    <Layers size={32} className="text-muted-foreground/20" />
                    {supplier.is_verified && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-200">
                          <CheckCircle2 size={9} /> Verified
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-serif font-semibold text-foreground group-hover:text-primary transition-colors">{supplier.name}</h3>
                    <div className="flex items-center gap-1 mt-1 mb-2">
                      <MapPin size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{supplier.county}</span>
                    </div>
                    {supplier.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{supplier.description}</p>
                    )}
                    {supplier.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {supplier.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px] py-0">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
