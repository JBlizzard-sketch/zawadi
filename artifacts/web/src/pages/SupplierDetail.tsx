import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, MapPin, Phone, Mail, CheckCircle2, Package } from "lucide-react";
import { useGetSupplier, getGetSupplierQueryKey } from "@workspace/api-client-react";
import { formatKES } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout/Layout";

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: supplier, isLoading } = useGetSupplier(id, { query: { enabled: !!id, queryKey: getGetSupplierQueryKey(id) } });
  const s = supplier as any;

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
        <div className="bg-gradient-to-br from-stone-100 to-amber-50 rounded-2xl p-8 mb-6 border border-card-border relative overflow-hidden">
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
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
                  <CheckCircle2 size={12} /> Verified Supplier
                </span>
              )}
            </div>
            {s.description && <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>}
            {s.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {s.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Story */}
          {s.story && (
            <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-6 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Producer Story</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{s.story}</p>
            </div>
          )}

          {/* Contact */}
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
                    <Mail size={13} className="text-muted-foreground" />
                    <a href={`mailto:${s.email}`} className="text-sm text-primary hover:underline">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground" />
                    <p className="text-sm text-foreground">{s.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Onboarding Status</p>
              <p className="text-sm font-medium capitalize text-foreground">{s.onboardingStatus?.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground mt-1">Member since {new Date(s.createdAt).getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
