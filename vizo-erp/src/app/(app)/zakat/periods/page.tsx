"use client";

import { Plus, Moon, Calendar, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";

const PERIODS = [
  { id: 1, hijriYear: "1447 AH", gregorian: "2025-2026", startDate: "2025-08-01", endDate: "2026-07-31", goldRate: 28500, silverRate: 380, nisabValueGold: 2493180, nisabValueSilver: 232697, status: "active" },
  { id: 2, hijriYear: "1446 AH", gregorian: "2024-2025", startDate: "2024-08-15", endDate: "2025-07-31", goldRate: 24800, silverRate: 320, nisabValueGold: 2169504, nisabValueSilver: 195955, status: "finalized" },
  { id: 3, hijriYear: "1445 AH", gregorian: "2023-2024", startDate: "2023-08-25", endDate: "2024-08-14", goldRate: 21500, silverRate: 280, nisabValueGold: 1880820, nisabValueSilver: 171461, status: "finalized" },
];

export default function ZakatPeriodsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Zakat" }, { label: "Periods" }]}
        title="Zakat Periods"
        subtitle="Hijri year periods with nisab rates"
        actions={
          <Button variant="accent" size="md" className="gap-1.5"><Plus /><span>New Period</span></Button>
        }
      />

      <div className="space-y-4">
        {PERIODS.map((p) => (
          <Card key={p.id} className={p.status === "active" ? "border-brand-yellow/30" : ""}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                    <Moon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-navy-900 dark:text-white">{p.hijriYear}</h3>
                      <Badge variant="muted">{p.gregorian}</Badge>
                      {p.status === "active" ? <StatusPill variant="info">Active</StatusPill> : <StatusPill variant="success">Finalized</StatusPill>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1.5">
                      <Calendar className="size-3" />
                      {p.startDate} → {p.endDate}
                    </div>
                  </div>
                </div>

                <Button variant={p.status === "active" ? "accent" : "secondary"} size="md">
                  {p.status === "active" ? "Calculate Zakat" : "View Calculation"}
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Gold Rate (per gram)</div>
                  <div className="tabular text-base font-bold text-navy-900 dark:text-white mt-1">{formatMoney(p.goldRate)}</div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Silver Rate (per gram)</div>
                  <div className="tabular text-base font-bold text-navy-900 dark:text-white mt-1">{formatMoney(p.silverRate)}</div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Nisab (Gold 87.48g)</div>
                  <div className="tabular text-base font-bold text-brand-yellow mt-1">{formatMoney(p.nisabValueGold)}</div>
                </div>
                <div>
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Nisab (Silver 612.36g)</div>
                  <div className="tabular text-base font-bold text-brand-yellow mt-1">{formatMoney(p.nisabValueSilver)}</div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
