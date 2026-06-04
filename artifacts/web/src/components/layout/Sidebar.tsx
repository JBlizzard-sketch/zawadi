import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, BookOpen, Gift, ShoppingCart,
  FileText, Receipt, Building2, Layers, ChevronRight, BarChart3, Settings2, Tag, Archive, ClipboardList, Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchCommand from "@/components/ui/SearchCommand";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Catalogue", href: "/catalogue", icon: Package },
  { label: "Categories", href: "/categories", icon: Tag },
  { label: "Collections", href: "/collections", icon: BookOpen },
  { label: "Hamper Builder", href: "/hamper-builder", icon: Gift },
  { label: "Saved Hampers", href: "/hampers", icon: Archive },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Stock", href: "/stock", icon: Warehouse },
  { label: "Suppliers", href: "/suppliers", icon: Layers },
  { label: "Purchase Orders", href: "/purchase-orders", icon: ClipboardList },
  { label: "Corporates", href: "/corporates", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

export default function Sidebar() {
  const [location] = useLocation();

  const { data: alerts } = useQuery<any>({
    queryKey: ["dashboard-alerts"],
    queryFn: () => fetch(`${BASE}/api/dashboard/alerts`).then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const { data: pendingPOs } = useQuery<any>({
    queryKey: ["po-badge"],
    queryFn: () => fetch(`${BASE}/api/purchase-orders?status=sent&limit=1`).then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const badges: Record<string, { count: number; color: string }> = {};

  if (alerts?.overdue_invoices?.count > 0)
    badges["/invoices"] = { count: alerts.overdue_invoices.count, color: "bg-red-500" };

  if (alerts?.expiring_quotes?.count > 0)
    badges["/quotes"] = { count: alerts.expiring_quotes.count, color: "bg-orange-500" };

  if (alerts?.low_stock_products?.count > 0)
    badges["/stock"] = { count: alerts.low_stock_products.count, color: "bg-amber-500" };

  if ((pendingPOs?.total ?? 0) > 0)
    badges["/purchase-orders"] = { count: pendingPOs.total, color: "bg-blue-500" };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Gift size={16} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-serif font-semibold text-sidebar-foreground text-base leading-tight tracking-wide">Zawadi</p>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-widest uppercase">Corporate Gifting</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-sidebar-border">
        <SearchCommand />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5" data-testid="sidebar-nav">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && !active && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${badge.color}`}>
                  {badge.count > 99 ? "99+" : badge.count}
                </span>
              )}
              {active && <ChevronRight size={12} className="opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-foreground/35 leading-relaxed">
          Made in Kenya
        </p>
      </div>
    </aside>
  );
}
