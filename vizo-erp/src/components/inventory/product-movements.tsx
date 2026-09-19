"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowRight, ArrowDownLeft, ArrowUpRight, Truck, PackagePlus, ShoppingCart, RotateCcw,
  Undo2, SlidersHorizontal, Loader2, AlertCircle, ArrowLeftRight, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/products/{id}/movements -- one card per movement, and ONE
   card per transfer however many legs it has. See ProductHistoryController. */
export type MovementCard = {
  key: string;
  movementId: number;
  kind: "transfer" | "purchase" | "sale" | "sale-return" | "purchase-return" | "adjustment" | "other";
  type: string;
  typeName: string;
  at: string;
  reference: string | null;
  documentId: number | null;
  documentUrl: string | null;
  direction: "in" | "out" | "move";
  qty: number;
  location: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  balanceAfter: number | null;
  status: string | null;
  receivedOn: string | null;
  by: string | null;
};

type MovementPage = {
  total: number; page: number; pageSize: number;
  counts: { kind: string; count: number }[];
  items: MovementCard[];
};

export const MOVEMENT_LOOK: Record<string, { label: string; icon: typeof Truck; tone: string; ring: string }> = {
  transfer:          { label: "Transfers",           icon: ArrowLeftRight,    tone: "text-info bg-info/10",       ring: "hover:border-info/50" },
  purchase:          { label: "Received",            icon: PackagePlus,       tone: "text-success bg-success/10", ring: "hover:border-success/50" },
  sale:              { label: "Sold",                icon: ShoppingCart,      tone: "text-danger bg-danger/10",   ring: "hover:border-danger/50" },
  "sale-return":     { label: "Customer returns",    icon: RotateCcw,         tone: "text-warning bg-warning/10", ring: "hover:border-warning/50" },
  "purchase-return": { label: "Returned to supplier", icon: Undo2,            tone: "text-warning bg-warning/10", ring: "hover:border-warning/50" },
  adjustment:        { label: "Corrections",         icon: SlidersHorizontal, tone: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-navy-700", ring: "hover:border-slate-400" },
  other:             { label: "Other",               icon: Truck,             tone: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-navy-700", ring: "hover:border-slate-400" },
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const PAGE = 12;

/**
 * The Movements tab: filter chips by kind, a grid of cards, "Show more".
 * Every card opens that movement's own page.
 */
export function ProductMovements({ productId }: { productId: number }) {
  const [items, setItems] = React.useState<MovementCard[]>([]);
  const [counts, setCounts] = React.useState<{ kind: string; count: number }[]>([]);
  const [total, setTotal] = React.useState(0);
  const [kind, setKind] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (k: string, p: number) => {
    setLoading(true);
    try {
      const res = await axios.get<MovementPage>(`${API_BASE_URL}/inventory/products/${productId}/movements`, {
        params: { kind: k || undefined, page: p, pageSize: PAGE }, headers: authHeader(),
      });
      setItems((prev) => (p === 1 ? res.data.items : [...prev, ...res.data.items]));
      setTotal(res.data.total);
      if (!k) setCounts(res.data.counts);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the movements."));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- axios inside the page is the brief */
    void load(kind, 1);
  }, [load, kind]);

  const all = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      {counts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          <Chip active={!kind} onClick={() => { setKind(""); setPage(1); }} label="All" count={all} />
          {counts.map((c) => (
            <Chip key={c.kind} active={kind === c.kind} onClick={() => { setKind(c.kind); setPage(1); }}
              label={MOVEMENT_LOOK[c.kind]?.label ?? c.kind} count={c.count} />
          ))}
        </div>
      )}

      {error && (
        <Card className="p-4 mb-4 border-danger/40 flex items-center gap-3">
          <AlertCircle className="size-5 text-danger shrink-0" />
          <div className="flex-1 text-sm font-medium text-navy-900 dark:text-white">{error}</div>
          <Button variant="secondary" size="sm" onClick={() => void load(kind, 1)}>Try again</Button>
        </Card>
      )}

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Nothing has moved in or out of stock for this product yet.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((m) => <MovementCardView key={m.key} productId={productId} m={m} />)}
          </div>
          {items.length < total && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="md" className="gap-1.5" disabled={loading}
                onClick={() => { const next = page + 1; setPage(next); void load(kind, next); }}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Show more ({total - items.length} left)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-navy-900 bg-navy-900 text-brand-yellow dark:border-navy-700 dark:bg-navy-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-navy-700 dark:bg-navy-800 dark:text-slate-300"
      )}>
      {label}<span className="ml-1.5 tabular font-bold">{count}</span>
    </button>
  );
}

/**
 * One movement. The whole card is the link. What a person asks first is on
 * the face of it: when, from where to where, how many.
 */
export function MovementCardView({ productId, m }: { productId: number; m: MovementCard }) {
  const look = MOVEMENT_LOOK[m.kind] ?? MOVEMENT_LOOK.other;
  const Icon = look.icon;
  const isTransfer = m.kind === "transfer";

  return (
    <Link href={`/inventory/products/${productId}/movements/${m.movementId}`}
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow">
      <Card className={cn("h-full p-4 transition-colors", look.ring)}>
        <div className="flex items-start gap-3">
          <div className={cn("size-10 rounded-lg flex items-center justify-center flex-shrink-0", look.tone)}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy-900 dark:text-white">{m.typeName}</div>
                <div className="text-2xs text-slate-500 dark:text-slate-400">
                  {formatDate(m.at)} · {formatTime(m.at)}
                </div>
              </div>
              <div className={cn("tabular text-lg font-bold leading-none flex items-center gap-0.5",
                m.direction === "in" ? "text-success" : m.direction === "out" ? "text-danger" : "text-info")}>
                {m.direction === "in" ? <ArrowDownLeft className="size-4" /> : m.direction === "out" ? <ArrowUpRight className="size-4" /> : null}
                {m.qty}
              </div>
            </div>

            {/* From -> To. For a receipt there is only a "to"; for a sale only a "from". */}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className={cn("min-w-0 truncate rounded-md px-2 py-1",
                m.fromLocation ? "bg-slate-100 text-navy-900 dark:bg-navy-700 dark:text-white" : "text-slate-400")}>
                {m.fromLocation ?? (m.kind === "purchase" ? "Supplier" : m.kind === "sale-return" ? "Customer" : "—")}
              </span>
              <ArrowRight className="size-3.5 flex-shrink-0 text-slate-400" />
              <span className={cn("min-w-0 truncate rounded-md px-2 py-1",
                m.toLocation ? "bg-slate-100 text-navy-900 dark:bg-navy-700 dark:text-white" : "text-slate-400")}>
                {m.toLocation ?? (m.kind === "sale" ? "Customer" : m.kind === "purchase-return" ? "Supplier" : "—")}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-2xs text-slate-500 dark:text-slate-400">
              <span className="tabular font-medium text-navy-900 dark:text-white truncate">{m.reference ?? "No reference"}</span>
              <span className="truncate">
                {isTransfer
                  ? (m.receivedOn ? `Received ${formatDate(m.receivedOn)}` : m.status ?? "")
                  : m.balanceAfter !== null ? `${m.balanceAfter} left there` : ""}
              </span>
              <ChevronRight className="size-4 flex-shrink-0 text-slate-300 group-hover:text-brand-yellow transition-colors" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
