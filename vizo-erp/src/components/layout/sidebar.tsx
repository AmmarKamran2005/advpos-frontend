"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
import { navigationForRole, isActiveMatch, type NavNode } from "@/lib/nav-config";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* Resolve which match key is active based on current pathname */
function resolveActiveMatch(nodes: NavNode[], pathname: string): string {
  // Longest href wins, so /sales/orders beats /sales
  let best = "";
  let bestLength = 0;

  for (const node of nodes) {
    const candidates =
      node.type === "item"
        ? [node]
        : node.type === "group"
          ? node.children
          : [];

    for (const c of candidates) {
      if (pathname.startsWith(c.href) && c.href.length > bestLength) {
        best = c.match;
        bestLength = c.href.length;
      }
    }
  }
  return best;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { role, user } = useSession();
  const navigation = React.useMemo(() => navigationForRole(role), [role]);
  const activeMatch = resolveActiveMatch(navigation, pathname);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-900/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen bg-white dark:bg-navy-950 border-r border-slate-200 dark:border-navy-800 flex flex-col transition-[width,transform] duration-200",
          collapsed ? "w-[72px]" : "w-64",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="relative size-8 rounded-md overflow-hidden flex-shrink-0">
              <Image
                src="/vizo-logo.png"
                alt="AdvPOS"
                fill
                sizes="32px"
                className="object-cover dark:hidden"
                priority
              />
              <Image
                src="/vizo-logo-dark.jpg"
                alt="AdvPOS"
                fill
                sizes="32px"
                className="object-cover hidden dark:block"
                priority
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-navy-900 dark:text-white leading-tight truncate">
                  AdvPOS
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400 leading-tight truncate">
                  {user.roleLabel}
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Nav tree */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-0.5">
          {navigation.map((node, idx) => (
            <NavRenderer
              key={idx}
              node={node}
              activeMatch={activeMatch}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between flex-shrink-0">
          {!collapsed && (
            <div className="text-2xs text-slate-400 dark:text-slate-500">
              v2.0 · Build 2026.05
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden lg:inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white transition-colors ml-auto"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ───────────── Single nav node renderer (item / group / section) ───────────── */
function NavRenderer({
  node,
  activeMatch,
  collapsed,
}: {
  node: NavNode;
  activeMatch: string;
  collapsed: boolean;
}) {
  if (node.type === "section") {
    if (collapsed) {
      return <div className="my-2 mx-3 h-px bg-slate-200 dark:bg-navy-800" />;
    }
    return (
      <div className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pt-4 pb-1.5">
        {node.label}
      </div>
    );
  }

  if (node.type === "item") {
    const Icon = node.icon;
    const active = isActiveMatch(activeMatch, node.match);
    return (
      <Link
        href={node.href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          collapsed && "justify-center px-2",
          active
            ? "bg-navy-900 text-brand-yellow dark:bg-navy-800 dark:text-brand-yellow"
            : "text-slate-600 hover:bg-slate-50 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
        )}
        title={collapsed ? node.label : undefined}
      >
        {active && !collapsed && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-0.5 h-1/2 bg-brand-yellow rounded-r"
            aria-hidden
          />
        )}
        <Icon className="size-[18px] flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{node.label}</span>
            {node.badge && <Badge variant={node.badge.variant}>{node.badge.text}</Badge>}
          </>
        )}
      </Link>
    );
  }

  // group
  const Icon = node.icon;
  const groupHasActive = node.children.some((c) => isActiveMatch(activeMatch, c.match));

  if (collapsed) {
    // In collapsed mode, render as a single icon (clicking goes to first child)
    return (
      <Link
        href={node.children[0]?.href ?? "#"}
        className={cn(
          "flex items-center justify-center size-10 mx-auto rounded-lg text-sm font-medium transition-colors",
          groupHasActive
            ? "bg-navy-900 text-brand-yellow dark:bg-navy-800 dark:text-brand-yellow"
            : "text-slate-600 hover:bg-slate-50 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
        )}
        title={node.label}
      >
        <Icon className="size-[18px]" />
      </Link>
    );
  }

  return (
    <Collapsible.Root defaultOpen={groupHasActive}>
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className={cn(
            "group/trigger w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            groupHasActive
              ? "text-navy-900 dark:text-white"
              : "text-slate-600 hover:bg-slate-50 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
          )}
        >
          <Icon className="size-[18px] flex-shrink-0" />
          <span className="flex-1 text-left truncate">{node.label}</span>
          <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=open]:animate-fade-in">
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => {
            const active = isActiveMatch(activeMatch, child.match);
            return (
              <Link
                key={child.match}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 pl-11 pr-3 py-1.5 rounded-lg text-[13px] transition-colors",
                  active
                    ? "bg-brand-yellow-50 text-brand-yellow-700 font-semibold dark:bg-brand-yellow/10 dark:text-brand-yellow"
                    : "text-slate-600 hover:bg-slate-50 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
                )}
              >
                <span className="flex-1 truncate">{child.label}</span>
                {child.badge && <Badge variant={child.badge.variant}>{child.badge.text}</Badge>}
              </Link>
            );
          })}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
