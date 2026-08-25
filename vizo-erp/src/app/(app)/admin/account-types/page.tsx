"use client";

import * as React from "react";
import axios from "axios";
import { z } from "zod";
import { Lock, Info, Edit3, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EntityFormDialog } from "@/components/dialogs/entity-form-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /admin/account-types?group=Assets|all */
type AccountType = {
  id: number;
  name: string;
  groupId: number;
  group: string;
  prefix: string;
  codeLength: number;
  normalBalance: "debit" | "credit";
  onBalanceSheet: boolean;
  isSystem: boolean;
  accountCount: number;
  /** Computed by the server — never guessed here. */
  nextCode: string;
};

type AccountTypesResponse = {
  items: AccountType[];
  groupCounts: { group: string; count: number }[];
  total: number;
};

const GROUP_TONE: Record<string, string> = {
  Assets: "text-success",
  Capital: "text-brand-yellow",
  Expenses: "text-danger",
  Liabilities: "text-warning",
  Revenue: "text-info",
};

const Schema = z.object({
  name: z.string().min(2, "Name required").max(60),
  prefix: z.string().min(1, "Prefix required").max(8),
  codeLength: z.coerce.number().int().min(3, "At least 3 digits").max(12, "At most 12 digits"),
  normalBalance: z.enum(["debit", "credit"]),
});
type Form = z.infer<typeof Schema>;

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* EntityFormDialog raises its own success toast the instant onSubmit resolves,
   reading this object at that moment. Writing the server reply here before
   returning gives one save exactly one toast, in the wording the API sent. */
const savedMessage: { title: string; description?: string } = { title: "Account type updated" };

export default function AccountTypesPage() {
  const [group, setGroup] = React.useState<string>("all");
  const [rows, setRows] = React.useState<AccountType[]>([]);
  const [groupCounts, setGroupCounts] = React.useState<{ group: string; count: number }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<AccountType | null>(null);

  /* Refetches whenever the group chip changes — the filtering is the server's
     job, so the browser never holds the rows it is not showing. */
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<AccountTypesResponse>(
        `${API_BASE_URL}/admin/account-types?group=${encodeURIComponent(group)}`,
        { headers: authHeader() }
      );
      setRows(res.data.items ?? []);
      setGroupCounts(res.data.groupCounts ?? []);
    } catch (e) {
      setError(apiMessage(e, "Could not load the account types."));
    } finally {
      setLoading(false);
    }
  }, [group]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /* The "All" chip counts what the server reported per group, so it stays right
     even while a single group is being shown. */
  const allCount = React.useMemo(
    () => groupCounts.reduce((n, g) => n + g.count, 0),
    [groupCounts]
  );

  /* One live example for the explainer, using a code the server computed. */
  const sample = React.useMemo(
    () => rows.find((t) => /receivable/i.test(t.name)) ?? rows[0] ?? null,
    [rows]
  );

  const columns: Column<AccountType>[] = [
    {
      key: "name",
      header: "Type",
      sortable: true,
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-navy-900 dark:text-white">{t.name}</span>
          {t.isSystem && (
            <Lock className="size-3 text-slate-300 dark:text-slate-600" aria-label="Built-in type" />
          )}
        </div>
      ),
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      cell: (t) => (
        <span className={cn("text-xs font-semibold", GROUP_TONE[t.group] ?? "text-slate-600 dark:text-slate-300")}>
          {t.group}
        </span>
      ),
    },
    {
      key: "prefix",
      header: "Code starts with",
      cell: (t) => <span className="tabular text-sm">{t.prefix}</span>,
    },
    {
      key: "nextCode",
      header: "Next code",
      cell: (t) => (
        <span className="tabular text-xs text-slate-500 dark:text-slate-400">{t.nextCode}</span>
      ),
    },
    {
      key: "normalBalance",
      header: "Normal side",
      cell: (t) => (
        <Badge variant={t.normalBalance === "debit" ? "info" : "accent"}>
          {t.normalBalance === "debit" ? "Debit" : "Credit"}
        </Badge>
      ),
    },
    {
      key: "onBalanceSheet",
      header: "Appears on",
      cell: (t) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {t.onBalanceSheet ? "Balance Sheet" : "Income Statement"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (t) => (
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
          <Edit3 />
        </Button>
      ),
    },
  ];

  /* A built-in type cannot change sides — the API refuses it — so the field is
     shown locked rather than offered and rejected. */
  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "prefix", label: "Code starts with", type: "text", required: true, hint: "New account codes are built from this" },
    { name: "codeLength", label: "Code length", type: "number", min: 3, max: 12, hint: "Total characters, prefix included" },
    editing?.isSystem
      ? {
          name: "normalBalance", label: "Normal side", type: "text", disabledOnEdit: true,
          hint: "Built-in types keep their side — the balance sheet and income statement are built from it.",
        }
      : {
          name: "normalBalance", label: "Normal side", type: "select", required: true,
          options: [
            { value: "debit", label: "Debit" },
            { value: "credit", label: "Credit" },
          ],
        },
  ];

  async function submit(data: Form) {
    if (!editing) return;
    try {
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/admin/account-types/${editing.id}`,
        {
          name: data.name,
          prefix: data.prefix,
          codeLength: data.codeLength,
          normalBalance: data.normalBalance,
        },
        { headers: authHeader() }
      );
      savedMessage.title = res.data?.message || "Account type updated";
      savedMessage.description = data.name;
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not save the account type."));
      /* Rethrowing keeps the dialog open with the typed values intact. */
      throw e;
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Account Types" }]}
        title="Account Types"
        subtitle="The categories every account falls into, and the code each one gets."
      />

      <Card className="mb-4">
        <CardBody className="flex items-start gap-3 py-3">
          <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            The prefix decides how new account codes are built — a new customer
            under{" "}
            <span className="tabular font-medium">{sample?.name ?? "Acc Receivables"}</span> becomes{" "}
            <span className="tabular font-medium text-navy-900 dark:text-white">
              {sample?.nextCode ?? "…"}
            </span>
            . Built-in types{" "}
            <Lock className="inline size-3 text-slate-400" /> can be renamed but not
            removed, because the statements are built from them.
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <FilterChip active={group === "all"} onClick={() => setGroup("all")}>
          All ({allCount})
        </FilterChip>
        {groupCounts.map((g) => (
          <FilterChip key={g.group} active={group === g.group} onClick={() => setGroup(g.group)}>
            {g.group} ({g.count})
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load account types"
              description={error}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <DataTable
            columns={columns}
            data={rows}
            pageSize={20}
            emptyState={
              <EmptyState
                icon={Layers}
                title="Nothing in this group"
                description="No account type is filed under this group yet. Pick another chip to see the rest."
              />
            }
          />
        </Card>
      )}

      <EntityFormDialog<Form>
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        mode="edit"
        title="Account Type"
        description={editing?.group ? `${editing.group} · ${editing.accountCount} accounts` : undefined}
        schema={Schema}
        fields={fields}
        defaultValues={{
          name: editing?.name ?? "",
          prefix: editing?.prefix ?? "",
          codeLength: editing?.codeLength ?? 8,
          normalBalance: editing?.normalBalance ?? "debit",
        }}
        onSubmit={submit}
        successMessage={savedMessage}
      />
    </>
  );
}

function FilterChip({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
          : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
      )}
    >
      {children}
    </button>
  );
}
