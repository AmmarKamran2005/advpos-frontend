"use client";

import { Plus, Moon, Calculator, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { statusLabel } from "@/lib/labels";

const CALCS = [
  { id: 1, period: "1447 AH (2025-2026)", calcDate: "2026-04-30", zakatableAssets: 28450000, deductibleLiabilities: 9620000, netZakatable: 18830000, zakatPayable: 470750, status: "DRAFT" as const },
  { id: 2, period: "1446 AH (2024-2025)", calcDate: "2025-07-15", zakatableAssets: 22400000, deductibleLiabilities: 7800000, netZakatable: 14600000, zakatPayable: 365000, status: "PAID" as const },
];

export default function ZakatCalculationsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Zakat" }, { label: "Calculations" }]}
        title="Zakat Calculations"
        subtitle="2.5% of net zakatable assets"
        actions={
          <Button variant="accent" size="md" className="gap-1.5"><Plus /><span>New Calculation</span></Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CALCS.map((c) => (
          <Card key={c.id} className={c.status === "DRAFT" ? "border-warning/30" : ""}>
            <CardBody>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                    <Moon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white">{c.period}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={c.status === "PAID" ? "success" : "warning"}>{statusLabel(c.status)}</Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Calculated {c.calcDate}</span>
                    </div>
                  </div>
                </div>
                {c.status === "PAID" && <CheckCircle2 className="size-5 text-success" />}
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700">
                  <span className="text-slate-600 dark:text-slate-300">Total Zakatable Assets</span>
                  <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(c.zakatableAssets)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700">
                  <span className="text-slate-600 dark:text-slate-300">(-) Deductible Liabilities</span>
                  <span className="tabular font-semibold text-warning">- {formatMoney(c.deductibleLiabilities)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-navy-700">
                  <span className="text-slate-700 dark:text-slate-200 font-semibold">Net Zakatable</span>
                  <span className="tabular font-bold text-navy-900 dark:text-white">{formatMoney(c.netZakatable)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">× 2.5%</span>
                  <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Zakat Rate</span>
                </div>
                <div className="bg-brand-yellow/10 border-2 border-brand-yellow/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Calculator className="size-4 text-brand-yellow" />
                    <span className="text-sm font-bold text-brand-yellow-700 dark:text-brand-yellow uppercase tracking-wider">Zakat Payable</span>
                  </div>
                  <span className="tabular text-2xl font-bold text-brand-yellow-700 dark:text-brand-yellow">{formatMoney(c.zakatPayable)}</span>
                </div>
              </div>

              {c.status === "DRAFT" && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <Button variant="ghost" size="md" className="flex-1">Review Items</Button>
                  <Button variant="accent" size="md" className="flex-1">Finalize & Post JE</Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
