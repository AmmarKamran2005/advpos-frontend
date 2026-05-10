"use client";

import * as React from "react";
import { Calendar, Download, Printer, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { branchesAdmin } from "@/data/admin";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DateMode = "asOf" | "range";

export interface ReportToolbarProps {
  mode: DateMode;
  reportName: string;
  /** As-of date — for snapshot reports (TB, BS) */
  asOfDate?: string;
  onAsOfChange?: (date: string) => void;
  /** Date range — for period reports (P&L, CF, GL) */
  fromDate?: string;
  toDate?: string;
  onRangeChange?: (from: string, to: string) => void;
  /** Branch selector */
  branchId?: number | null;
  onBranchChange?: (id: number | null) => void;
}

const PRESETS = [
  { label: "Today",         daysFrom: 0,   daysTo: 0   },
  { label: "Yesterday",     daysFrom: 1,   daysTo: 1   },
  { label: "Last 7 days",   daysFrom: 6,   daysTo: 0   },
  { label: "This month",    daysFrom: -1,  daysTo: 0, monthStart: true },
  { label: "Last month",    daysFrom: -2,  daysTo: -1, lastMonth: true },
  { label: "Last 30 days",  daysFrom: 29,  daysTo: 0   },
  { label: "Last 90 days",  daysFrom: 89,  daysTo: 0   },
  { label: "This year (YTD)", daysFrom: 0, daysTo: 0, ytd: true },
];

function applyPreset(preset: typeof PRESETS[number]): { from: string; to: string } {
  const today = new Date();
  if (preset.ytd) {
    return { from: `${today.getFullYear()}-01-01`, to: today.toISOString().slice(0, 10) };
  }
  if (preset.monthStart) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: start.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset.lastMonth) {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end   = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }
  const from = new Date(today); from.setDate(today.getDate() - preset.daysFrom);
  const to   = new Date(today); to.setDate(today.getDate() - preset.daysTo);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function ReportToolbar({
  mode, reportName, asOfDate, onAsOfChange, fromDate, toDate, onRangeChange, branchId, onBranchChange,
}: ReportToolbarProps) {
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [branchOpen, setBranchOpen] = React.useState(false);

  const [tempAsOf, setTempAsOf] = React.useState(asOfDate ?? "");
  const [tempFrom, setTempFrom] = React.useState(fromDate ?? "");
  const [tempTo,   setTempTo]   = React.useState(toDate   ?? "");

  React.useEffect(() => { setTempAsOf(asOfDate ?? ""); }, [asOfDate]);
  React.useEffect(() => { setTempFrom(fromDate ?? ""); }, [fromDate]);
  React.useEffect(() => { setTempTo(toDate     ?? ""); }, [toDate]);

  const branch = branchId ? branchesAdmin.find((b) => b.id === branchId) : null;

  function applyDate() {
    if (mode === "asOf") onAsOfChange?.(tempAsOf);
    else onRangeChange?.(tempFrom, tempTo);
    setDatePickerOpen(false);
    toast.success("Filters applied", { description: `${reportName} updated.` });
  }

  function handleExport(format: "PDF" | "Excel" | "CSV") {
    toast.success(`Exporting ${format}…`, { description: `${reportName} will be ready in a few seconds.` });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date selector */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="md" className="gap-1.5">
            <Calendar />
            {mode === "asOf"
              ? <>As of <span className="font-semibold ml-1">{asOfDate ? formatDate(asOfDate) : "Today"}</span></>
              : <>{fromDate && toDate ? `${formatDate(fromDate)} – ${formatDate(toDate)}` : "Pick range"}</>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <h4 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">{mode === "asOf" ? "As of date" : "Date range"}</h4>

          {mode === "asOf" ? (
            <div>
              <Label htmlFor="asof">Date</Label>
              <Input id="asof" type="date" value={tempAsOf} onChange={(e) => setTempAsOf(e.target.value)} className="mt-1.5" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { const { from, to } = applyPreset(p); setTempFrom(from); setTempTo(to); }}
                    className="text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-navy-700">
                <div>
                  <Label htmlFor="from" className="text-xs">From</Label>
                  <Input id="from" type="date" value={tempFrom} onChange={(e) => setTempFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="to" className="text-xs">To</Label>
                  <Input id="to" type="date" value={tempTo} onChange={(e) => setTempTo(e.target.value)} className="mt-1" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-navy-700">
            <Button variant="ghost" size="sm" onClick={() => setDatePickerOpen(false)}>Cancel</Button>
            <Button variant="accent" size="sm" onClick={applyDate}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Branch selector */}
      {onBranchChange && (
        <Popover open={branchOpen} onOpenChange={setBranchOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="md" className="gap-1.5">
              <Building2 />
              {branch ? branch.name : "All Branches"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="px-3 py-2 text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-navy-700">Branch</div>
            <button
              onClick={() => { onBranchChange?.(null); setBranchOpen(false); toast.success("Showing all branches (consolidated)"); }}
              className={cn("w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700",
                !branchId && "text-brand-yellow font-semibold"
              )}
            >
              <span>All Branches (consolidated)</span>
              {!branchId && <Check className="size-3.5 text-brand-yellow" />}
            </button>
            <div className="border-t border-slate-100 dark:border-navy-700">
              {branchesAdmin.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { onBranchChange?.(b.id); setBranchOpen(false); toast.success(`Filtered to ${b.name}`); }}
                  className={cn("w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700",
                    b.id === branchId && "text-brand-yellow font-semibold"
                  )}
                >
                  <div>
                    <div>{b.name}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 tabular">{b.code}</div>
                  </div>
                  {b.id === branchId && <Check className="size-3.5 text-brand-yellow" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Print */}
      <Button variant="secondary" size="md" className="gap-1.5" onClick={() => { window.print(); toast.info("Print dialog opened"); }}>
        <Printer />
        <span className="hidden sm:inline">Print</span>
      </Button>

      {/* Export */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="md" className="gap-1.5">
            <Download />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <button onClick={() => handleExport("PDF")}   className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700 rounded-md text-slate-700 dark:text-slate-200">📄 PDF</button>
          <button onClick={() => handleExport("Excel")} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700 rounded-md text-slate-700 dark:text-slate-200">📊 Excel (.xlsx)</button>
          <button onClick={() => handleExport("CSV")}   className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700 rounded-md text-slate-700 dark:text-slate-200">📑 CSV</button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
