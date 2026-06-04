import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Search, ShoppingCart, FileText, Building2, Layers, Package, X, Command,
} from "lucide-react";
import { formatKES } from "@/lib/format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SearchResults {
  orders: any[];
  quotes: any[];
  corporates: any[];
  suppliers: any[];
  products: any[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", in_production: "In Production",
  quality_check: "QC", packaging: "Packaging", dispatched: "Dispatched",
  delivered: "Delivered", cancelled: "Cancelled",
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", rejected: "Rejected", expired: "Expired",
};

export default function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
    setSelectedIndex(-1);
  }, []);

  const navigate = useCallback((path: string) => {
    close();
    setLocation(path);
  }, [close, setLocation]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) setTimeout(() => inputRef.current?.focus(), 30);
          return !prev;
        });
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults(null); setLoading(false); setSelectedIndex(-1); return; }

    setLoading(true);
    setSelectedIndex(-1);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  const flatItems: Array<{ key: string; onClick: () => void }> = results
    ? [
        ...(results.orders ?? []).map((o: any) => ({ key: o.id, onClick: () => navigate(`/orders/${o.id}`) })),
        ...(results.quotes ?? []).map((q: any) => ({ key: q.id, onClick: () => navigate(`/quotes/${q.id}`) })),
        ...(results.corporates ?? []).map((c: any) => ({ key: c.id, onClick: () => navigate(`/corporates/${c.id}`) })),
        ...(results.suppliers ?? []).map((s: any) => ({ key: s.id, onClick: () => navigate(`/suppliers/${s.id}`) })),
        ...(results.products ?? []).map((p: any) => ({ key: p.id, onClick: () => navigate(`/catalogue/${p.id}`) })),
      ]
    : [];

  const totalItems = flatItems.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!totalItems) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => {
        const next = (i + 1) % totalItems;
        scrollResultIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => {
        const next = (i - 1 + totalItems) % totalItems;
        scrollResultIntoView(next);
        return next;
      });
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      flatItems[selectedIndex]?.onClick();
    }
  };

  function scrollResultIntoView(index: number) {
    requestAnimationFrame(() => {
      const el = resultsRef.current?.querySelector(`[data-result-index="${index}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  const hasResults = results && (
    results.orders.length + results.quotes.length +
    results.corporates.length + results.suppliers.length +
    results.products.length > 0
  );

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30); }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs hover:bg-muted/70 transition-colors w-full max-w-[160px]"
        data-testid="button-open-search"
        title="Search (⌘K)"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search…</span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
          <Command size={9} />K
        </span>
      </button>
    );
  }

  let globalIndex = -1;

  const makeResultRow = (
    key: string,
    icon: React.ReactNode,
    title: string,
    onClick: () => void,
    subtitle?: string,
    meta?: string,
  ) => {
    globalIndex++;
    const idx = globalIndex;
    const isSelected = selectedIndex === idx;
    return (
      <ResultRow
        key={key}
        index={idx}
        icon={icon}
        title={title}
        subtitle={subtitle}
        meta={meta}
        isSelected={isSelected}
        onClick={onClick}
        onMouseEnter={() => setSelectedIndex(idx)}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      data-testid="search-backdrop"
    >
      <div className="w-full max-w-xl bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" data-testid="search-modal">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search orders, quotes, suppliers, corporates…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
            data-testid="search-input"
            autoComplete="off"
          />
          {loading && (
            <svg className="w-4 h-4 text-primary animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {!loading && query && (
            <button onClick={() => { setQuery(""); setSelectedIndex(-1); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground/60">Esc</kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto flex-1" ref={resultsRef}>
          {!query || query.trim().length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search…
            </div>
          ) : !hasResults && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for "<span className="font-medium text-foreground">{query}</span>"
            </div>
          ) : (
            <div className="py-2">
              {(results?.orders ?? []).length > 0 && (
                <Section label="Orders">
                  {results!.orders.map((o: any) =>
                    makeResultRow(
                      o.id,
                      <ShoppingCart size={13} className="text-primary/70" />,
                      o.reference,
                      () => navigate(`/orders/${o.id}`),
                      [o.corporate_name, ORDER_STATUS_LABELS[o.status]].filter(Boolean).join(" · "),
                      formatKES(o.total),
                    )
                  )}
                </Section>
              )}

              {(results?.quotes ?? []).length > 0 && (
                <Section label="Quotes">
                  {results!.quotes.map((q: any) =>
                    makeResultRow(
                      q.id,
                      <FileText size={13} className="text-amber-600/80" />,
                      q.reference ?? q.id.slice(0, 8),
                      () => navigate(`/quotes/${q.id}`),
                      [q.corporate_name, QUOTE_STATUS_LABELS[q.status]].filter(Boolean).join(" · "),
                      formatKES(q.total),
                    )
                  )}
                </Section>
              )}

              {(results?.corporates ?? []).length > 0 && (
                <Section label="Corporate Accounts">
                  {results!.corporates.map((c: any) =>
                    makeResultRow(
                      c.id,
                      <Building2 size={13} className="text-sage-600/80" />,
                      c.name,
                      () => navigate(`/corporates/${c.id}`),
                      [c.industry, c.tier ? c.tier.charAt(0).toUpperCase() + c.tier.slice(1) : null].filter(Boolean).join(" · "),
                    )
                  )}
                </Section>
              )}

              {(results?.suppliers ?? []).length > 0 && (
                <Section label="Suppliers">
                  {results!.suppliers.map((s: any) =>
                    makeResultRow(
                      s.id,
                      <Layers size={13} className="text-green-700/70" />,
                      s.name,
                      () => navigate(`/suppliers/${s.id}`),
                      s.county ?? undefined,
                    )
                  )}
                </Section>
              )}

              {(results?.products ?? []).length > 0 && (
                <Section label="Products">
                  {results!.products.map((p: any) =>
                    makeResultRow(
                      p.id,
                      <Package size={13} className="text-muted-foreground" />,
                      p.name,
                      () => navigate(`/catalogue/${p.id}`),
                      p.origin ?? undefined,
                      formatKES(p.unitPrice),
                    )
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground/50">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>Esc close</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function ResultRow({
  index, icon, title, subtitle, meta, isSelected, onClick, onMouseEnter,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      data-result-index={index}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group ${
        isSelected ? "bg-primary/8 border-l-2 border-primary" : "hover:bg-muted/40 border-l-2 border-transparent"
      }`}
    >
      <span className="flex-shrink-0 w-5 flex items-center justify-center">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{title}</span>
        {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
      </span>
      {meta && <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{meta}</span>}
      {isSelected && <span className="text-[10px] text-primary/60 flex-shrink-0">↵</span>}
    </button>
  );
}
