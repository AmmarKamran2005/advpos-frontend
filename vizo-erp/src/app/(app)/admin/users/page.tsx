"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Plus,
  Lock,
  Unlock,
  MoreHorizontal,
  AlertCircle,
  Users,
  Edit3,
  Check,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatRelative } from "@/lib/format";

/* ── shapes returned by GET /admin/users and /admin/users/stats ─────────── */

type UserRow = {
  id: number;
  fullName: string;
  initials: string;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  roleId: number;
  roles: string[];
  locations: string[];
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UsersResponse = { items: UserRow[]; total: number; page: number; pageSize: number };
type UserStats = { total: number; active: number; locked: number };

const PAGE_SIZE = 15;

/** Pull `{ message }` off an axios error, or say the server is unreachable. */
function apiMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return (err.response.data as { message?: string } | undefined)?.message ?? fallback;
    }
    return "Cannot reach the server.";
  }
  return fallback;
}

export default function UsersPage() {
  const router = useRouter();

  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState<UserStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* The search box drives ?q= on the server, so hold the keystrokes back for
     a moment instead of firing a request per character. */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* `silent` keeps the table on screen while a refresh after a mutation runs —
     swapping it for a skeleton on every toggle reads as a slow screen. */
  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [list, counts] = await Promise.all([
        axios.get<UsersResponse>(`${API_BASE_URL}/admin/users`, {
          params: { q: query, page, pageSize: PAGE_SIZE },
          headers: authHeader(),
        }),
        axios.get<UserStats>(`${API_BASE_URL}/admin/users/stats`, {
          headers: authHeader(),
        }),
      ]);
      setRows(list.data.items ?? []);
      setTotal(list.data.total ?? 0);
      setStats(counts.data);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setStats(null);
      setError(apiMessage(err, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  async function patchFlag(id: number, field: "active" | "lock", value: boolean) {
    try {
      const res = await axios.patch<{ message?: string }>(
        `${API_BASE_URL}/admin/users/${id}/${field}`,
        { value },
        { headers: authHeader() }
      );
      toast.success(res.data?.message ?? "Saved.");
      await load(true);
    } catch (err) {
      toast.error(apiMessage(err, "Could not save that change."));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  const columns: Column<UserRow>[] = [
    {
      key: "fullName",
      header: "User",
      sortable: true,
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={u.initials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white inline-flex items-center gap-2">
              {u.fullName}
              {u.isLocked && <Lock className="size-3 text-danger" />}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{u.email ?? "—"}</div>
          </div>
        </div>
      ),
    },
    { key: "employeeCode", header: "Emp #", cell: (u) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{u.employeeCode ?? "—"}</span> },
    { key: "phone",        header: "Phone", cell: (u) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{u.phone ?? "—"}</span> },
    {
      key: "roles",
      header: "Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => <Badge key={r} variant="info">{r}</Badge>)}
        </div>
      ),
    },
    {
      key: "locations",
      header: "Locations",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.locations.map((b) => <Badge key={b} variant="muted">{b}</Badge>)}
        </div>
      ),
    },
    { key: "lastLoginAt", header: "Last Login", cell: (u) => <span className="text-xs text-slate-500 dark:text-slate-400">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"}</span> },
    { key: "isActive",    header: "Status",     cell: (u) => u.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill> },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "56px",
      cell: (u) => (
        /* Rows navigate on click, so the menu has to swallow its own clicks.
           The menu itself is portalled, so only the trigger needs this. */
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.fullName}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void patchFlag(u.id, "active", !u.isActive)}>
                {u.isActive ? <Ban /> : <Check />}
                {u.isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void patchFlag(u.id, "lock", !u.isLocked)}>
                {u.isLocked ? <Unlock /> : <Lock />}
                {u.isLocked ? "Unlock account" : "Lock account"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push(`/admin/users/new?id=${u.id}`)}>
                <Edit3 />
                Edit user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const subtitle = stats
    ? `${stats.total} users · ${stats.active} active · ${stats.locked} locked`
    : "Loading counts…";

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        title="Users"
        subtitle={subtitle}
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/admin/users/new">
              <Plus />
              <span>New User</span>
            </Link>
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search by name, email, employee code…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={AlertCircle}
            title="Could not load users"
            description={error}
            action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Only this page's rows are handed over, and pageSize matches, so the
              table never paginates a second time on top of the server. */}
          <DataTable
            columns={columns}
            data={rows}
            rowHref={(u) => `/admin/users/${u.id}`}
            pageSize={PAGE_SIZE}
            emptyState={
              <EmptyState
                icon={Users}
                title={query ? "No users match that search" : "No users yet"}
                description={
                  query
                    ? "Try a different name, email or employee code."
                    : "Add your first team member to get started."
                }
                action={
                  query ? (
                    <Button variant="secondary" onClick={() => setSearch("")}>Clear search</Button>
                  ) : (
                    <Button variant="accent" asChild><Link href="/admin/users/new"><Plus />New User</Link></Button>
                  )
                }
              />
            }
          />

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="tabular font-semibold text-navy-900 dark:text-white">{firstRow}</span>{" "}
                –{" "}
                <span className="tabular font-semibold text-navy-900 dark:text-white">{lastRow}</span>{" "}
                of{" "}
                <span className="tabular font-semibold text-navy-900 dark:text-white">{total}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" disabled={page === 1} onClick={() => setPage(1)} aria-label="First page">
                  <ChevronsLeft />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft />
                </Button>
                <span className="text-xs px-2 text-slate-600 dark:text-slate-300">
                  Page <span className="font-semibold text-navy-900 dark:text-white tabular">{page}</span> of{" "}
                  <span className="font-semibold text-navy-900 dark:text-white tabular">{totalPages}</span>
                </span>
                <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <ChevronRight />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">
                  <ChevronsRight />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
