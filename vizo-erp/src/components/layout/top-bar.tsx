"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  ChevronDown,
  Search,
  Plus,
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
  Send,
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
import { quickCreate } from "@/data/mock";
import axios from "axios";
import {
  useSession,
  API_BASE_URL,
  authHeader,
} from "@/components/providers/session-provider";
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
  send: Send,
};

const NOTIF_COLOR: Record<string, string> = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-danger bg-danger/10",
  info: "text-info bg-info/10",
  muted: "text-slate-500 bg-slate-500/10",
};

type Notification = {
  id: number;
  severity: string;
  icon: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};

/** "2 minutes ago" from a timestamp, so the API can send a real one. */
function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function TopBar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, can, logout } = useSession();

  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await axios.get<{ items: Notification[]; unread: number }>(
        `${API_BASE_URL}/notification`,
        { headers: authHeader() }
      );
      setNotifications(res.data.items);
      setUnreadCount(res.data.unread);
    } catch {
      /* The bell is not worth an error banner across the whole app. */
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void loadNotifications();
  }, [user, loadNotifications]);

  async function markAllRead() {
    try {
      await axios.post(`${API_BASE_URL}/notification/read-all`, {}, { headers: authHeader() });
      await loadNotifications();
    } catch {
      /* ignored */
    }
  }

  async function markRead(id: number) {
    try {
      await axios.post(`${API_BASE_URL}/notification/${id}/read`, {}, { headers: authHeader() });
      await loadNotifications();
    } catch {
      /* ignored */
    }
  }

  /* Every hook above this line: the shell resolves the session before mounting
     this, so the guard is for the type checker, not for runtime. */
  if (!user) return null;

  const visibleQuickCreate = quickCreate.filter((qc) => can(qc.perm));


  function formatDate(isoString: string) {
  if (!isoString) return "";

  // Trim extra microsecond digits to standard 3-digit milliseconds
  let safeIso = isoString.replace(/(\.\d{3})\d+/, "$1");

  // Agar timezone info nahi hai, backend UTC bhej raha hai to Z add kardo
  if (!/Z$|[+-]\d\d:\d\d$/.test(safeIso)) {
    safeIso += "Z";
  }

  const date = new Date(safeIso);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

  return (
    <header className="sticky top-0 z-20 h-16 bg-white dark:bg-navy-950 border-b border-slate-200 dark:border-navy-800 flex items-center px-3 sm:px-4 gap-2 flex-shrink-0">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" onClick={onOpenSidebar} className="lg:hidden">
        <Menu />
      </Button>

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

      <div className="flex-1" />

      {/* Action cluster */}
      <div className="flex items-center gap-1 ml-auto">
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
            {visibleQuickCreate.map((qc) => {
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
              <button
                type="button"
                onClick={() => { void markAllRead(); }}
                disabled={unreadCount === 0}
                className="text-xs text-brand-yellow hover:underline font-medium disabled:opacity-40 disabled:no-underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  Nothing to catch up on.
                </div>
              )}
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.icon] ?? Bell;
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (!n.isRead) void markRead(n.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !n.isRead) void markRead(n.id); }}
                    className={cn(
                      "flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer transition-colors",
                      !n.isRead && "bg-brand-yellow-50/50 dark:bg-brand-yellow/5"
                    )}
                  >
                    <div
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center flex-shrink-0",
                        NOTIF_COLOR[n.severity] ?? NOTIF_COLOR.info
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
                        {formatDate(n.createdAt)}
                      </div>
                    </div>
                    {!n.isRead && (
                      <span className="size-2 rounded-full bg-brand-yellow flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 text-2xs text-center text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-navy-700">
              You&rsquo;re all caught up
            </div>
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
              <Avatar initials={user.initials} size="md" />
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-navy-900 dark:text-white leading-none">
                  {user.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  {user.roleLabel}
                </div>
              </div>
              <ChevronDown className="size-3 text-slate-400 hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-3 border-b border-slate-200 dark:border-navy-700">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">
                {user.fullName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {user.email}
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
              onClick={() => { void logout(); }}
              className="focus:bg-danger/10 focus:text-danger [&_svg]:text-danger"
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
