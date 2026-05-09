"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { AIDrawer } from "./ai-drawer";
import { CommandPalette } from "./command-palette";
import { Toaster } from "@/components/ui/toaster";

const SIDEBAR_COLLAPSED_KEY = "vizo-sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [aiOpen, setAIOpen] = React.useState(false);

  /* Restore collapsed state from localStorage */
  React.useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  /* Close mobile sidebar on route navigation */
  React.useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 flex">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenSidebar={() => setMobileOpen(true)}
          onOpenAI={() => setAIOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
      <AIDrawer open={aiOpen} onOpenChange={setAIOpen} />
      <CommandPalette />
      <Toaster />
    </div>
  );
}
