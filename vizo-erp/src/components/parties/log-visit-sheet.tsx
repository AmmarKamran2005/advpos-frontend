"use client";

import * as React from "react";
import axios from "axios";
import { MapPin, Loader2, LocateFixed, X, Check } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { todayISO, addDaysISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

/* GET /visits/lookups */
type Lookups = {
  mayLog: boolean;
  pickRep: boolean;
  backdateDays: number | null;
  outcomes: { id: number; key: string; name: string }[];
  customers: { id: number; code: string; name: string; city: string | null; repId: number | null }[];
  reps: { id: number; name: string }[] | null;
};

type Fix = { lat: number; lng: number; accuracy: number };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** The phone's wall clock as "YYYY-MM-DDTHH:mm" -- what a datetime-local input wants. */
function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * LOG A VISIT -- POST /visits (27 Sep, round E). Built for a phone in a shop:
 *
 *   · the outcome is four big buttons from the VisitOutcome table, not a
 *     dropdown -- one tap, standing at the counter;
 *   · the time defaults to now and may go back a week (the API holds a rep to
 *     that; the Super Admin to nothing);
 *   · "Followup" asks for the day to go back -- the API refuses one without;
 *   · location is ONE tap and optional: a phone that refuses GPS must not stop
 *     the log. The accuracy the phone reports is kept with it, because a fix
 *     good to 2 km proves nothing about which shop.
 *
 * `customerId` fixes the customer (the customer's own page); without it the
 * rep picks from his own customers -- the only ones the API lets him log.
 */
export function LogVisitSheet({
  open, onOpenChange, customerId, customerName, onLogged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId?: number;
  customerName?: string;
  onLogged: () => void;
}) {
  const [lk, setLk] = React.useState<Lookups | null>(null);
  const [customer, setCustomer] = React.useState<number | null>(customerId ?? null);
  const [search, setSearch] = React.useState("");
  const [outcomeId, setOutcomeId] = React.useState<number | null>(null);
  const [visitedAt, setVisitedAt] = React.useState(nowLocal);
  const [notes, setNotes] = React.useState("");
  const [followUp, setFollowUp] = React.useState("");
  const [repId, setRepId] = React.useState<number | null>(null);
  const [fix, setFix] = React.useState<Fix | null>(null);
  const [locating, setLocating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/visits/lookups`, { headers: authHeader() });
      setLk(res.data);
    } catch (e) {
      toast.error("Could not open the visit form", { description: apiMessage(e, "Please try again.") });
      onOpenChange(false);
    }
  }, [onOpenChange]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the component is the brief for this project; loaded when
       the sheet opens. */
    if (open && !lk) void load();
  }, [open, lk, load]);

  const outcome = lk?.outcomes.find((o) => o.id === outcomeId) ?? null;
  const needsFollowUp = outcome?.key === "FOLLOWUP";
  const visitDay = visitedAt.slice(0, 10);
  const minVisit = lk?.backdateDays != null ? `${addDaysISO(todayISO(), -lk.backdateDays)}T00:00` : undefined;

  const customers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (lk?.customers ?? []).filter((c) =>
      !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q));
  }, [lk, search]);

  const chosen = lk?.customers.find((c) => c.id === customer) ?? null;
  const knownCustomer = customerId !== undefined;
  const ready = Boolean(customer && outcomeId && visitedAt) &&
    (!needsFollowUp || Boolean(followUp)) &&
    (!followUp || followUp >= visitDay) &&
    (!lk?.pickRep || Boolean(repId ?? chosen?.repId));

  function locate() {
    if (!("geolocation" in navigator)) {
      toast.error("This device cannot share its location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error("Location not added", {
          description: err.code === err.PERMISSION_DENIED
            ? "Location permission was refused. The visit can still be saved without it."
            : "The phone could not get a fix. Try again outside, or save without it.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }

  async function save() {
    if (!customer || !outcomeId) return;
    setSaving(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/visits`,
        {
          customerId: customer,
          outcomeId,
          /* Sent as the phone's wall clock with no zone -- Pakistan time,
             which is what the column stores (the API converts a "Z" value). */
          visitedAt: `${visitedAt}:00`,
          notes: notes.trim() || null,
          nextFollowUpDate: followUp || null,
          latitude: fix ? Number(fix.lat.toFixed(6)) : null,
          longitude: fix ? Number(fix.lng.toFixed(6)) : null,
          gpsAccuracyM: fix ? Math.round(fix.accuracy) : null,
          salesPersonUserId: lk?.pickRep ? (repId ?? chosen?.repId ?? null) : null,
        },
        { headers: authHeader() }
      );
      toast.success("Visit logged", { description: res.data.message });
      onLogged();
    } catch (e) {
      toast.error("Visit not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="md">
        <SheetHeader>
          <SheetTitle>Log a visit</SheetTitle>
          <SheetDescription>{customerName ?? "Where you went and what came of it"}</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {!lk ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <>
              {!knownCustomer && (
                <div>
                  <Label htmlFor="v-cust" required>Customer</Label>
                  {chosen ? (
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-brand-yellow/50 bg-brand-yellow/5 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{chosen.name}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">{chosen.code}{chosen.city ? ` · ${chosen.city}` : ""}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setCustomer(null)}>Change</Button>
                    </div>
                  ) : (
                    <>
                      <Input id="v-cust" className="mt-1.5" value={search} placeholder="Search your customers…"
                        onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
                      <div className="mt-1.5 max-h-52 overflow-y-auto scrollbar-thin rounded-lg border border-slate-200 dark:border-navy-700 divide-y divide-slate-100 dark:divide-navy-700">
                        {customers.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 dark:text-slate-400">
                            {lk.customers.length === 0
                              ? "You have no customers assigned yet. Ask the Super Admin to assign them to you."
                              : "No customer matches."}
                          </div>
                        ) : customers.slice(0, 50).map((c) => (
                          <button key={c.id} type="button" onClick={() => setCustomer(c.id)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-navy-700">
                            <div className="text-sm text-navy-900 dark:text-white truncate">{c.name}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">{c.code}{c.city ? ` · ${c.city}` : ""}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <Label required>What came of it</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {lk.outcomes.map((o) => (
                    <button key={o.id} type="button" onClick={() => setOutcomeId(o.id)}
                      className={cn(
                        "min-h-12 px-3 py-2.5 rounded-lg border-2 text-sm font-medium text-left transition-colors",
                        outcomeId === o.id
                          ? "border-brand-yellow bg-brand-yellow/10 text-navy-900 dark:text-white"
                          : "border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-200 hover:border-slate-300"
                      )}>
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="v-at" required>When</Label>
                <Input id="v-at" type="datetime-local" className="mt-1.5" value={visitedAt}
                  min={minVisit} max={nowLocal()}
                  onChange={(e) => setVisitedAt(e.target.value)} />
                {lk.backdateDays != null && (
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">Up to {lk.backdateDays} days back.</p>
                )}
              </div>

              <div>
                <Label htmlFor="v-next" required={needsFollowUp}>Go back on</Label>
                {/* A plain date input: its floor is the visit's own day. */}
                <Input id="v-next" type="date" className="mt-1.5" value={followUp} min={visitDay}
                  onChange={(e) => setFollowUp(e.target.value)} />
                {needsFollowUp && !followUp && (
                  <p className="text-2xs text-warning mt-1">A follow-up needs the day you will go back.</p>
                )}
              </div>

              <div>
                <Label htmlFor="v-notes">Notes</Label>
                <Textarea id="v-notes" className="mt-1.5" rows={3} maxLength={300} value={notes}
                  placeholder="What was discussed, what they want, who you met"
                  onChange={(e) => setNotes(e.target.value)} />
                <div className="text-2xs text-slate-400 text-right mt-0.5">{notes.length}/300</div>
              </div>

              {lk.pickRep && lk.reps && (
                <div>
                  <Label htmlFor="v-rep" required>Rep who visited</Label>
                  <SelectNative id="v-rep" className="mt-1.5"
                    value={String(repId ?? chosen?.repId ?? "")}
                    onChange={(e) => setRepId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Pick the rep —</option>
                    {lk.reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </SelectNative>
                </div>
              )}

              <div>
                <Label>Location</Label>
                {fix ? (
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-success/40 bg-success/5 px-3 py-2.5">
                    <div className="min-w-0 text-xs text-slate-700 dark:text-slate-200">
                      <div className="tabular truncate">{fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}</div>
                      <div className={cn("text-2xs", fix.accuracy > 200 ? "text-warning" : "text-slate-500 dark:text-slate-400")}>
                        accurate to about {Math.round(fix.accuracy)} m{fix.accuracy > 200 ? " — too rough to prove the shop" : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setFix(null)} aria-label="Remove location"><X className="size-4" /></Button>
                  </div>
                ) : (
                  <Button variant="secondary" className="w-full mt-1.5 gap-1.5" onClick={locate} disabled={locating}>
                    {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
                    {locating ? "Finding you…" : "Add my location"}
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={!ready || saving || !lk} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save visit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A small "where" link for a logged visit that has coordinates. */
export function VisitMapLink({ lat, lng, accuracy }: { lat: number; lng: number; accuracy: number | null }) {
  return (
    <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-2xs text-info hover:underline">
      <MapPin className="size-3" /> map{accuracy != null ? ` (±${accuracy} m)` : ""}
    </a>
  );
}
