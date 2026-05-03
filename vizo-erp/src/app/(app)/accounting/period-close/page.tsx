"use client";

import { CheckCircle2, Lock, Calendar, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PERIODS = [
  { id: 1, period: "Apr 2026", year: 2026, branch: "All",       isClosed: false, draftCount: 1, openInvoices: 0, openPOs: 0,  status: "open" as const },
  { id: 2, period: "Mar 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, openInvoices: 0, openPOs: 0,  status: "closed" as const, closedBy: "Hassan Raza", closedAt: "2026-04-05" },
  { id: 3, period: "Feb 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, openInvoices: 0, openPOs: 0,  status: "closed" as const, closedBy: "Hassan Raza", closedAt: "2026-03-04" },
  { id: 4, period: "Jan 2026", year: 2026, branch: "All",       isClosed: true,  draftCount: 0, openInvoices: 0, openPOs: 0,  status: "closed" as const, closedBy: "Hassan Raza", closedAt: "2026-02-03" },
];

export default function PeriodClosePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Period Close" }]}
        title="Period Close"
        subtitle="Lock accounting periods to prevent backdated postings"
      />

      <Card className="bg-info/5 border-info/20 mb-6">
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
              <Lock className="size-5 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">About Period Close</h3>
              <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                Closing a period locks all journal entries within it. No backdated transactions can be posted. Closing requires all draft entries to be reviewed first.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {PERIODS.map((p) => (
          <Card key={p.id} className={p.isClosed ? "" : "border-warning/30 bg-warning/[0.02]"}>
            <CardBody>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${p.isClosed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {p.isClosed ? <Lock className="size-5" /> : <Calendar className="size-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white">{p.period}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {p.isClosed ? (
                        <Badge variant="success">Closed</Badge>
                      ) : (
                        <Badge variant="warning">Open</Badge>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400">{p.branch}</span>
                    </div>
                  </div>
                </div>

                {p.isClosed ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Closed on <span className="font-semibold text-navy-900 dark:text-white">{p.closedAt}</span> by <span className="font-semibold text-navy-900 dark:text-white">{p.closedBy}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-xs">
                      {p.draftCount > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-warning">
                          <AlertTriangle className="size-3.5" />
                          <span>{p.draftCount} draft entries</span>
                        </div>
                      )}
                      {p.draftCount === 0 && (
                        <div className="inline-flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="size-3.5" />
                          <span>Ready to close</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="md">View Entries</Button>
                      <Button variant="accent" size="md" className="gap-1.5" disabled={p.draftCount > 0}>
                        <Lock />
                        Close Period
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
