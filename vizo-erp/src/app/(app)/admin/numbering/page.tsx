"use client";

import * as React from "react";
import axios from "axios";
import { Hash, Save, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /admin/document-series */
type DocumentSeries = {
  id: number;
  key: string;
  label: string;
  prefix: string;
  includeYear: boolean;
  padding: number;
  nextNumber: number;
};

type SeriesResponse = { items: DocumentSeries[]; yearSuffix: number };

/* The server rejects anything outside these, so the inputs never let the grid
   leave them either. */
const MIN_PADDING = 2;
const MAX_PADDING = 8;

/** Number(e.target.value) is NaN on an emptied field — never let that through. */
function clampInt(value: string | number, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** `includeYear ? PREFIX-YY-0001 : PREFIX-0001`, using the server year suffix. */
function preview(s: DocumentSeries, yearSuffix: number) {
  const digits = clampInt(s.padding, MIN_PADDING, MIN_PADDING, MAX_PADDING);
  const body = String(Math.max(1, Math.trunc(s.nextNumber) || 1)).padStart(digits, "0");
  const year = String(yearSuffix).padStart(2, "0");
  return s.includeYear ? `${s.prefix}-${year}-${body}` : `${s.prefix}-${body}`;
}

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function NumberingPage() {
  const [rows, setRows] = React.useState<DocumentSeries[]>([]);
  const [yearSuffix, setYearSuffix] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<SeriesResponse>(`${API_BASE_URL}/admin/document-series`, {
        headers: authHeader(),
      });
      setRows(res.data.items ?? []);
      setError(null);
      setYearSuffix(res.data.yearSuffix ?? 0);
      setDirty(false);
    } catch (e) {
      setError(apiMessage(e, "Could not load the numbering."));
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

  function update(id: number, patch: Partial<DocumentSeries>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  /* Discard means "go back to what the server holds", not "go back to the
     values this tab happened to start with". */
  async function reset() {
    await load();
    toast.info("Changes discarded");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await axios.put<{ message: string }>(
        `${API_BASE_URL}/admin/document-series`,
        rows.map((s) => ({
          id: s.id,
          prefix: s.prefix.trim().toUpperCase(),
          includeYear: s.includeYear,
          padding: clampInt(s.padding, MIN_PADDING, MIN_PADDING, MAX_PADDING),
          nextNumber: Math.max(1, Math.trunc(s.nextNumber) || 1),
        })),
        { headers: authHeader() }
      );
      toast.success(res.data?.message || "Numbering saved", {
        description: "New documents will use these formats.",
      });
      setDirty(false);
      await load();
    } catch (e) {
      /* Duplicate prefix, padding out of range, nextNumber below 1 — the API
         says which one, so pass it straight on. */
      toast.error(apiMessage(e, "Could not save the numbering."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Numbering" }]}
        title="Document Numbering"
        subtitle="How each document gets its number. Changing a prefix only affects new documents."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void reset()}
              disabled={!dirty || saving}>
              <RotateCcw />
              <span className="hidden sm:inline">Discard</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()}
              disabled={!dirty || saving}>
              <Save />
              <span>{saving ? "Saving…" : "Save"}</span>
            </Button>
          </>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load numbering"
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
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Hash}
              title="No document series"
              description="Nothing is set up to be numbered yet. Once the document types exist, their prefixes appear here."
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-700 text-left">
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400">Document</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-32">Prefix</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-28">Year in no.</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-28">Digits</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 w-32">Next number</th>
                    <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-slate-400">Looks like</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-navy-800/50">
                      <td className="px-4 py-2.5 font-medium text-navy-900 dark:text-white whitespace-nowrap">
                        {s.label}
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          value={s.prefix}
                          onChange={(e) => update(s.id, { prefix: e.target.value.toUpperCase() })}
                          className="h-8 tabular uppercase"
                          maxLength={6}
                          disabled={saving}
                          aria-label={`${s.label} prefix`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Switch
                          checked={s.includeYear}
                          onCheckedChange={(v) => update(s.id, { includeYear: v })}
                          disabled={saving}
                          aria-label={`Include year in ${s.label} number`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={MIN_PADDING}
                          max={MAX_PADDING}
                          value={s.padding}
                          onChange={(e) =>
                            update(s.id, {
                              padding: clampInt(e.target.value, s.padding, MIN_PADDING, MAX_PADDING),
                            })
                          }
                          className="h-8 tabular"
                          disabled={saving}
                          aria-label={`${s.label} digits`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input
                          type="number"
                          min={1}
                          value={s.nextNumber}
                          onChange={(e) =>
                            update(s.id, {
                              nextNumber: clampInt(e.target.value, s.nextNumber, 1, Number.MAX_SAFE_INTEGER),
                            })
                          }
                          className="h-8 tabular"
                          disabled={saving}
                          aria-label={`${s.label} next number`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-navy-800 tabular text-xs font-semibold text-navy-900 dark:text-white">
                          <Hash className="size-3 text-slate-400" />
                          {preview(s, yearSuffix)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        The year comes from the financial year, which starts in October — documents
        raised now carry <span className="tabular">{String(yearSuffix).padStart(2, "0")}</span>.
      </p>
    </>
  );
}
