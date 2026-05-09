"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Edit3, MapPin, Phone, Building2, Star, AlertCircle, ArrowLeft, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getBranch, users, warehouses } from "@/data/admin";
import { formatMoney, formatCompact } from "@/lib/format";

export default function BranchDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const b = getBranch(id);

  if (!b) return <EmptyState icon={AlertCircle} title="Branch not found" action={<Button asChild><Link href="/admin/branches">Back</Link></Button>} />;

  const branchUsers = users.filter((u) => u.branches.includes(b.code));
  const branchWarehouses = warehouses.filter((w) => w.branchId === b.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Branches", href: "/admin/branches" }, { label: b.name }]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
              <Building2 className="size-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2">
                {b.name} {b.isHeadOffice && <Star className="size-4 text-brand-yellow fill-brand-yellow" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="muted" className="tabular">{b.code}</Badge>
                {b.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
              </div>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/branches"><ArrowLeft />Back</Link></Button>
            <Button variant="secondary" className="gap-1.5"><Edit3 />Edit</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Monthly Revenue</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{formatCompact(b.monthlyRevenue)}</div>
          <div className="text-xs text-success font-semibold mt-1 inline-flex items-center gap-1"><TrendingUp className="size-3" />+12% vs last</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Users</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{branchUsers.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Warehouses</div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{branchWarehouses.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Open Orders</div>
          <div className="text-2xl tabular font-bold text-info mt-1">14</div>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users ({branchUsers.length})</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses ({branchWarehouses.length})</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Branch Information</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Meta label="Code" value={<span className="tabular">{b.code}</span>} />
                <Meta label="City" value={b.city} />
                <Meta label="Address" icon={MapPin} value={b.address} />
                <Meta label="Phone" icon={Phone} value={<span className="tabular">{b.phone}</span>} />
                <Meta label="Manager" value={b.manager} />
                <Meta label="Type" value={b.isHeadOffice ? <Badge variant="accent">Head Office</Badge> : <Badge variant="muted">Branch</Badge>} />
              </dl>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card><CardBody>
            <div className="space-y-2">
              {branchUsers.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700">
                  <div>
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">{u.fullName}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">{u.email}</div>
                  </div>
                  <div className="flex gap-1">{u.roles.map((r) => <Badge key={r} variant="info">{r}</Badge>)}</div>
                </Link>
              ))}
            </div>
          </CardBody></Card>
        </TabsContent>

        <TabsContent value="warehouses">
          <Card><CardBody>
            <div className="space-y-2">
              {branchWarehouses.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">{w.name}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 tabular">{w.code} · {w.productCount} products</div>
                  </div>
                  <div className="text-right">
                    <div className="tabular text-sm font-bold text-navy-900 dark:text-white">{formatMoney(w.totalValue)}</div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">stock value</div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody></Card>
        </TabsContent>

        <TabsContent value="numbering">
          <Card><CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Document Number Prefixes</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Documents created by this branch use these prefixes. Cannot be changed once documents have been issued.</p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Meta label="Invoice" value={<span className="tabular">{b.invoicePrefix}-{`{YY}-{seq}`}</span>} />
              <Meta label="Purchase Order" value={<span className="tabular">{b.poPrefix}-{`{YY}-{seq}`}</span>} />
              <Meta label="Voucher" value={<span className="tabular">{b.voucherPrefix}-{`{YY}-{seq}`}</span>} />
            </dl>
          </CardBody></Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof MapPin }) {
  return (
    <div>
      <dt className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 dark:text-white mt-1 inline-flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-slate-400" />}
        {value}
      </dd>
    </div>
  );
}
