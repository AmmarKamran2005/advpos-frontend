"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const navigation: Action[] = [
    { label: "Dashboard",         icon: LayoutDashboard, href: "/dashboard" },
    { label: "Orders",            icon: ShoppingCart,    href: "/sales/orders" },
    { label: "Invoices",          icon: FileText,        href: "/sales/invoices" },
    { label: "Credit Holds",      icon: ShoppingCart,    href: "/sales/credit-holds" },
    { label: "Purchase Orders",   icon: Truck,           href: "/purchases/orders" },
    { label: "Goods Receipts",    icon: Package,         href: "/purchases/grns" },
    { label: "Parties",           icon: Users,           href: "/parties" },
    { label: "Customers",         icon: Users,           href: "/parties/customers" },
    { label: "Suppliers",         icon: Users,           href: "/parties/suppliers" },
    { label: "Products",          icon: Box,             href: "/inventory/products" },
    { label: "Stock Levels",      icon: Package,         href: "/inventory/stock-levels" },
    { label: "Stock Transfers",   icon: Package,         href: "/inventory/transfers" },
    { label: "Chart of Accounts", icon: BookOpen,        href: "/accounting/coa" },
    { label: "Journal Entries",   icon: BookOpen,        href: "/accounting/journal-entries" },
    { label: "Vouchers",          icon: Banknote,        href: "/accounting/vouchers" },
    { label: "Profit & Loss",     icon: BarChart3,       href: "/accounting/profit-loss" },
    { label: "Balance Sheet",     icon: BarChart3,       href: "/accounting/balance-sheet" },
    { label: "Reports",           icon: BarChart3,       href: "/reports" },
    { label: "AI Assistant",      icon: Sparkles,        href: "/ai-assistant" },
    { label: "SMS History",       icon: MessageSquare,   href: "/notifications/sms" },
    { label: "Settings",          icon: Settings,        href: "/admin/settings" },
  ];

  const actions: Action[] = [
    { label: "Create New Order",         icon: Plus, href: "/sales/orders/new",        shortcut: "O", keywords: "new order create" },
    { label: "Create New Invoice",       icon: Plus, href: "/sales/invoices/new",      shortcut: "I", keywords: "new invoice create" },
    { label: "Create New Purchase Order",icon: Plus, href: "/purchases/orders/new",    shortcut: "P", keywords: "new po purchase" },
    { label: "Create New GRN",           icon: Plus, href: "/purchases/grns/new",      shortcut: "G", keywords: "new grn goods receipt" },
    { label: "Create New Voucher",       icon: Plus, href: "/accounting/vouchers/new", shortcut: "V", keywords: "new voucher" },
    { label: "Create New Party",         icon: UserPlus, href: "/parties/new",          shortcut: "C", keywords: "new customer supplier party" },
    { label: "Create New Product",       icon: Plus, href: "/inventory/products/new",  shortcut: "R", keywords: "new product sku" },
    { label: "Create New Branch",        icon: Building2, href: "/admin/branches/new",  shortcut: "B", keywords: "new branch" },
  ];

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
