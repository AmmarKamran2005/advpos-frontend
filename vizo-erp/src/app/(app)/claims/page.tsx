"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus, Search, PackageX, Send, Clock, TrendingDown, AlertTriangle, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/widgets/stat-card";
import { ClaimInDialog } from "@/components/dialogs/claim-in-dialog";
import {
  claims, openClaims, claimValue, supplierScorecard, worstItems,
  CLAIM_STAGE_VARIANT, CLAIM_STAGE_LABEL, OUTCOME_LABEL, type Claim, type ClaimStage,
} from "@/data/claims";
import { claimPolicy } from "@/data/settings";
import { TODAY } from "@/data/reminders";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS: { key: ClaimStage | "ALL" | "OPEN"; label: string }[] = [
  { key: "OPEN", label: "Open" },
  { key: "RECEIVED", label: "On the shelf" },
  { key: "SENT", label: "With supplier" },
  { key: "REPLACED", label: "Replaced" },
  { key: "REJECTED", label: "Refused" },
  { key: "ALL", label: "All" },
];

function daysSince(iso: string) {
  return Math.round((new Date(TODAY).getTime() - new Date(iso).getTime()) / 86400000);
}

export default function ClaimsPage() {
  const [tab, setTab] = React.useState<ClaimStage | "ALL" | "OPEN">("OPEN");
  const [search, setSearch] = React.useState("");
  const [receiving, setReceiving] = React.useState(false);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (tab === "OPEN" && !["RECEIVED", "SENT"].includes(c.stage)) return false;
      if (tab !== "OPEN" && tab !== "ALL" && c.stage !== tab) return false;
      if (!q) return true;
      return (
        c.claimNo.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.sku.includes(q)
      );
    });
  }, [tab, search]);

  const open = openClaims();
  const onShelf = claims.filter((c) => c.stage === "RECEIVED");
  const withSupplier = claims.filter((c) => c.stage === "SENT");
  const lost = claims.filter((c) => c.stage === "REJECTED" || c.stage === "WRITTEN_OFF");
  const scorecard = supplierScorecard();
  const worst = worstItems(5);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Daily Work" }, { label: "Claims" }]}
        title="Claims & Warranty"
        subtitle="Faulty pieces back from shops, and what the supplier did about them."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setReceiving(true)}>
            <Plus />
            <span>Receive Claim</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <StatCard
          label="On the claim shelf"
          value={String(onShelf.length)}
          icon={PackageX}
          iconBg="warning"
          footer={<span className="text-xs text-slate-500">{formatCompact(claimValue(onShelf))} not yet sent</span>}
        />
        <StatCard
          label="With supplier"
          value={String(withSupplier.length)}
          icon={Send}
          iconBg="info"
          footer={<span className="text-xs text-slate-500">{formatCompact(claimValue(withSupplier))} awaiting a decision</span>}
        />
        <StatCard
          label="Money tied up"
          value={formatCompact(claimValue(open))}
          icon={Clock}
          iconBg="yellow"
          footer={<span className="text-xs text-slate-500">across {open.length} open claims</span>}
        />
        <StatCard
          label="Written off"
          value={formatCompact(claimValue(lost))}
          icon={TrendingDown}
          iconBg="danger"
          footer={<span className="text-xs text-slate-500">{lost.length} refused by suppliers</span>}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 mb-5">
        {/* Which supplier actually honours claims */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">
              How each supplier settles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              Worth a look before the next purchase order — a cheap supplier who refuses
              half your claims is not cheap.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-navy-700 text-left">
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">Supplier</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Sent</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Refused</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Honoured</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Avg days</th>
                    <th className="pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Stuck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                  {scorecard.map((s) => (
                    <tr key={s.supplierId}>
                      <td className="py-2.5 text-sm text-navy-900 dark:text-white">{s.supplierName}</td>
                      <td className="py-2.5 text-right tabular text-sm">{s.sent}</td>
                      <td className="py-2.5 text-right tabular text-sm text-danger">{s.refused}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            "tabular text-sm font-semibold",
                            s.honourRate >= 80 ? "text-success" : s.honourRate >= 50 ? "text-warning" : "text-danger"
                          )}
                        >
                          {s.honourRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular text-sm text-slate-600 dark:text-slate-300">
                        {s.avgDays || "—"}
                      </td>
                      <td className="py-2.5 text-right tabular text-sm text-slate-600 dark:text-slate-300">
                        {s.valueOpen > 0 ? formatCompact(s.valueOpen) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Which items keep coming back */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-navy-900 dark:text-white">
              What comes back most
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
              A line that sells well and returns often is losing money quietly.
            </p>
            <div className="space-y-2.5">
              {worst.map((w, i) => (
                <div key={w.productId} className="flex items-center gap-2.5">
                  <span className="tabular text-2xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                      {w.productName}
                    </div>
                    <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                      {w.sku} · {w.qty} pcs over {w.claims} claims
                    </div>
                  </div>
                  <span className="tabular text-xs font-semibold text-danger">
                    {formatCompact(w.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => {
          const count =
            t.key === "ALL"
              ? claims.length
              : t.key === "OPEN"
                ? open.length
                : claims.filter((c) => c.stage === t.key).length;
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
              placeholder="Claim number, customer, item or code…"
              className="pl-9"
            />
          </div>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={PackageX} title="Nothing here" description="No claims match this filter." />
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => <ClaimRow key={c.id} claim={c} />)}
        </div>
      )}

      <ClaimInDialog open={receiving} onOpenChange={setReceiving} />
    </>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  const age = daysSince(claim.stage === "SENT" && claim.sentOn ? claim.sentOn : claim.receivedOn);
  const overdue =
    (claim.stage === "RECEIVED" && age >= claimPolicy.remindUnsentAfterDays) ||
    (claim.stage === "SENT" && age >= claimPolicy.remindSupplierAfterDays);

  return (
    <Card className={cn("hover:border-brand-yellow/40 transition-colors", overdue && "border-warning/40")}>
      <CardBody className="py-3">
        <Link href={`/claims/${claim.id}`} className="flex flex-col lg:flex-row lg:items-center gap-3 group">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar initials={claim.customerInitials} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-navy-900 dark:text-white truncate group-hover:text-brand-yellow transition-colors">
                {claim.qty} × {claim.productName}
              </div>
              <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                {claim.claimNo} · {claim.sku} · {claim.customerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusPill variant={CLAIM_STAGE_VARIANT[claim.stage]}>
              {CLAIM_STAGE_LABEL[claim.stage]}
            </StatusPill>
            <Badge variant="muted">{claim.reasonLabel}</Badge>
            {claim.customerOutcome === "WAITING" && (
              <Badge variant="warning">customer waiting</Badge>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-2xs text-warning font-medium">
                <AlertTriangle className="size-3" />
                {age} days
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 lg:w-48 lg:justify-end">
            <div className="text-right">
              <div className="tabular text-sm font-bold text-navy-900 dark:text-white">
                {formatMoney(claim.qty * claim.unitCost)}
              </div>
              <div className="text-2xs text-slate-500 dark:text-slate-400">
                {claim.supplierId ? claim.supplierName.split(" ")[0] : formatDate(claim.receivedOn)}
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      </CardBody>
    </Card>
  );
}
