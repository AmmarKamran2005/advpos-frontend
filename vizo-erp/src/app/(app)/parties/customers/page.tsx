"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Phone, MapPin, AlertTriangle , FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterBar } from "@/components/ui/filter-bar";
import axios from "axios";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /parties?type=customer -> { total, page, pageSize, items }.
   Declared here rather than in a shared module: the brief is that each page
   owns the call it makes, so the shape it depends on lives beside it. */
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

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

import { formatCompact } from "@/lib/format";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<Party[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<PartyPage>(`${API_BASE_URL}/parties`, {
        params: { type: "customer", pageSize: 200 },
        headers: authHeader(),
      });
      setRows(res.data.items);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the customer list."));
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
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (p) =>
        p.legalName.toLowerCase().includes(q) ||
        p.partyCode.toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q)
    );
  }, [rows, search]);

  const totalAR = rows.reduce((s, p) => s + p.currentBalance, 0);
  const overLimit = rows.filter((p) => p.creditLimit > 0 && p.currentBalance > p.creditLimit);

  const columns: Column<Party>[] = [
    {
      key: "legalName",
      header: "Customer",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={p.initials} size="sm" />
          <div>
            <div className="font-medium text-navy-900 dark:text-white">{p.legalName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {p.partyCode} · {p.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      cell: (p) => (
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="inline-flex items-center gap-1.5">
            <Phone className="size-3 text-slate-400" />
            {p.phone ?? "--"}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="size-3 text-slate-400" />
            {p.city}
          </div>
        </div>
      ),
    },
    {
      key: "currentBalance",
      header: "Outstanding",
      align: "right",
      sortable: true,
      cell: (p) => (
        <div className="text-right">
          <div
            className={cn(
              "text-sm tabular font-semibold",
              p.currentBalance > 0 ? "text-navy-900 dark:text-white" : "text-slate-400"
            )}
          >
            {formatCompact(p.currentBalance, false)}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400">
            {p.currentBalance > 0 ? "to collect" : "clear"}
          </div>
        </div>
      ),
    },
    {
      key: "statement",
      header: "",
      align: "right",
      cell: (p) => (
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link href={`/parties/${p.id}/statement`} onClick={(e) => e.stopPropagation()}>
            <FileText /> Statement
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "Customers" }]}
        title="Customers"
        subtitle={`${rows.length} customers across all locations`}
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/parties/new?type=customer">
              <Plus />
              <span>New Customer</span>
            </Link>
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Card>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Active Customers
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {rows.filter((p) => p.isActive).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Total Receivable
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {formatCompact(totalAR)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Over Credit Limit
          </div>
          <div className="text-2xl tabular font-bold text-danger mt-1">{overLimit.length}</div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-warning-dark dark:text-warning-light">
                Action Required
              </div>
              <div className="text-2xl tabular font-bold text-warning-dark dark:text-warning-light mt-1">
                3
              </div>
              <div className="text-xs text-warning-dark/70 dark:text-warning-light/70 mt-1">
                Orders on credit hold
              </div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
      </div>

      <FilterBar
        searchPlaceholder="Search customers by name, code, phone…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={filtered} rowHref={(p) => `/parties/${p.id}`} />
        )}
      </Card>
    </>
  );
}
