"use client";

import * as React from "react";
import { Calendar, Download, Printer, MapPin, Check, CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /parties/lookups -> locations. The list used to come from
   activeLocations() in src/data/settings, a hard-coded array, so a location
   added at /admin/locations never appeared in any report filter. Every report
   screen shares this widget, so it is fetched here once per mount rather than
   threaded through eight pages as a prop. */
type ToolbarLocation = { id: number; code: string; name: string };

export type DateMode = "asOf" | "range";

/**
 * Which document the API should render, and under which controller.
 *
 *   report      GET/POST /reports/{key}/pdf      the six operational reports
 *   statement   GET/POST /accounting/{key}/pdf   the five financial statements
 *
 * A screen that passes neither has no PDF on the API yet -- its Print button
 * falls back to the browser's own print dialog and the Export menu is hidden,
 * rather than offering an export that would produce nothing. That was the old
 * behaviour of this menu on EVERY screen: "Export PDF" showed a toast reading
 * "will be ready in a few seconds" and generated nothing, ever.
 */
export type ReportDoc = { family: "report" | "statement"; key: string };

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
  /** Location selector */
  locationId?: number | null;
  onLocationChange?: (id: number | null) => void;
  /** Which PDF the API should build for this screen. Omit if it has none. */
  doc?: ReportDoc;
  /** Extra query the report needs -- days, minCoverDays, limit, accountId. */
  docParams?: Record<string, string | number | undefined | null>;
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
  mode, reportName, asOfDate, onAsOfChange, fromDate, toDate, onRangeChange, locationId, onLocationChange,
  doc, docParams,
}: ReportToolbarProps) {
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [storedUrl, setStoredUrl] = React.useState<string | null>(null);
  const [locations, setLocations] = React.useState<ToolbarLocation[]>([]);

  const loadLocations = React.useCallback(async () => {
    try {
      const res = await axios.get<{ locations: ToolbarLocation[] }>(
        `${API_BASE_URL}/parties/lookups`,
        { headers: authHeader() }
      );
      setLocations(res.data.locations ?? []);
    } catch {
      /* A filter that cannot load its options is not worth an error card on a
         report that is otherwise fine -- the button simply offers "All
         Locations", which is the default anyway. */
      setLocations([]);
    }
  }, []);

  React.useEffect(() => {
    if (!onLocationChange) return;   // the filter is not rendered at all
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the component driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void loadLocations();
  }, [onLocationChange, loadLocations]);

  const [tempAsOf, setTempAsOf] = React.useState(asOfDate ?? "");
  const [tempFrom, setTempFrom] = React.useState(fromDate ?? "");
  const [tempTo,   setTempTo]   = React.useState(toDate   ?? "");

  /* Re-seed the draft values when the applied dates change underneath us. */
  const appliedKey = `${asOfDate}|${fromDate}|${toDate}`;
  const [seededFrom, setSeededFrom] = React.useState(appliedKey);
  if (seededFrom !== appliedKey) {
    setSeededFrom(appliedKey);
    setTempAsOf(asOfDate ?? "");
    setTempFrom(fromDate ?? "");
    setTempTo(toDate ?? "");
  }

  const location = locationId ? locations.find((l) => l.id === locationId) ?? null : null;

  function applyDate() {
    if (mode === "asOf") onAsOfChange?.(tempAsOf);
    else onRangeChange?.(tempFrom, tempTo);
    setDatePickerOpen(false);
    toast.success("Filters applied", { description: `${reportName} updated.` });
  }

  /* The parameters the screen is currently showing, so the PDF is of THIS
     view rather than of the report's defaults. */
  function query() {
    const p = new URLSearchParams();
    if (mode === "asOf" && asOfDate) p.set("asOf", asOfDate);
    if (mode === "range") {
      if (fromDate) p.set("from", fromDate);
      if (toDate) p.set("to", toDate);
    }
    if (locationId) p.set("locationId", String(locationId));
    for (const [k, v] of Object.entries(docParams ?? {})) {
      if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
    }
    return p.toString();
  }

  function pdfUrl() {
    const base = doc!.family === "report" ? "reports" : "accounting";
    const q = query();
    return `${API_BASE_URL}/${base}/${doc!.key}/pdf${q ? `?${q}` : ""}`;
  }

  /** Opens the real A4 document the API renders, not the web page. */
  function openPdf() {
    if (!doc) { window.print(); return; }
    window.open(pdfUrl(), "_blank", "noopener,noreferrer");
  }

  /** Renders it and pushes it to the documents Cloudinary account. */
  async function savePdf() {
    if (!doc) return;
    setSaving(true);
    try {
      const res = await axios.post<{ pdfUrl: string; isDeliverable: boolean; message: string }>(
        pdfUrl(), {}, { headers: authHeader() });
      setStoredUrl(res.data.pdfUrl);
      toast.success(`${reportName} saved to the document store`, { description: res.data.message });
    } catch (e) {
      const message = axios.isAxiosError(e) && e.response
        ? (e.response.data as { message?: string })?.message ?? "Please try again."
        : "Cannot reach the server.";
      toast.error("Could not save the report", { description: message });
    } finally {
      setSaving(false);
    }
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

      {/* Location selector */}
      {onLocationChange && (
        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="md" className="gap-1.5">
              <MapPin />
              {location ? location.name : "All Locations"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="px-3 py-2 text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-navy-700">Location</div>
            <button
              onClick={() => { onLocationChange?.(null); setLocationOpen(false); toast.success("Showing all locations"); }}
              className={cn("w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700",
                !locationId && "text-brand-yellow font-semibold"
              )}
            >
              <span>All Locations</span>
              {!locationId && <Check className="size-3.5 text-brand-yellow" />}
            </button>
            <div className="border-t border-slate-100 dark:border-navy-700">
              {locations.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { onLocationChange?.(l.id); setLocationOpen(false); toast.success(`Filtered to ${l.name}`); }}
                  className={cn("w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-navy-700",
                    l.id === locationId && "text-brand-yellow font-semibold"
                  )}
                >
                  <div>
                    <div>{l.name}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 tabular">{l.code}</div>
                  </div>
                  {l.id === locationId && <Check className="size-3.5 text-brand-yellow" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Print — the A4 document the API renders, with the filters applied */}
      <Button variant="secondary" size="md" className="gap-1.5" onClick={openPdf}>
        <Printer />
        <span className="hidden sm:inline">Print</span>
      </Button>

      {doc && (
        <>
          <Button variant="secondary" size="md" className="gap-1.5" onClick={openPdf}>
            <Download />
            <span className="hidden sm:inline">PDF</span>
          </Button>

          <Button variant="secondary" size="md" className="gap-1.5" onClick={savePdf} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload />}
            <span className="hidden sm:inline">{saving ? "Saving…" : "Save to store"}</span>
          </Button>

          {storedUrl && (
            <Button
              variant="ghost"
              size="md"
              className="gap-1.5"
              onClick={() => window.open(storedUrl, "_blank", "noopener,noreferrer")}
            >
              <Check className="text-success" />
              <span className="hidden sm:inline">Stored copy</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
