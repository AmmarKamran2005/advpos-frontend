"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Edit3, Lock, Mail, Phone, Calendar, AlertCircle, Trash2, KeyRound, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { getUser } from "@/data/admin";
import { formatDate } from "@/lib/format";
import { toast } from "@/components/ui/toaster";

const RECENT_ACTIVITY = [
  { id: 1, action: "Logged in",                    time: "2 min ago",     ip: "182.181.45.10" },
  { id: 2, action: "Dispatched order ORD-KHI-26-0142", time: "30 min ago", ip: "182.181.45.10" },
  { id: 3, action: "Confirmed order ORD-KHI-26-0141",  time: "1 hour ago", ip: "182.181.45.10" },
  { id: 4, action: "Logged in",                    time: "Yesterday",      ip: "182.181.45.10" },
];

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "1", 10);
  const u = getUser(id);
  const [resetPwd, setResetPwd] = React.useState(false);
  const [del, setDel] = React.useState(false);

  if (!u) return <EmptyState icon={AlertCircle} title="User not found" action={<Button asChild><Link href="/admin/users">Back</Link></Button>} />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users", href: "/admin/users" }, { label: u.fullName }]}
        title={
          <div className="flex items-center gap-3">
            <Avatar initials={u.initials} size="xl" />
            <div>
              <div>{u.fullName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular">{u.employeeCode}</span>
                {u.roles.map((r) => <Badge key={r} variant="info">{r}</Badge>)}
                {u.isActive ? <StatusPill variant="success">Active</StatusPill> : <StatusPill variant="muted">Inactive</StatusPill>}
                {u.isLocked && <StatusPill variant="danger">Locked</StatusPill>}
              </div>
            </div>
          </div>
        }
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/users"><ArrowLeft />Back</Link></Button>
            <Button variant="secondary" className="gap-1.5" asChild><Link href={`/admin/users/new?id=${u.id}`}><Edit3 />Edit</Link></Button>
            <Button variant="ghost" className="gap-1.5" onClick={() => setResetPwd(true)}><KeyRound />Reset Password</Button>
            <Button variant="ghost" className="text-danger" onClick={() => setDel(true)}><Trash2 />Delete</Button>
          </>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">User Information</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Meta label="Full Name" value={u.fullName} />
                  <Meta label="Employee Code" value={<span className="tabular">{u.employeeCode}</span>} />
                  <Meta label="Email" icon={Mail} value={u.email} />
                  <Meta label="Phone" icon={Phone} value={<span className="tabular">{u.phone}</span>} />
                  <Meta label="Created" icon={Calendar} value={formatDate(u.createdAt)} />
                  <Meta label="Last Login" value={u.lastLoginAt} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-navy-900 dark:text-white">Active</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">User can sign in</div>
                    </div>
                    <Switch checked={u.isActive} onCheckedChange={(v) => toast.success(v ? "User activated" : "User deactivated")} />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-navy-700">
                    <div>
                      <div className="text-sm font-medium text-navy-900 dark:text-white inline-flex items-center gap-1.5">
                        <Lock className="size-3.5" /> Account Lock
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Manually lock this account</div>
                    </div>
                    <Switch checked={u.isLocked} onCheckedChange={(v) => toast.success(v ? "Account locked" : "Account unlocked")} />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Assigned Roles</h3>
                <div className="space-y-3">
                  {u.roles.map((r) => (
                    <div key={r} className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div>
                        <div className="text-sm font-semibold text-navy-900 dark:text-white">{r}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">System role · 42 permissions</div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-danger">Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" className="w-full">+ Assign role</Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Branch Access</h3>
                <div className="space-y-3">
                  {u.branches.map((b) => (
                    <div key={b} className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <Badge variant="muted">{b}</Badge>
                      <Button variant="ghost" size="sm" className="text-danger">Remove</Button>
                    </div>
                  ))}
                  <Button variant="secondary" className="w-full">+ Grant branch access</Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardBody>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-navy-700">
                    <div>
                      <div className="text-sm text-navy-900 dark:text-white">{a.action}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">From {a.ip}</div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{a.time}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card><CardBody><p className="text-sm text-slate-500 dark:text-slate-400">3 active sessions across devices.</p></CardBody></Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetPwd}
        onOpenChange={setResetPwd}
        title="Reset this user's password?"
        description={`A password reset link will be emailed to ${u.email}. They will need to set a new password before signing in again.`}
        variant="info"
        confirmLabel="Send reset link"
        onConfirm={() => { toast.success("Reset link sent", { description: u.email }); setResetPwd(false); }}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`Delete ${u.fullName}?`}
        description="This will deactivate the user and revoke all access. The user record is preserved in the audit log but cannot be recovered for new sign-ins."
        variant="danger"
        confirmLabel="Yes, delete user"
        requireReason
        onConfirm={(r) => { toast.success("User deleted", { description: `Reason: ${r}` }); setDel(false); }}
      />
    </>
  );
}

function Meta({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Mail }) {
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
