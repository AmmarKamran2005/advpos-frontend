"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Building2,
  ChevronDown,
  Search,
  Plus,
  Sparkles,
  Bell,
  User,
  Settings,
  Lock,
  LogOut,
  ShoppingCart,
  FileText,
  Truck,
  Package,
  Banknote,
  UserPlus,
  Box,
  Check,
  AlertTriangle,
  Clock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown";
import { branches, currentUser, notifications, quickCreate } from "@/data/mock";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shopping-cart": ShoppingCart,
  "file-text": FileText,
  truck: Truck,
  package: Package,
  banknote: Banknote,
  "user-plus": UserPlus,
  box: Box,
  check: Check,
  "alert-triangle": AlertTriangle,
  clock: Clock,
  database: Database,
};

const NOTIF_COLOR: Record<string, string> = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-danger bg-danger/10",
  info: "text-info bg-info/10",
};

export function TopBar({
  onOpenSidebar,
  onOpenAI,
}: {
  onOpenSidebar: () => void;
  onOpenAI: () => void;
}) {
  const [activeBranchId, setActiveBranchId] = React.useState(currentUser.branchId);
  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-navy-950 border-b border-slate-200 dark:border-navy-800 flex items-center px-3 sm:px-4 gap-2 flex-shrink-0">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" onClick={onOpenSidebar} className="lg:hidden">
        <Menu />
      </Button>

      {/* Branch switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors outline-none"
          >
            <Building2 className="size-4 text-brand-yellow" />
            <div className="text-left hidden sm:block">
              <div className="text-2xs text-slate-500 dark:text-slate-400 leading-none">
                Branch
              </div>
              <div className="text-sm font-semibold text-navy-900 dark:text-white leading-tight">
                {activeBranch?.name ?? "Select"}
              </div>
            </div>
            <ChevronDown className="size-3 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Switch Branch</DropdownMenuLabel>
          {branches.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => setActiveBranchId(b.id)}
              className="flex-col items-start gap-0.5"
            >
              <div className="flex items-center w-full">
                <span
                  className={cn(
                    "flex-1 truncate",
                    b.id === activeBranchId &&
                      "text-brand-yellow font-semibold"
                  )}
                >
                  {b.name}
                </span>
                {b.id === activeBranchId && (
                  <Check className="size-3.5 text-brand-yellow" />
                )}
              </div>
              <span className="text-2xs text-slate-500 dark:text-slate-400">
                {b.city}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-3 relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search anything…"
          className="pl-9 pr-16 bg-slate-50 dark:bg-navy-900 border-transparent focus:bg-white dark:focus:bg-navy-800"
        />
        <kbd className="hidden lg:flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-2xs bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded font-mono text-slate-500 dark:text-slate-400">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1 lg:hidden" />

      {/* Action cluster */}
      <div className="flex items-center gap-1">
        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="accent" size="sm" className="gap-1.5 hidden sm:inline-flex">
              <Plus />
              <span>Create</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden text-brand-yellow">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
            {quickCreate.map((qc) => {
              const Icon = ICON_MAP[qc.icon] ?? Plus;
              return (
                <DropdownMenuItem key={qc.label} asChild>
                  <Link href={qc.href}>
                    <Icon />
                    <span className="flex-1">{qc.label}</span>
                    <DropdownMenuShortcut>⌘{qc.shortcut}</DropdownMenuShortcut>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Assistant */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenAI}
          title="AI Assistant"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="text-brand-yellow" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Notifications"
              aria-label="Notifications"
              className="relative"
            >
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 bg-danger rounded-full ring-2 ring-white dark:ring-navy-950" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 p-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">
                Notifications
              </div>
              <button className="text-xs text-brand-yellow hover:underline font-medium">
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.icon] ?? Bell;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer transition-colors",
                      n.unread && "bg-brand-yellow-50/50 dark:bg-brand-yellow/5"
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center flex-shrink-0",
                        NOTIF_COLOR[n.type]
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {n.body}
                      </div>
                      <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {n.time}
                      </div>
                    </div>
                    {n.unread && (
                      <span className="size-2 rounded-full bg-brand-yellow flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
            <Link
              href="/notifications/sms"
              className="block px-4 py-3 text-sm text-center text-brand-yellow hover:bg-slate-50 dark:hover:bg-navy-700 font-medium border-t border-slate-200 dark:border-navy-700"
            >
              View all notifications
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors outline-none"
            >
              <Avatar initials={currentUser.initials} size="md" />
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-navy-900 dark:text-white leading-none">
                  {currentUser.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="size-3 text-slate-400 hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-3 border-b border-slate-200 dark:border-navy-700">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">
                {currentUser.fullName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.email}
              </div>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile/preferences">
                <Settings /> Preferences
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile/security">
                <Lock /> Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className="focus:bg-danger/10 focus:text-danger [&_svg]:text-danger"
            >
              <Link href="/login">
                <LogOut /> Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
