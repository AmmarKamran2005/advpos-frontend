"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { CommandPalette } from "./command-palette";
import { ShortcutSheet } from "./shortcut-sheet";
import { SessionProvider, useSession } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";

const SIDEBAR_COLLAPSED_KEY = "vizo-sidebar-collapsed";

/* Read through useSyncExternalStore, not an effect, so the collapsed state is
   correct on the very first client render instead of flashing expanded. */
function subscribeToCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function getCollapsedSnapshot() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}
function getCollapsedServerSnapshot() {
  return false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const storedCollapsed = React.useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );
  const [override, setOverride] = React.useState<boolean | null>(null);
  const collapsed = override ?? storedCollapsed;
  const [mobileOpen, setMobileOpen] = React.useState(false);

  /* Close mobile sidebar on route navigation */
  React.useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setOverride(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  }

  return (
    <SessionProvider>
      <ShellBody
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      >
        {children}
      </ShellBody>
    </SessionProvider>
  );
}

/**
 * Sits inside the provider so it can wait for the session before painting.
 * Without this every consumer would have to defend against a null user for
 * the few milliseconds before /auth/me answers.
 */
function ShellBody({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  setMobileOpen,
  children,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { user, status } = useSession();

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-slate-300 dark:border-navy-700 border-t-brand-yellow rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {status === "unauthenticated" ? "Taking you to sign in…" : "Loading your workspace…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full">{children}</div>
        </main>
      </div>
      <CommandPalette />
      <ShortcutSheet />
      <Toaster />
    </div>
  );
}
