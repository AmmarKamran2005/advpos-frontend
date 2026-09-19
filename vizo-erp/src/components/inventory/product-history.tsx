"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShoppingBag, PackagePlus, FileText, Undo2, ShoppingCart, Receipt, Route, Truck, PackageCheck,
  RotateCcw, ArrowLeftRight, SlidersHorizontal, ShieldAlert, Tag, ArrowDownLeft, ArrowUpRight, ChevronRight,
  User, MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/products/{id}/history -- see ProductHistoryController. */
export type HistoryEvent = {
  key: string;
  at: string;
  hasTime: boolean;
  kind: string;
  group: string;
  title: string;
  reference: string | null;
  url: string | null;
  qty: number | null;
  direction: "in" | "out" | "move" | "none";
  location: string | null;
  from: string | null;
  to: string | null;
  party: string | null;
  rate: number | null;
  amount: number | null;
  by: string | null;
  status: string | null;
  detail: string | null;
};

export type HistorySummary = {
  onHand: number;
  stockValue: number;
  byLocation: { location: string; city: string; qty: number }[];
  purchasedUnits: number;
  purchasedValue: number;
  damagedOnArrival: number;
  lastPurchasedOn: string | null;
  orderedUnits: number;
  soldUnits: number;
  invoiceCount: number;
  customerCount: number;
  netSales: number;
  billedWithTax: number;
  costOfSales: number;
  grossProfit: number;
  averageSellingPrice: number;
  firstSoldOn: string | null;
  lastSoldOn: string | null;
  returnedByCustomers: number;
  returnedToSuppliers: number;
  transfers: number;
  unitsTransferred: number;
  netCorrection: number;
  claims: number;
};

export type HistoryGroup = { key: string; label: string; count: number };

const KIND: Record<string, { icon: typeof Truck; tone: string }> = {
  "purchase-order":   { icon: ShoppingBag,       tone: "bg-info/10 text-info" },
  "goods-receipt":    { icon: PackagePlus,       tone: "bg-success/10 text-success" },
  "purchase-invoice": { icon: FileText,          tone: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300" },
  "purchase-return":  { icon: Undo2,             tone: "bg-warning/10 text-warning" },
  "sales-order":      { icon: ShoppingCart,      tone: "bg-brand-yellow/15 text-navy-900 dark:text-brand-yellow" },
  "order-step":       { icon: Route,             tone: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300" },
  invoice:            { icon: Receipt,           tone: "bg-danger/10 text-danger" },
  dispatch:           { icon: Truck,             tone: "bg-info/10 text-info" },
  delivered:          { icon: PackageCheck,      tone: "bg-success/10 text-success" },
  "sales-return":     { icon: RotateCcw,         tone: "bg-warning/10 text-warning" },
  transfer:           { icon: ArrowLeftRight,    tone: "bg-info/10 text-info" },
  adjustment:         { icon: SlidersHorizontal, tone: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300" },
  claim:              { icon: ShieldAlert,       tone: "bg-danger/10 text-danger" },
  catalogue:          { icon: Tag,               tone: "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300" },
};

/** Groups events under the day they happened, newest day first. */
function byDay(events: HistoryEvent[]) {
  const days: { day: string; items: HistoryEvent[] }[] = [];
  for (const e of events) {
    const day = e.at.slice(0, 10);
    const last = days[days.length - 1];
    if (last && last.day === day) last.items.push(e);
    else days.push({ day, items: [e] });
  }
  return days;
}

/**
 * The timeline. Grouped by day, each event a card with everything a person
 * reading it would ask next: how many, from whom, at what, by whom, and a
 * link to the document itself. Reads the same on a phone as on a desk.
 */
export function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Nothing recorded for this product yet.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {byDay(events).map(({ day, items }) => (
        <section key={day}>
          <div className="sticky top-0 z-10 -mx-1 mb-2 bg-slate-50/90 px-1 py-1 backdrop-blur dark:bg-navy-900/90">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {formatDate(day)}
            </span>
          </div>
          <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5 dark:border-navy-700 ml-2">
            {items.map((e) => <EventCard key={e.key} e={e} />)}
          </ol>
        </section>
      ))}
    </div>
  );
}

function EventCard({ e }: { e: HistoryEvent }) {
  const look = KIND[e.kind] ?? KIND.catalogue;
  const Icon = look.icon;

  const body = (
    <Card className={cn("p-3 sm:p-4 transition-colors", e.url && "group-hover:border-brand-yellow/50")}>
      <div className="flex items-start gap-3">
        <div className={cn("size-9 rounded-lg flex items-center justify-center flex-shrink-0", look.tone)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{e.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-slate-500 dark:text-slate-400">
                {e.reference && <span className="tabular font-medium text-navy-900 dark:text-white">{e.reference}</span>}
                {e.hasTime && <span>{formatTime(e.at)}</span>}
                {e.status && <Badge variant="muted" className="text-2xs">{e.status}</Badge>}
              </div>
            </div>
            {e.qty !== null && (
              <div className={cn("tabular text-base font-bold flex items-center gap-0.5 flex-shrink-0",
                e.direction === "in" ? "text-success" : e.direction === "out" ? "text-danger" : e.direction === "move" ? "text-info" : "text-navy-900 dark:text-white")}>
                {e.direction === "in" && <ArrowDownLeft className="size-3.5" />}
                {e.direction === "out" && <ArrowUpRight className="size-3.5" />}
                {e.qty}
                <span className="ml-0.5 text-2xs font-normal text-slate-500">pcs</span>
              </div>
            )}
          </div>

          {(e.from || e.to) && e.direction === "move" && (
            <div className="mt-2 text-xs text-navy-900 dark:text-white">
              {e.from} <span className="text-slate-400">→</span> {e.to}
            </div>
          )}

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
            {e.party && <Line icon={User}>{e.party}</Line>}
            {e.location && e.direction !== "move" && <Line icon={MapPin}>{e.location}</Line>}
            {e.rate !== null && (
              <Line>
                <span className="tabular">{formatMoney(e.rate)}</span>
                <span className="text-slate-400"> each</span>
                {e.amount !== null && <span className="tabular"> · {formatMoney(e.amount)}</span>}
              </Line>
            )}
            {e.by && <Line><span className="text-slate-400">by</span> {e.by}</Line>}
          </div>

          {e.detail && <p className="mt-2 text-2xs text-slate-500 dark:text-slate-400 break-words">{e.detail}</p>}
        </div>
        {e.url && <ChevronRight className="size-4 flex-shrink-0 self-center text-slate-300 group-hover:text-brand-yellow" />}
      </div>
    </Card>
  );

  return (
    <li className="relative">
      <span className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-white bg-brand-yellow dark:border-navy-900" />
      {e.url
        ? <Link href={e.url} className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow">{body}</Link>
        : body}
    </li>
  );
}

function Line({ icon: Icon, children }: { icon?: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {Icon && <Icon className="size-3 flex-shrink-0 text-slate-400" />}
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

/** The headline figures of a product's life, as tiles. */
export function HistorySummaryTiles({ s }: { s: HistorySummary }) {
  const margin = s.netSales > 0 ? (s.grossProfit / s.netSales) * 100 : 0;
  const tiles: { label: string; value: string; hint?: string; tone?: string }[] = [
    { label: "On hand", value: s.onHand.toLocaleString(), hint: `worth ${formatMoney(s.stockValue)}` },
    { label: "Received", value: s.purchasedUnits.toLocaleString(), hint: s.damagedOnArrival ? `${s.damagedOnArrival} damaged on arrival` : formatMoney(s.purchasedValue) },
    { label: "Sold", value: s.soldUnits.toLocaleString(), hint: `${s.invoiceCount} invoices · ${s.customerCount} customers` },
    { label: "Net sales", value: formatMoney(s.netSales), hint: `avg ${formatMoney(s.averageSellingPrice)} each` },
    { label: "Gross profit", value: formatMoney(s.grossProfit), hint: `${margin.toFixed(1)}% of sales`, tone: s.grossProfit < 0 ? "text-danger" : "text-success" },
    { label: "Returned", value: `${s.returnedByCustomers} in · ${s.returnedToSuppliers} out`, hint: "by customers · to suppliers" },
    { label: "Transfers", value: s.transfers.toLocaleString(), hint: `${s.unitsTransferred} units moved` },
    { label: "Corrections", value: (s.netCorrection > 0 ? "+" : "") + s.netCorrection, hint: `${s.claims} warranty claim${s.claims === 1 ? "" : "s"}` },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <Card key={t.label} className="p-3 sm:p-4 min-w-0">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{t.label}</div>
          {/* Wraps rather than truncates: a money figure cut to "PKR 2,999,…"
              is a figure nobody can read. */}
          <div className={cn("mt-1 tabular text-base sm:text-lg font-bold leading-tight text-navy-900 dark:text-white break-words", t.tone)}>
            {t.value}
          </div>
          {t.hint && <div className="mt-1 text-2xs leading-snug text-slate-500 dark:text-slate-400">{t.hint}</div>}
        </Card>
      ))}
    </div>
  );
}
