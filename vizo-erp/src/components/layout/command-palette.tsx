"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, Package, Users, BookOpen,
  BarChart3, Sparkles, Settings, MessageSquare, UserPlus, Building2,
  Box, Banknote, Receipt, Moon, Plus, Sun, ArrowRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";

type Action = { label: string; icon: React.ElementType; href?: string; run?: () => void; shortcut?: string; keywords?: string };

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const { can } = useSession();

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
    { label: "Goods Receipts",    icon: Package,         href: "/purchases/grns",                perm: "purchases.view" },
    { label: "Parties",           icon: Users,           href: "/parties",                       perm: "customers.view" },
    { label: "Customers",         icon: Users,           href: "/parties/customers",             perm: "customers.view" },
    { label: "Suppliers",         icon: Users,           href: "/parties/suppliers",             perm: "purchases.view" },
    { label: "Products",          icon: Box,             href: "/inventory/products",            perm: "stock.view" },
    { label: "Stock Levels",      icon: Package,         href: "/inventory/stock-levels",        perm: "stock.view" },
    { label: "Stock Transfers",   icon: Package,         href: "/inventory/transfers",           perm: "stock.transfer" },
    { label: "Chart of Accounts", icon: BookOpen,        href: "/accounting/coa",                perm: "ledger.view" },
    { label: "Journal Entries",   icon: BookOpen,        href: "/accounting/journal-entries",    perm: "ledger.manage" },
    { label: "Vouchers",          icon: Banknote,        href: "/accounting/vouchers",           perm: "money.view" },
    { label: "Profit & Loss",     icon: BarChart3,       href: "/accounting/profit-loss",        perm: "statements.view" },
    { label: "Balance Sheet",     icon: BarChart3,       href: "/accounting/balance-sheet",      perm: "statements.view" },
    { label: "Reports",           icon: BarChart3,       href: "/reports",                       perm: "reports.view" },
    { label: "Settings",          icon: Settings,        href: "/admin/settings",                perm: "setup.manage" },
  ] as (Action & { perm: string | null })[]).filter((a) => a.perm === null || can(a.perm));

  const actions: Action[] = ([
    /* The question box. First in the list because Cmd+K is where people
       already go when they do not know which screen holds the answer. */
    { label: "Ask a question",           icon: Sparkles, href: "/reports/ask",         shortcut: "?", keywords: "ask ai question sawal report why kyun", perm: "reports.view" },
    { label: "Create New Order",         icon: Plus, href: "/sales/orders/new",        shortcut: "O", keywords: "new order create",             perm: "orders.create" },
    { label: "Create New Invoice",       icon: Plus, href: "/sales/invoices/new",      shortcut: "I", keywords: "new invoice create",           perm: "invoices.create" },
    { label: "Create New Purchase Order",icon: Plus, href: "/purchases/orders/new",    shortcut: "P", keywords: "new po purchase",              perm: "purchases.manage" },
    { label: "Create New GRN",           icon: Plus, href: "/purchases/grns/new",      shortcut: "G", keywords: "new grn goods receipt",        perm: "receipts.stock" },
    { label: "Create New Voucher",       icon: Plus, href: "/accounting/vouchers/new", shortcut: "V", keywords: "new voucher",                  perm: "money.manage" },
    { label: "Create New Party",         icon: UserPlus, href: "/parties/new",         shortcut: "C", keywords: "new customer supplier party",  perm: "customers.manage" },
    { label: "Create New Product",       icon: Plus, href: "/inventory/products/new",  shortcut: "R", keywords: "new product sku",              perm: "products.manage" },
  ] as (Action & { perm: string })[]).filter((a) => can(a.perm));

  const themeActions: Action[] = [
    { label: "Switch to Light Theme", icon: Sun,  run: () => { setTheme("light"); setOpen(false); }, keywords: "theme light mode" },
    { label: "Switch to Dark Theme",  icon: Moon, run: () => { setTheme("dark");  setOpen(false); }, keywords: "theme dark mode" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command, search a page or run an action…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {actions.map((a) => (
            <CommandItem key={a.label} keywords={[a.keywords ?? ""]} onSelect={() => a.href ? go(a.href) : a.run?.()}>
              <a.icon />
              <span>{a.label}</span>
              {a.shortcut && <CommandShortcut>⌘{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {navigation.map((n) => (
            <CommandItem key={n.label} keywords={[n.keywords ?? ""]} onSelect={() => n.href && go(n.href)}>
              <n.icon />
              <span>{n.label}</span>
              <ArrowRight className="ml-auto opacity-0 group-data-[selected=true]:opacity-100" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Theme">
          {themeActions.map((a) => {
            const isActive = (a.label.includes("Light") && resolvedTheme === "light") || (a.label.includes("Dark") && resolvedTheme === "dark");
            if (isActive) return null;
            return (
              <CommandItem key={a.label} keywords={[a.keywords ?? ""]} onSelect={() => a.run?.()}>
                <a.icon />
                <span>{a.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
