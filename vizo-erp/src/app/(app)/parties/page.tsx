"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Download, Upload, Phone, Mail, MapPin, AlertCircle, RefreshCw , Loader2} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /parties -> { total, page, pageSize, items }.
   Balances are computed by the API from POSTED ledger rows, so the whole
   journal never has to reach the browser just to add up one column. */
type Party = {
  id: number;
  partyCode: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  legalName: string;
  displayName: string;
  initials: string;
  phone: string | null;
  email: string | null;
  city: string;
  province: string;
  category: string;
  categoryName: string;
  ntn: string | null;
  creditLimit: number;
  creditDays: number;
  creditHoldPolicy: string;
  salesPerson: string | null;
  isActive: boolean;
  createdAt: string;
  rating: string;
  currentBalance: number;
  payableBalance: number;
  lastPurchaseAt: string | null;
  lastSupplyAt: string | null;
  lastPaymentAt: string | null;
};

type PartyPage = { total: number; page: number; pageSize: number; items: Party[] };

const TYPE_LABEL: Record<Party["type"], { label: string; variant: "info" | "warning" | "accent" }> = {
  CUSTOMER: { label: "Customer", variant: "info" },
  SUPPLIER: { label: "Supplier", variant: "warning" },
  BOTH:     { label: "Both",     variant: "accent" },
};

const RATING_COLOR: Record<string, string> = {
  A: "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light",
  B: "bg-info-light text-info-dark dark:bg-info/15 dark:text-info-light",
  C: "bg-warning-light text-warning-dark dark:bg-warning/15 dark:text-warning-light",
  D: "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light",
};

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PartiesPage() {
  const [rows, setRows] = React.useState<Party[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<Party["type"] | "ALL">("ALL");

  const load = React.useCallback(async () => {
    try {
      /* pageSize 200 pulls the whole book in one call; the table paginates in
         the browser. Past a couple of thousand parties this should move to
         server-side paging -- the endpoint already accepts page/pageSize. */
      const res = await axios.get<PartyPage>(`${API_BASE_URL}/parties`, {
        params: { pageSize: 200 },
        headers: authHeader(),
      });
      setRows(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the party list."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    return rows.filter((p) => {
      if (typeFilter !== "ALL" && p.type !== typeFilter && p.type !== "BOTH") return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.legalName.toLowerCase().includes(q) ||
          p.partyCode.toLowerCase().includes(q) ||
          (p.phone ?? "").includes(q) ||
          p.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, typeFilter]);

  const columns: Column<Party>[] = [
    {
      key: "partyCode",
      header: "Code",
      sortable: true,
      cell: (p) => (
        <span className="tabular text-xs font-medium text-slate-600 dark:text-slate-400">
          {p.partyCode}
        </span>
      ),
    },
    {
      key: "legalName",
      header: "Party",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.initials} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-navy-900 dark:text-white">{p.legalName}</div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {p.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" /> {p.phone}
                </span>
              )}
              {p.email && (
                <span className="items-center gap-1 truncate hidden lg:inline-flex">
                  <Mail className="size-3" /> {p.email}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (p) => (
        <Badge variant={TYPE_LABEL[p.type].variant}>{TYPE_LABEL[p.type].label}</Badge>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => (
        <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
          {p.category}
        </span>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <MapPin className="size-3 text-slate-400" />
          {p.city}
        </span>
      ),
    },
    {
      key: "currentBalance",
      header: "Balance",
      sortable: true,
      align: "right",
      cell: (p) => {
        if (p.type === "SUPPLIER") {
          return (
            <span className="tabular text-sm font-semibold text-warning">
              -{formatCompact(p.payableBalance, false)}
            </span>
          );
        }
        const overLimit = p.creditLimit > 0 && p.currentBalance > p.creditLimit;
        return (
          <div className="text-right">
            <div
              className={cn(
                "tabular text-sm font-semibold",
                overLimit ? "text-danger" : "text-navy-900 dark:text-white"
              )}
            >
              {formatCompact(p.currentBalance, false)}
            </div>
            {p.creditLimit > 0 && (
              <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                Limit {formatCompact(p.creditLimit, false)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "rating",
      header: "Rating",
      align: "center",
      cell: (p) => (
        <span
          className={cn(
            "inline-flex items-center justify-center size-7 rounded-md text-xs font-bold",
            RATING_COLOR[p.rating] ?? RATING_COLOR.C
          )}
        >
          {p.rating}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (p) =>
        p.isActive ? (
          <StatusPill variant="success">Active</StatusPill>
        ) : (
          <StatusPill variant="muted">Inactive</StatusPill>
        ),
    },
  ];

  const stats = React.useMemo(() => {
    const customers = rows.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");
    const suppliers = rows.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH");
    return {
      total: rows.length,
      customers: customers.length,
      suppliers: suppliers.length,
      totalAR: customers.reduce((s, p) => s + p.currentBalance, 0),
      totalAP: suppliers.reduce((s, p) => s + p.payableBalance, 0),
    };
  }, [rows]);

  const counts = React.useMemo(
    () => ({
      ALL: rows.length,
      CUSTOMER: rows.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH").length,
      SUPPLIER: rows.filter((p) => p.type === "SUPPLIER" || p.type === "BOTH").length,
      BOTH: rows.filter((p) => p.type === "BOTH").length,
    }),
    [rows]
  );

  /* The Export button used to be a toast. The API builds the workbook from the
     same list query this screen ran, so the file is what is on the page. */
  const [exporting, setExporting] = React.useState(false);

  async function exportXlsx() {
    setExporting(true);
    try {
      await downloadXlsx("parties/export", { q: search || undefined }, "parties.xlsx");
      toast.success("Export ready", { description: "Parties downloaded as a spreadsheet." });
    } catch (e) {
      toast.error("Could not export", { description: await exportError(e) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties" }]}
        title="All Parties"
        subtitle="Customers, suppliers and counter-parties across all locations"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={() => void load()}>
              <RefreshCw />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Upload />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="secondary" size="md" className="gap-1.5" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download />}
              <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export"}</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" asChild>
              <Link href="/parties/new">
                <Plus />
                <span>New Party</span>
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-navy-900 dark:text-white">{error}</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Parties
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
              {stats.total}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Customers
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="text-2xl tabular font-bold text-info mt-1">{stats.customers}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Receivable
          </div>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
              {formatCompact(stats.totalAR)}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Payable
          </div>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <div className="text-2xl tabular font-bold text-warning mt-1">
              {formatCompact(stats.totalAP)}
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-slate-200 dark:border-navy-700">
        {(
          [
            ["ALL", "All Parties"],
            ["CUSTOMER", "Customers"],
            ["SUPPLIER", "Suppliers"],
            ["BOTH", "Both"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key as Party["type"] | "ALL")}
            className={cn(
              "relative inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors -mb-px outline-none",
              typeFilter === key
                ? "text-navy-900 dark:text-white"
                : "text-slate-500 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {label}
            <Badge variant="muted">{counts[key]}</Badge>
            {typeFilter === key && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-brand-yellow rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <FilterBar
        searchPlaceholder="Search by name, code, phone, city…"
        searchValue={search}
        onSearchChange={setSearch}
        chips={
          typeFilter !== "ALL"
            ? [{ key: "type", label: "Type", value: TYPE_LABEL[typeFilter].label }]
            : []
        }
        onRemoveChip={() => setTypeFilter("ALL")}
        onClearAll={() => {
          setTypeFilter("ALL");
          setSearch("");
        }}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowHref={(p) => `/parties/${p.id}`}
            pageSize={10}
          />
        )}
      </Card>
    </>
  );
}
