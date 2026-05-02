import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, BookOpen, Gift, ShoppingCart,
  FileText, Receipt, Building2, Layers, ChevronRight, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchCommand from "@/components/ui/SearchCommand";

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Catalogue", href: "/catalogue", icon: Package },
  { label: "Collections", href: "/collections", icon: BookOpen },
  { label: "Hamper Builder", href: "/hamper-builder", icon: Gift },
  { label: "Quotes", href: "/quotes", icon: FileText },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Suppliers", href: "/suppliers", icon: Layers },
  { label: "Corporates", href: "/corporates", icon: Building2 },
];

export default function Sidebar() {
  const [location] = useLocation();

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
