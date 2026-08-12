"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Shield, Lock, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/dialogs";
import { roles } from "@/data/admin";
import { toast } from "@/components/ui/toaster";

const PERMISSION_GROUPS: { module: string; permissions: { key: string; label: string }[] }[] = [
  { module: "Identity", permissions: [
    { key: "users.read",   label: "View users" },
    { key: "users.create", label: "Create users" },
    { key: "users.update", label: "Update users" },
    { key: "users.delete", label: "Delete users" },
    { key: "roles.manage", label: "Manage roles" },
    { key: "locationes.manage", label: "Manage locationes" },
  ] },
  { module: "Sales", permissions: [
    { key: "orders.read",   label: "View orders" },
    { key: "orders.create", label: "Create orders" },
    { key: "orders.confirm", label: "Confirm orders" },
    { key: "orders.dispatch", label: "Dispatch orders" },
    { key: "orders.cancel", label: "Cancel orders" },
    { key: "credit.override", label: "Override credit hold" },
    { key: "invoices.create", label: "Create invoices" },
    { key: "invoices.delete", label: "Delete invoices" },
    { key: "returns.approve", label: "Approve returns" },
  ] },
  { module: "Purchases", permissions: [
    { key: "purchases.order.create", label: "Create POs" },
    { key: "purchases.order.approve", label: "Approve POs" },
    { key: "purchases.grn.post", label: "Post GRN" },
    { key: "purchases.invoice.post", label: "Post purchase invoices" },
    { key: "purchases.invoice.pay", label: "Pay suppliers" },
  ] },
  { module: "Inventory", permissions: [
    { key: "stock.read", label: "View stock" },
    { key: "stock.adjust", label: "Adjust stock" },
    { key: "stock.view-total", label: "View total stock (override hide_stock)" },
    { key: "transfers.approve", label: "Approve transfers" },
    { key: "products.create", label: "Create products" },
    { key: "products.update", label: "Update products" },
  ] },
  { module: "Accounting", permissions: [
    { key: "accounting.read", label: "View accounting" },
    { key: "accounting.journal.create", label: "Create journal entries" },
    { key: "accounting.journal.post", label: "Post journal entries" },
    { key: "accounting.journal.reverse", label: "Reverse posted JEs" },
    { key: "vouchers.post", label: "Post vouchers" },
    { key: "vouchers.reconcile", label: "Reconcile vouchers" },
    { key: "period.close", label: "Close periods" },
  ] },
  { module: "Reports", permissions: [
    { key: "reports.sales", label: "Sales reports" },
    { key: "reports.finance", label: "Financial reports" },
    { key: "reports.finance.consolidated", label: "Consolidated (across locationes)" },
    { key: "reports.aging", label: "Aging reports" },
  ] },
  { module: "Notifications & AI", permissions: [
  ] },
  { module: "Backup", permissions: [
    { key: "backup.run", label: "Run backups" },
    { key: "backup.restore", label: "Restore from backup" },
    { key: "backup.download", label: "Download backups" },
  ] },
];

const ALL_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

/* Default presets per role (for demo) */
const ROLE_DEFAULTS: Record<string, string[]> = {
  SuperAdmin: ALL_KEYS,
  Accountant: ["accounting.read", "accounting.journal.create", "accounting.journal.post", "accounting.journal.reverse", "vouchers.post", "vouchers.reconcile", "period.close", "reports.finance", "reports.finance.consolidated", "reports.aging", "ai.ask", "credit.override", "invoices.create", "invoices.void"],
  "Order Department": ["orders.read", "orders.create", "orders.confirm", "orders.dispatch", "stock.read", "transfers.approve", "ai.ask"],
  Sales: ["orders.read", "orders.create", "stock.read", "ai.ask", "sms.send"],
  "Purchase Officer": ["purchases.order.create", "purchases.grn.post", "stock.read", "ai.ask"],
  "Location Manager": ["orders.confirm", "orders.dispatch", "credit.override", "purchases.order.approve", "stock.read", "stock.view-total", "reports.finance", "reports.aging", "ai.ask"],
  Collections: ["reports.aging", "vouchers.post", "sms.send", "ai.ask"],
};

export default function RoleEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const isNew = id === 0 || isNaN(id);
  const role = roles.find((r) => r.id === id);

  const [name, setName] = React.useState(role?.name ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [perms, setPerms] = React.useState<Set<string>>(() => new Set(ROLE_DEFAULTS[role?.name ?? ""] ?? []));
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  if (id !== 0 && !role && !isNew) {
    return <EmptyState icon={AlertCircle} title="Role not found" action={<Button asChild><Link href="/admin/roles">Back</Link></Button>} />;
  }

  function toggle(key: string) {
    setPerms((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: typeof PERMISSION_GROUPS[number]) {
    const allHave = group.permissions.every((p) => perms.has(p.key));
    setPerms((cur) => {
      const next = new Set(cur);
      group.permissions.forEach((p) => allHave ? next.delete(p.key) : next.add(p.key));
      return next;
    });
  }

  async function save() {
    if (!name || name.length < 2) {
      toast.error("Role name is required");
      return;
    }
    if (perms.size === 0) {
      toast.error("Pick at least one permission");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    toast.success(isNew ? "Role created" : "Role updated", { description: `${name} now has ${perms.size} permissions` });
    router.push("/admin/roles");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Administration" },
          { label: "Roles", href: "/admin/roles" },
          { label: isNew ? "New Role" : role?.name ?? "" },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
              <Shield className="size-5" />
            </div>
            <div>
              <div>{isNew ? "New Role" : role?.name}</div>
              {role?.isSystem && (
                <Badge variant="accent" className="mt-1.5 gap-1"><Lock className="size-3" />System role</Badge>
              )}
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/roles"><ArrowLeft />Back</Link></Button>
            {!isNew && !role?.isSystem && (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmDel(true)}>Delete role</Button>
            )}
            <Button variant="accent" onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save Changes</>}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Role Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role-name" required>Name</Label>
                  <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} disabled={role?.isSystem} className="mt-1.5" placeholder="e.g. Location Manager" />
                  {role?.isSystem && <p className="text-xs text-slate-500 mt-1">System role names cannot be changed</p>}
                </div>
                <div>
                  <Label htmlFor="role-desc">Description</Label>
                  <Textarea id="role-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="What this role can do" />
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-navy-700">
                  <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Selected Permissions</div>
                  <div className="text-2xl tabular font-bold text-brand-yellow mt-1">{perms.size} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">/ {ALL_KEYS.length}</span></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {PERMISSION_GROUPS.map((g) => {
            const groupCount = g.permissions.filter((p) => perms.has(p.key)).length;
            const allChecked = groupCount === g.permissions.length;
            const someChecked = groupCount > 0;
            return (
              <Card key={g.module}>
                <CardBody>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-navy-700">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={() => toggleGroup(g)}
                        id={`group-${g.module}`}
                      />
                      <Label htmlFor={`group-${g.module}`} className="text-sm font-bold cursor-pointer">{g.module}</Label>
                    </div>
                    <Badge variant="muted">{groupCount} / {g.permissions.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {g.permissions.map((p) => (
                      <label key={p.key} className="flex items-start gap-2.5 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-navy-700 cursor-pointer">
                        <Checkbox checked={perms.has(p.key)} onCheckedChange={() => toggle(p.key)} className="mt-0.5" />
                        <div>
                          <div className="text-sm text-navy-900 dark:text-white">{p.label}</div>
                          <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{p.key}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={`Delete role "${role?.name}"?`}
        description={`${role?.userCount ?? 0} users currently have this role. They will lose all permissions until reassigned.`}
        variant="danger"
        confirmLabel="Yes, delete role"
        requireReason
        onConfirm={() => { toast.success("Role deleted"); setConfirmDel(false); router.push("/admin/roles"); }}
      />
    </>
  );
}
