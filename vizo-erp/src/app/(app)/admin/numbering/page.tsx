"use client";

import * as React from "react";
import { Hash, Save, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { documentSeries, formatDocNumber, type DocumentSeries } from "@/data/settings";

export default function NumberingPage() {
  const [rows, setRows] = React.useState<DocumentSeries[]>(() =>
    documentSeries.map((s) => ({ ...s }))
  );
  const [dirty, setDirty] = React.useState(false);

  function update(id: number, patch: Partial<DocumentSeries>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function reset() {
    setRows(documentSeries.map((s) => ({ ...s })));
    setDirty(false);
    toast.info("Changes discarded");
  }

  function save() {
    setDirty(false);
    toast.success("Numbering saved", {
      description: "New documents will use these formats.",
    });
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Numbering" }]}
        title="Document Numbering"
        subtitle="How each document gets its number. Changing a prefix only affects new documents."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" onClick={reset} disabled={!dirty}>
              <RotateCcw />
              <span className="hidden sm:inline">Discard</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={save} disabled={!dirty}>
              <Save />
              <span>Save</span>
            </Button>
          </>
        }
      />

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
                        aria-label={`${s.label} prefix`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Switch
                        checked={s.includeYear}
                        onCheckedChange={(v) => update(s.id, { includeYear: v })}
                        aria-label={`Include year in ${s.label} number`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={2}
                        max={8}
                        value={s.padding}
                        onChange={(e) => update(s.id, { padding: Number(e.target.value) })}
                        className="h-8 tabular"
                        aria-label={`${s.label} digits`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={1}
                        value={s.nextNumber}
                        onChange={(e) => update(s.id, { nextNumber: Number(e.target.value) })}
                        className="h-8 tabular"
                        aria-label={`${s.label} next number`}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-navy-800 tabular text-xs font-semibold text-navy-900 dark:text-white">
                        <Hash className="size-3 text-slate-400" />
                        {formatDocNumber(s)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        The year comes from the financial year, which starts in October — a
        document raised in November 2026 carries <span className="tabular">27</span>.
      </p>
    </>
  );
}
