"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search, Check, X, Banknote, FileText, Landmark, Smartphone, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import {
  collections, COLLECTION_STATUS_VARIANT, COLLECTION_METHOD_LABEL,
  totalOf, type Collection, type CollectionStatus,
} from "@/data/collections";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const METHOD_ICON: Record<Collection["method"], typeof Banknote> = {
  CASH: Banknote,
  CHEQUE: FileText,
  BANK: Landmark,
  JAZZCASH: Smartphone,
  EASYPAISA: Smartphone,
};

const TABS: { key: CollectionStatus | "ALL"; label: string }[] = [
  { key: "AWAITING", label: "Awaiting" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "BOUNCED", label: "Bounced" },
  { key: "ALL", label: "All" },
];

/**
 * Every field collection a sales rep has logged, in one place. A rep gets
 * credit for collecting the moment he submits it — the ledger only moves once
 * someone here says the money actually arrived. That gap is the entire point
 * of this screen.
 */
export default function ConfirmCollectionsPage() {
  const [tab, setTab] = React.useState<CollectionStatus | "ALL">("AWAITING");
  const [search, setSearch] = React.useState("");
  const [confirming, setConfirming] = React.useState<Collection | null>(null);
  const [bouncing, setBouncing] = React.useState<Collection | null>(null);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (tab !== "ALL" && c.status !== tab) return false;
      if (!q) return true;
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.receiptNo.toLowerCase().includes(q) ||
        c.collectedBy.toLowerCase().includes(q)
      );
    });
  }, [tab, search]);

  const awaiting = collections.filter((c) => c.status === "AWAITING");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Money" }, { label: "Confirm Collections" }]}
        title="Confirm Collections"
        subtitle="Money the sales team collected in the field, waiting on your word."
      />

      {awaiting.length > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning/5">
          <CardBody className="flex items-start gap-3 py-3">
            <Clock className="size-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-200">
              <span className="font-semibold">
                {formatMoney(totalOf(awaiting))}
              </span>{" "}
              across {awaiting.length} {awaiting.length === 1 ? "receipt is" : "receipts are"}{" "}
              still sitting outside the ledger. Every customer balance below stays
              as it was until you confirm.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? collections.length
              : collections.filter((c) => c.status === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                tab === t.key
                  ? "bg-navy-900 text-brand-yellow dark:bg-navy-800"
                  : "bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-navy-700 hover:border-slate-300"
              )}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer, receipt number, or who collected it…"
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title="Nothing here" description="No receipts match this filter." />
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <CollectionCard
              key={c.id}
              c={c}
              onConfirm={() => setConfirming(c)}
              onBounce={() => setBouncing(c)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Confirm ${formatMoney(confirming?.amount ?? 0)} from ${confirming?.customerName}?`}
        description="The customer's balance drops by this amount and it posts to the ledger. Only do this once the cash or cheque is actually in hand."
        variant="info"
        confirmLabel="Yes, confirm it"
        onConfirm={() => {
          toast.success("Collection confirmed", {
            description: `${confirming?.receiptNo} posted to the ledger.`,
          });
          setConfirming(null);
        }}
      />

      <ConfirmDialog
        open={bouncing !== null}
        onOpenChange={(o) => !o && setBouncing(null)}
        title={`Mark ${bouncing?.receiptNo} bounced?`}
        description={`${bouncing?.customerName}'s balance goes back up by ${formatMoney(bouncing?.amount ?? 0)}. The receipt stays on record as evidence of what was promised.`}
        variant="danger"
        confirmLabel="Yes, it bounced"
        requireReason
        reasonLabel="What happened?"
        reasonPlaceholder="e.g. insufficient funds, wrong account…"
        onConfirm={(r) => {
          toast.success("Marked bounced", { description: `${bouncing?.receiptNo} — ${r}` });
          setBouncing(null);
        }}
      />
    </>
  );
}

function CollectionCard({
  c, onConfirm, onBounce,
}: {
  c: Collection; onConfirm: () => void; onBounce: () => void;
}) {
  const Icon = METHOD_ICON[c.method];

  return (
    <Card className="hover:border-brand-yellow/40 transition-colors">
      <CardBody className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link href={`/parties/${c.customerId}`} className="flex items-center gap-3 flex-1 min-w-0 group">
          <Avatar initials={c.customerInitials} size="md" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
              {c.customerName}
            </div>
            <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
              {c.receiptNo} · {formatDate(c.collectedOn)} · {c.collectedBy}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="size-8 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center">
            <Icon className="size-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-navy-900 dark:text-white">
              {COLLECTION_METHOD_LABEL[c.method]}
            </div>
            {c.reference !== "—" && (
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                {c.reference}
                {c.bank !== "—" && ` · ${c.bank}`}
              </div>
            )}
            {c.chequeDate && (
              <div className="tabular text-2xs text-warning">
                dated {formatDate(c.chequeDate)}
              </div>
            )}
          </div>
        </div>

        {c.against.length > 0 && (
          <Badge variant="muted" className="flex-shrink-0">
            {c.against.length === 1 ? c.against[0] : `${c.against.length} orders`}
          </Badge>
        )}

        <div className="tabular text-base font-bold text-navy-900 dark:text-white sm:w-32 sm:text-right flex-shrink-0">
          {formatMoney(c.amount)}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {c.status === "AWAITING" ? (
            <>
              <Button variant="accent" size="sm" className="gap-1" onClick={onConfirm}>
                <Check /> Confirm
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-danger" aria-label="Mark bounced" onClick={onBounce}>
                <X />
              </Button>
            </>
          ) : (
            <StatusPill variant={COLLECTION_STATUS_VARIANT[c.status]}>
              {c.status === "CONFIRMED" ? "Confirmed" : "Bounced"}
            </StatusPill>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
