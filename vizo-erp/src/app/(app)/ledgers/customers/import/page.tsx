"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { downloadXlsx, exportError } from "@/lib/export";
import { apiMessage, ledgerAmount } from "@/components/ledgers/ledger-kit";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   IMPORT CUSTOMERS FROM THE OLD SYSTEM -- three steps.

   1. Download the template (Code, Name, City, Phone, Category, Opening
      Balance -- debit positive -- and Credit Limit).
   2. Upload it. The API reads it and checks EVERY row without writing a
      thing: codes and names already in use or repeated in the file, cities
      and categories it does not know, numbers that are not numbers.
   3. Import the rows that passed. The API checks them again (a preview is
      never trusted) and writes all of them or none.

   The owner supplies the file later; the tool is ready for it.
   ─────────────────────────────────────────────────────────────────────────── */

type PreviewRow = {
  row: number; code: string; name: string; city: string; phone: string; category: string;
  openingBalance: number; creditLimit: number; cityId: number | null; categoryId: number | null;
  errors: string[]; warnings: string[];
};
type Preview = { total: number; ready: number; withErrors: number; openingTotal: number; rows: PreviewRow[] };

export default function ImportCustomersPage() {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [reading, setReading] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [onlyProblems, setOnlyProblems] = React.useState(false);

  async function template() {
    try {
      await downloadXlsx("ledgers/customers/import/template", {}, "customer-import-template.xlsx");
    } catch (e) {
      toast.error("Could not download the template", { description: await exportError(e) });
    }
  }

  async function upload(file: File) {
    setFileName(file.name);
    setReading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post<Preview>(`${API_BASE_URL}/ledgers/customers/import/preview`, form, { headers: authHeader() });
      setPreview(res.data);
      setOnlyProblems(res.data.withErrors > 0);
    } catch (e) {
      toast.error("Could not read the file", { description: apiMessage(e, "Please try again.") });
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function commit() {
    if (!preview) return;
    const good = preview.rows.filter((r) => r.errors.length === 0);
    if (good.length === 0) return;
    setCommitting(true);
    try {
      const res = await axios.post<{ created: number; message: string }>(`${API_BASE_URL}/ledgers/customers/import/commit`, {
        rows: good.map((r) => ({
          row: r.row, code: r.code, name: r.name, city: r.city, phone: r.phone, category: r.category,
          openingBalance: String(r.openingBalance), creditLimit: String(r.creditLimit),
        })),
      }, { headers: authHeader() });
      toast.success("Imported", { description: res.data.message });
      router.push("/ledgers/customers");
    } catch (e) {
      toast.error("Nothing was imported", { description: apiMessage(e, "Please try again.") });
    } finally {
      setCommitting(false);
    }
  }

  const rows = preview ? (onlyProblems ? preview.rows.filter((r) => r.errors.length > 0) : preview.rows) : [];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Customer Ledgers", href: "/ledgers/customers" }, { label: "Import" }]}
        title="Import customers"
        subtitle="Accounts and opening balances from the old system, from an Excel sheet."
        actions={<Button variant="ghost" size="md" className="gap-1.5" asChild><Link href="/ledgers/customers"><ArrowLeft />Back</Link></Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Step n={1} title="Get the template" done={false}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Code, Name, City, Phone, Category, Opening Balance (owed to us is positive), Credit Limit.
          </p>
          <Button variant="secondary" size="md" className="gap-1.5 w-full" onClick={() => void template()}>
            <Download /> Download template
          </Button>
        </Step>
        <Step n={2} title="Upload the filled sheet" done={!!preview}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
            {fileName ?? "Only .xlsx. Nothing is saved at this step -- every row is checked first."}
          </p>
          <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <Button variant="accent" size="md" className="gap-1.5 w-full" disabled={reading} onClick={() => input.current?.click()}>
            {reading ? <Loader2 className="animate-spin" /> : <Upload />} {preview ? "Upload another" : "Choose file"}
          </Button>
        </Step>
        <Step n={3} title="Import" done={false}>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            {preview
              ? `${preview.ready} of ${preview.total} rows ready, opening balances ${formatMoney(preview.openingTotal)}.`
              : "The rows that pass are written together, or none are."}
          </p>
          <Button variant="primary" size="md" className="gap-1.5 w-full" disabled={!preview || preview.ready === 0 || committing}
            onClick={() => void commit()}>
            {committing ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
            {preview ? `Import ${preview.ready} account${preview.ready === 1 ? "" : "s"}` : "Import"}
          </Button>
        </Step>
      </div>

      {preview && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-navy-700">
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-success font-semibold"><CheckCircle2 className="size-4" />{preview.ready} ready</span>
              <span className={cn("inline-flex items-center gap-1 font-semibold", preview.withErrors ? "text-danger" : "text-slate-400")}>
                <XCircle className="size-4" />{preview.withErrors} with problems
              </span>
            </div>
            <label className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
              Problems only
            </label>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-navy-700/60 max-h-[65vh] overflow-y-auto scrollbar-thin">
            {rows.map((r) => (
              <li key={r.row} className={cn("px-4 py-2.5", r.errors.length > 0 && "bg-danger/5")}>
                <div className="flex items-start gap-3">
                  <span className="text-2xs tabular text-slate-400 w-10 shrink-0 pt-0.5">#{r.row}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs tabular font-semibold text-slate-500">{r.code || "—"}</span>
                      <span className="text-sm font-medium text-navy-900 dark:text-white">{r.name || "(no name)"}</span>
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {[r.city, r.category, r.phone].filter(Boolean).join(" · ")}
                    </div>
                    {r.errors.map((m, i) => <div key={i} className="text-2xs text-danger mt-0.5 flex gap-1"><XCircle className="size-3 shrink-0 mt-px" />{m}</div>)}
                    {r.warnings.map((m, i) => <div key={i} className="text-2xs text-warning-dark dark:text-warning-light mt-0.5 flex gap-1"><AlertTriangle className="size-3 shrink-0 mt-px" />{m}</div>)}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{ledgerAmount(r.openingBalance, "0")}</div>
                    <div className="text-2xs text-slate-400 tabular">{r.creditLimit > 0 ? `limit ${ledgerAmount(r.creditLimit)}` : "no limit"}</div>
                  </div>
                </div>
              </li>
            ))}
            {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No problems -- every row is ready.</li>}
          </ul>
        </Card>
      )}
    </>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("size-6 rounded-full inline-flex items-center justify-center text-xs font-bold",
            done ? "bg-success text-white" : "bg-brand-yellow text-navy-900")}>
            {done ? <CheckCircle2 className="size-4" /> : n}
          </span>
          <span className="text-sm font-semibold text-navy-900 dark:text-white">{title}</span>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}
