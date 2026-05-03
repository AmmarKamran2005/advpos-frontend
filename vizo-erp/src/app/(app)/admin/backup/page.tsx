"use client";

import { Database, Download, Play, Shield, CheckCircle2, Clock, HardDrive, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/format";

type Backup = {
  id: number;
  date: string;
  type: "Full" | "Incremental" | "Manual";
  size: string;
  status: "Success" | "Failed" | "Running";
  destination: string;
  duration: string;
  hash: string;
};

const BACKUPS: Backup[] = [
  { id: 1, date: "2026-05-01 02:00 AM", type: "Full",        size: "1.24 GB", status: "Success", destination: "MinIO Primary",   duration: "3m 42s", hash: "sha256:a8f9..." },
  { id: 2, date: "2026-04-30 02:00 AM", type: "Full",        size: "1.22 GB", status: "Success", destination: "MinIO Primary",   duration: "3m 38s", hash: "sha256:b3e7..." },
  { id: 3, date: "2026-04-29 14:32 PM", type: "Manual",      size: "1.21 GB", status: "Success", destination: "Manual download", duration: "3m 51s", hash: "sha256:c1d2..." },
  { id: 4, date: "2026-04-29 02:00 AM", type: "Full",        size: "1.20 GB", status: "Success", destination: "MinIO Primary",   duration: "3m 42s", hash: "sha256:d4a1..." },
  { id: 5, date: "2026-04-28 02:00 AM", type: "Full",        size: "1.18 GB", status: "Success", destination: "MinIO Primary",   duration: "3m 28s", hash: "sha256:e7b3..." },
];

export default function BackupPage() {
  const columns: Column<Backup>[] = [
    { key: "date",        header: "Date",        cell: (b) => <span className="text-sm font-medium text-navy-900 dark:text-white">{b.date}</span> },
    { key: "type",        header: "Type",        cell: (b) => <Badge variant={b.type === "Manual" ? "accent" : "info"}>{b.type}</Badge> },
    { key: "size",        header: "Size",        align: "right", cell: (b) => <span className="tabular text-sm text-slate-600 dark:text-slate-300">{b.size}</span> },
    { key: "duration",    header: "Duration",    cell: (b) => <span className="tabular text-xs text-slate-500 dark:text-slate-400">{b.duration}</span> },
    { key: "destination", header: "Destination", cell: (b) => <span className="text-xs text-slate-600 dark:text-slate-300">{b.destination}</span> },
    { key: "hash",        header: "Integrity",   cell: (b) => <span className="font-mono text-2xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{b.hash}</span> },
    { key: "status",      header: "Status",      cell: (b) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckCircle2 className="size-3.5" />
          {b.status}
        </span>
      )
    },
    { key: "actions",     header: "",            align: "right", cell: () => <Button variant="ghost" size="sm" className="gap-1"><Download className="size-3.5" />Download</Button> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Backup & Restore" }]}
        title="Backup & Restore"
        subtitle="Daily automated backups + on-demand exports"
        actions={
          <>
            <Button variant="secondary" size="md" className="gap-1.5">
              <RotateCcw />
              <span>Restore Drill</span>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5">
              <Play />
              <span>Run Backup Now</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Last Backup</div>
              <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">2 hours ago</div>
              <div className="text-xs text-success mt-1 inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Successful
              </div>
            </div>
            <Database className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Storage Used</div>
              <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">36.2 GB</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">30 backups retained</div>
            </div>
            <HardDrive className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Next Scheduled</div>
              <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">Tomorrow</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">02:00 AM PKT</div>
            </div>
            <Clock className="size-5 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Restore Drill</div>
              <div className="text-base tabular font-bold text-navy-900 dark:text-white mt-1">7 days ago</div>
              <div className="text-xs text-success mt-1 inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Verified
              </div>
            </div>
            <Shield className="size-5 text-success" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="backups">
        <TabsList>
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="drills">Restore Drills</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          <Card className="p-0 overflow-hidden">
            <DataTable columns={columns} data={BACKUPS} />
          </Card>
        </TabsContent>

        <TabsContent value="drills">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Monthly Restore Drills</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Automated pipeline restores yesterday&apos;s backup to a staging cluster and verifies row counts vs production.
              </p>
              <div className="space-y-3">
                {[
                  { date: "2026-04-24", result: "Success",  records: "2,148,420 rows", drift: "0%",     duration: "8m 42s" },
                  { date: "2026-03-24", result: "Success",  records: "2,089,142 rows", drift: "0%",     duration: "7m 58s" },
                  { date: "2026-02-24", result: "Success",  records: "1,968,820 rows", drift: "0%",     duration: "7m 12s" },
                ].map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-success" />
                      <div>
                        <div className="text-sm font-semibold text-navy-900 dark:text-white">{formatDate(d.date)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{d.records} verified · drift {d.drift}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{d.duration}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Backup Schedule</h3>
              <div className="space-y-4">
                {[
                  { label: "Full PostgreSQL Backup", schedule: "Daily at 02:00 AM PKT", retention: "30 days", destination: "MinIO Primary + S3 (offsite)" },
                  { label: "WAL Continuous Archive", schedule: "Every 60 seconds",       retention: "7 days (PITR window)", destination: "MinIO Primary" },
                  { label: "Logical pg_dump",        schedule: "Daily at 02:30 AM PKT", retention: "14 days", destination: "MinIO Primary" },
                  { label: "MinIO Object Mirror",     schedule: "Daily at 03:00 AM PKT", retention: "30 days", destination: "Secondary MinIO" },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div className="size-9 rounded-lg bg-info/10 flex items-center justify-center text-info">
                      <Clock className="size-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-navy-900 dark:text-white">{s.label}</div>
                      <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                        <div>
                          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Schedule</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-0.5">{s.schedule}</div>
                        </div>
                        <div>
                          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Retention</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-0.5">{s.retention}</div>
                        </div>
                        <div>
                          <div className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">Destination</div>
                          <div className="text-slate-700 dark:text-slate-200 mt-0.5">{s.destination}</div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
