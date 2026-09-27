"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession, API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package, Users, BookOpen,
  BarChart3, Sparkles, Settings, UserPlus, Box, Banknote, Moon, Plus, Sun,
  ArrowRight, Loader2, User,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { quickCreateFor, quickCreateHint, type QuickCreateItem } from "@/lib/shortcuts";
import { formatDate } from "@/lib/format";

type Action = { label: string; icon: React.ElementType; href?: string; run?: () => void; shortcut?: string; keywords?: string };

const QUICK_ICON: Record<QuickCreateItem["icon"], React.ElementType> = {
  "shopping-cart": ShoppingCart,
  "file-text": FileText,
  truck: Truck,
  banknote: Banknote,
  "user-plus": UserPlus,
  box: Box,
};

/* ─────────────────────────── record search ─────────────────────────── */

/** One row found in the database, already shaped for the list. */
type Hit = { key: string; title: string; subtitle: string; href: string };
type Source = "customers" | "products" | "orders" | "invoices";

const SOURCE_LABEL: Record<Source, string> = {
  customers: "Customers",
  products: "Products",
  orders: "Orders",
  invoices: "Invoices",
};
const SOURCE_ICON: Record<Source, React.ElementType> = {
  customers: User,
  products: Box,
  orders: ShoppingCart,
  invoices: FileText,
};

/** Rows per group. The palette is for jumping to a record, not browsing. */
const PER_GROUP = 5;
/** Wait for a pause in the typing before asking the server anything. */
const DEBOUNCE_MS = 250;

/* A source that answered 403 once will answer 403 again for this sign-in, so it
   is not asked again until the page reloads. Module scope on purpose: the
   palette unmounts between opens on some screens and this should survive it. */
const forbidden = new Set<Source>();

/**
 * The four list endpoints the screens already use, asked for a handful of rows
 * each, all at once. Each is optional: a role that may not read a list gets a
 * 403 and that group is simply left out -- the API is the judge of who sees
 * what, not a copy of its rules kept here.
 *
 * Deliberately shown from each row: a name or a number, and what tells two
 * similar rows apart (city, SKU, status, date). NOT money -- the order desk sees
 * no money at all, and nothing here may carry what an item cost.
 */
async function searchSource(source: Source, q: string, signal: AbortSignal): Promise<Hit[]> {
  const cfg = { headers: authHeader(), signal };
  const page = { q, page: 1, pageSize: PER_GROUP };

  switch (source) {
    case "customers": {
      type Row = { id: number; partyCode: string; displayName: string; city: string | null; type: string };
      const res = await axios.get<{ items: Row[] }>(`${API_BASE_URL}/parties`, {
        ...cfg, params: { ...page, type: "customer" },
      });
      return res.data.items.map((p) => ({
        key: `customer-${p.id}`,
        title: p.displayName,
        subtitle: [p.partyCode, p.city].filter(Boolean).join(" · "),
        href: `/parties/${p.id}`,
      }));
    }
    case "products": {
      type Row = { id: number; sku: string; name: string; categoryName?: string | null };
      const res = await axios.get<{ items: Row[] }>(`${API_BASE_URL}/inventory/products`, {
        ...cfg, params: page,
      });
      return res.data.items.map((p) => ({
        key: `product-${p.id}`,
        title: p.name,
        subtitle: [p.sku, p.categoryName].filter(Boolean).join(" · "),
        href: `/inventory/products/${p.id}`,
      }));
    }
    case "orders": {
      type Row = { id: number; orderNo: string; customerName: string; statusName: string; orderDate: string };
      const res = await axios.get<{ items: Row[] }>(`${API_BASE_URL}/sales/orders`, {
        ...cfg, params: page,
      });
      return res.data.items.map((o) => ({
        key: `order-${o.id}`,
        title: `${o.orderNo} · ${o.customerName}`,
        subtitle: `${o.statusName} · ${formatDate(o.orderDate)}`,
        href: `/sales/orders/${o.id}`,
      }));
    }
    case "invoices": {
      type Row = { id: number; invoiceNo: string; customerName: string; statusName: string; invoiceDate: string };
      const res = await axios.get<{ items: Row[] }>(`${API_BASE_URL}/sales/invoices`, {
        ...cfg, params: { ...page, walkIn: "all" },
      });
      return res.data.items.map((i) => ({
        key: `invoice-${i.id}`,
        title: `${i.invoiceNo} · ${i.customerName}`,
        subtitle: `${i.statusName} · ${formatDate(i.invoiceDate)}`,
        href: `/sales/invoices/${i.id}`,
      }));
    }
  }
}

const SOURCES: Source[] = ["customers", "orders", "invoices", "products"];

/* The view permission each list needs. Checked first so a role that plainly
   may not read a list is never sent to ask (and the browser never logs the
   403); the 403 handling below still covers anything the API refuses by role
   -- the products list, for one, is the Super Admin's and the accountant's
   by role, whatever the permission says. */
const SOURCE_PERM: Record<Source, string> = {
  customers: "customers.view",
  products: "products.view",
  orders: "orders.view",
  invoices: "invoices.view",
};

/** Live results for what has been typed, debounced, the stale ones cancelled. */
function useRecordSearch(query: string, can: (perm: string) => boolean) {
  /* The results carry the text they are FOR. While a new search is on its way
     the old rows are not shown -- Enter would otherwise open a record that
     matched what was typed a moment ago, not what is in the box now. */
  const [found, setFound] = React.useState<{ term: string; hits: Partial<Record<Source, Hit[]>> }>({ term: "", hits: {} });
  const term = query.trim();

  React.useEffect(() => {
    if (term.length < 2) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         Clearing the old results the moment the box is emptied is the effect's
         job; there is nothing to derive them from during render. */
      setFound({ term: "", hits: {} });
      return;
    }

    const ctrl = new AbortController();

    const timer = setTimeout(() => {
      const asked = SOURCES.filter((s) => !forbidden.has(s) && can(SOURCE_PERM[s]));
      void Promise.all(asked.map(async (s) => {
        try {
          return [s, await searchSource(s, term, ctrl.signal)] as const;
        } catch (e) {
          if (axios.isAxiosError(e) && (e.response?.status === 403 || e.response?.status === 401)) {
            forbidden.add(s);
          }
          /* Anything else -- a timeout, a cancelled request -- just leaves that
             group out this time. The palette is not the place for an error. */
          return [s, [] as Hit[]] as const;
        }
      })).then((pairs) => {
        if (ctrl.signal.aborted) return;
        setFound({ term, hits: Object.fromEntries(pairs) });
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, can]);

  const active = term.length >= 2;
  const current = found.term === term;
  return { hits: current ? found.hits : {}, loading: active && !current, active };
}

/** Every word typed appears somewhere in the label or its keywords. */
function matches(a: Action, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${a.label} ${a.keywords ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { can, user } = useSession();
  const [query, setQuery] = React.useState("");
  const { hits, loading, active } = useRecordSearch(open ? query : "", can);

  /* A fresh box every time the palette opens. */
  const setOpen = (v: boolean) => {
    if (!v) setQuery("");
    onOpenChange(v);
  };

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  /* Every entry carries the capability it needs. Without this the palette
     offered /admin/settings to a sales rep, who would be bounced to /forbidden
     by middleware -- a dead end dressed up as a menu item.
     "AI Assistant", "SMS History" and "Create New Branch" were removed: those
     three routes do not exist in this app. */
  const navigation: Action[] = ([
    { label: "Dashboard",         icon: LayoutDashboard, href: "/dashboard",                     perm: null },
    { label: "Orders",            icon: ShoppingCart,    href: "/sales/orders",                  perm: "orders.view" },
    { label: "Invoices",          icon: FileText,        href: "/sales/invoices",                perm: "invoices.view" },
    { label: "Credit Holds",      icon: ShoppingCart,    href: "/sales/credit-holds",            perm: "limits.manage" },
    { label: "Purchase Orders",   icon: Truck,           href: "/purchases/orders",              perm: "purchases.view" },
    { label: "Parties",           icon: Users,           href: "/parties",                       perm: "customers.view" },
    { label: "Customers",         icon: Users,           href: "/parties/customers",             perm: "customers.view" },
    { label: "Suppliers",         icon: Users,           href: "/parties/suppliers",             perm: "purchases.view" },
    { label: "Products",          icon: Box,             href: "/inventory/products",            perm: "products.view" },
    { label: "Stock Levels",      icon: Package,         href: "/inventory/stock-levels",        perm: "stock.view" },
    { label: "Stock Transfers",   icon: Package,         href: "/inventory/transfers",           perm: "stock.transfer" },
    { label: "Chart of Accounts", icon: BookOpen,        href: "/accounting/coa",                perm: "ledger.view" },
    { label: "Journal Entries",   icon: BookOpen,        href: "/accounting/journal-entries",    perm: "ledger.manage" },
    { label: "Vouchers",          icon: Banknote,        href: "/accounting/vouchers",           perm: "money.view" },
    { label: "Bank Reconciliation", icon: Banknote,      href: "/accounting/reconciliation",     perm: "ledger.manage", keywords: "bank statement match" },
    { label: "Profit & Loss",     icon: BarChart3,       href: "/accounting/profit-loss",        perm: "statements.view" },
    { label: "Balance Sheet",     icon: BarChart3,       href: "/accounting/balance-sheet",      perm: "statements.view" },
    { label: "Reports",           icon: BarChart3,       href: "/reports",                       perm: "reports.view" },
    { label: "Settings",          icon: Settings,        href: "/admin/settings",                perm: "setup.manage" },
  ] as (Action & { perm: string | null })[]).filter((a) => (a.perm === null || can(a.perm)) && matches(a, query));

  /* The question box first, because Ctrl+K is where people already go when
     they do not know which screen holds the answer. Then Quick Create, from
     the same list and with the same keys as the top bar's Create menu. */
  const actions: Action[] = [
    ...(can("reports.view")
      ? [{ label: "Ask a question", icon: Sparkles, href: "/reports/ask", keywords: "ask ai question sawal report why kyun" }]
      : []),
    ...quickCreateFor(can, user?.role).map((q) => ({
      label: `New ${q.label}`,
      icon: QUICK_ICON[q.icon] ?? Plus,
      href: q.href,
      shortcut: quickCreateHint(q.key),
      keywords: "new create add",
    })),
  ].filter((a) => matches(a, query));

  const themeActions: Action[] = ([
    { label: "Switch to Light Theme", icon: Sun,  run: () => { setTheme("light"); setOpen(false); }, keywords: "theme light mode" },
    { label: "Switch to Dark Theme",  icon: Moon, run: () => { setTheme("dark");  setOpen(false); }, keywords: "theme dark mode" },
  ] as Action[]).filter((a) =>
    !((a.label.includes("Light") && resolvedTheme === "light") || (a.label.includes("Dark") && resolvedTheme === "dark"))
    && matches(a, query));

  const groups = SOURCES.filter((s) => (hits[s]?.length ?? 0) > 0);
  const nothing = actions.length + navigation.length + themeActions.length + groups.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search customers, orders, invoices, items — or a page…"
      />
      <CommandList>
        {active && loading && groups.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="size-3.5 animate-spin" /> Searching…
          </div>
        )}
        {nothing && !loading && (
          <CommandEmpty>
            {active ? `Nothing found for “${query.trim()}”.` : "No results found."}
          </CommandEmpty>
        )}

        {/* Records first once something is typed: somebody who types a name
            or a number is looking for that record, not for a menu. */}
        {groups.map((s) => {
          const Icon = SOURCE_ICON[s];
          return (
            <CommandGroup key={s} heading={SOURCE_LABEL[s]}>
              {hits[s]!.map((h) => (
                <CommandItem key={h.key} value={h.key} onSelect={() => go(h.href)}>
                  <Icon />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{h.title}</div>
                    {h.subtitle && (
                      <div className="truncate text-2xs text-slate-500 dark:text-slate-400">{h.subtitle}</div>
                    )}
                  </div>
                  <ArrowRight className="ml-auto opacity-0 group-data-[selected=true]:opacity-100" />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
        {groups.length > 0 && <CommandSeparator />}

        {actions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {actions.map((a) => (
              <CommandItem key={a.label} value={`action-${a.label}`} onSelect={() => a.href ? go(a.href) : a.run?.()}>
                <a.icon />
                <span>{a.label}</span>
                {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {navigation.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              {navigation.map((n) => (
                <CommandItem key={n.label} value={`nav-${n.label}`} onSelect={() => n.href && go(n.href)}>
                  <n.icon />
                  <span>{n.label}</span>
                  <ArrowRight className="ml-auto opacity-0 group-data-[selected=true]:opacity-100" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {themeActions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Theme">
              {themeActions.map((a) => (
                <CommandItem key={a.label} value={`theme-${a.label}`} onSelect={() => a.run?.()}>
                  <a.icon />
                  <span>{a.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
