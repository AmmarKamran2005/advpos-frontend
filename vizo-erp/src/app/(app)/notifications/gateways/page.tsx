"use client";

import { Wifi, CheckCircle2, AlertCircle, Activity, Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";

const GATEWAYS = [
  { id: 1, code: "JAZZ_BIZSMS",  name: "Jazz BizSMS",         priority: 1, maxPerMin: 300, sentToday: 84,  cost: 1.20, isHealthy: true,  isActive: true,  lastCheck: "2 min ago", masking: "VIZO" },
  { id: 2, code: "TELENOR_TAMEER", name: "Telenor Tameer",     priority: 2, maxPerMin: 250, sentToday: 42,  cost: 1.50, isHealthy: true,  isActive: true,  lastCheck: "5 min ago", masking: "VIZO" },
  { id: 3, code: "TWILIO_PK",    name: "Twilio (PK route)",   priority: 3, maxPerMin: 100, sentToday: 8,   cost: 4.50, isHealthy: true,  isActive: true,  lastCheck: "10 min ago", masking: "VIZO" },
  { id: 4, code: "VEEVO",        name: "Veevo SMS",            priority: 4, maxPerMin: 200, sentToday: 0,   cost: 0.95, isHealthy: false, isActive: false, lastCheck: "1 hour ago", masking: "VIZO" },
];

export default function GatewaysPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "SMS / Notifications" }, { label: "Gateways" }]}
        title="SMS Gateways"
        subtitle="Multi-provider failover for reliable delivery"
        actions={
          <Button variant="accent" size="md" className="gap-1.5"><Wifi /><span>Test All</span></Button>
        }
      />

      <Card className="bg-info/5 border-info/20 mb-6">
        <CardBody>
          <p className="text-sm text-info-dark dark:text-info-light">
            💡 Gateways are tried in priority order. If the highest-priority gateway fails or is unhealthy, the next one is automatically attempted. This gives ~99.5% effective delivery.
          </p>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {GATEWAYS.map((g) => (
          <Card key={g.id} className={!g.isActive ? "opacity-60" : ""}>
            <CardBody>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${g.isHealthy && g.isActive ? "bg-success/10 text-success" : "bg-slate-100 dark:bg-navy-700 text-slate-400"}`}>
                    <Wifi className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-navy-900 dark:text-white">{g.name}</h3>
                      <Badge variant="accent">Priority {g.priority}</Badge>
                      {!g.isActive && <Badge variant="muted">Disconnected</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Code: <span className="tabular font-medium text-slate-700 dark:text-slate-200">{g.code}</span> · Sender ID: <span className="tabular font-medium text-slate-700 dark:text-slate-200">{g.masking}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Sent Today</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">{g.sentToday}</div>
                  </div>
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Per SMS</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">PKR {g.cost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Limit</div>
                    <div className="text-lg tabular font-bold text-navy-900 dark:text-white mt-1">{g.maxPerMin}/min</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {g.isHealthy ? (
                    <StatusPill variant="success">Healthy</StatusPill>
                  ) : (
                    <StatusPill variant="danger">Unhealthy</StatusPill>
                  )}
                  <div className="text-2xs text-slate-500 dark:text-slate-400">Last check: {g.lastCheck}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm"><Activity className="size-3.5" /> Health Check</Button>
                  <Button variant="secondary" size="sm"><Settings className="size-3.5" /> Configure</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
