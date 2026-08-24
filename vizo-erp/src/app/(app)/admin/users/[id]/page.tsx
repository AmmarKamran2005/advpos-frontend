"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Edit3, Lock, Mail, Phone, Calendar, AlertCircle, Trash2, KeyRound, ArrowLeft,
  Activity as ActivityIcon, MapPin, ShieldCheck, Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { formatDate, formatRelative } from "@/lib/format";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* ── shapes returned by GET /admin/users/{id}, /activity and /admin/lookups ── */

type UserLocation = { locationId: number; locationCode: string; locationName: string };

type UserDetail = {
  id: number;
  fullName: string;
  initials: string;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  roleId: number;
  roleKey: string;
  roles: string[];
  permissionCount: number;
  primaryLocationId: number | null;
  locations: UserLocation[];
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type ActivityRow = {
  id: number;
  action: string;
  entity: string | null;
  detail: string | null;
  ip: string | null;
  time: string;
  severity: string | null;
};

type Lookups = {
  roles: { id: number; key: string; name: string; description: string; permissionCount: number }[];
  locations: { id: number; code: string; name: string }[];
};

type PillVariant = "success" | "warning" | "danger" | "info" | "muted" | "accent";

const SEVERITY: Record<string, PillVariant> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
  muted: "muted",
};

/** Pull `{ message }` off an axios error, or say the server is unreachable. */
function apiMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return (err.response.data as { message?: string } | undefined)?.message ?? fallback;
    }
    return "Cannot reach the server.";
  }
  return fallback;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [activity, setActivity] = React.useState<ActivityRow[]>([]);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [resetPwd, setResetPwd] = React.useState(false);
  const [del, setDel] = React.useState(false);

  /* `silent` keeps the page on screen while a refresh after a mutation runs —
     dropping back to a skeleton on every switch toggle reads as a slow screen. */
  const load = React.useCallback(async (silent = false) => {
    if (!Number.isFinite(id)) {
      setError("That user id is not valid.");
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [detail, log, lists] = await Promise.all([
        axios.get<UserDetail>(`${API_BASE_URL}/admin/users/${id}`, { headers: authHeader() }),
        axios.get<ActivityRow[]>(`${API_BASE_URL}/admin/users/${id}/activity`, {
          params: { take: 20 },
          headers: authHeader(),
        }),
        axios.get<Lookups>(`${API_BASE_URL}/admin/lookups`, { headers: authHeader() }),
      ]);
      setUser(detail.data);
      setActivity(log.data ?? []);
      setLookups(lists.data);
    } catch (err) {
      setUser(null);
      setActivity([]);
      setError(apiMessage(err, "Could not load this user."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  /* ── mutations ─────────────────────────────────────────────────────────── */

  async function patchFlag(field: "active" | "lock", value: boolean) {
    setBusy(true);
    try {
      const res = await axios.patch<{ message?: string }>(
        `${API_BASE_URL}/admin/users/${id}/${field}`,
        { value },
        { headers: authHeader() }
      );
      toast.success(res.data?.message ?? "Saved.");
      await load(true);
    } catch (err) {
      toast.error(apiMessage(err, "Could not save that change."));
      /* pull the switch back to whatever the server actually holds */
      await load(true);
    } finally {
      setBusy(false);
    }
  }

  /** PUT the whole user back with one field swapped — the API takes the full body. */
  async function saveAccess(changes: { roleId?: number; locationIds?: number[] }) {
    if (!user) return;
    setBusy(true);
    try {
      const res = await axios.put<{ message?: string }>(
        `${API_BASE_URL}/admin/users/${id}`,
        {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          employeeCode: user.employeeCode,
          roleId: changes.roleId ?? user.roleId,
          locationIds: changes.locationIds ?? user.locations.map((l) => l.locationId),
          isActive: user.isActive,
          sendInvite: false,
          password: null,
        },
        { headers: authHeader() }
      );
      toast.success(res.data?.message ?? "Saved.");
      await load(true);
    } catch (err) {
      toast.error(apiMessage(err, "Could not save that change."));
    } finally {
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    setBusy(true);
    try {
      const res = await axios.post<{ message?: string }>(
        `${API_BASE_URL}/admin/users/${id}/password-reset`,
        {},
        { headers: authHeader() }
      );
      toast.success(res.data?.message ?? "Reset link sent.", { description: user?.email ?? undefined });
      setResetPwd(false);
    } catch (err) {
      toast.error(apiMessage(err, "Could not send the reset link."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(reason?: string) {
    setBusy(true);
    try {
      /* axios only sends a DELETE body when it is handed over as `data`. */
      const res = await axios.delete<{ message?: string }>(`${API_BASE_URL}/admin/users/${id}`, {
        headers: authHeader(),
        data: { reason },
      });
      toast.success(res.data?.message ?? "User deleted.");
      setDel(false);
      router.push("/admin/users");
    } catch (err) {
      toast.error(apiMessage(err, "Could not delete this user."));
    } finally {
      setBusy(false);
    }
  }

  /* ── loading / error ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <>
        <div className="mb-6 space-y-3">
          <Skeleton className="h-3 w-52" />
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2"><CardBody><SkeletonText lines={6} /></CardBody></Card>
          <Card><CardBody><SkeletonText lines={4} /></CardBody></Card>
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="User not found"
        description={error ?? "This user is no longer available."}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void load()}>Try again</Button>
            <Button asChild><Link href="/admin/users">Back to users</Link></Button>
          </div>
        }
      />
    );
  }

  const u = user;
  const roleName = u.roles[0] ?? lookups?.roles.find((r) => r.id === u.roleId)?.name ?? "No role";
  const grantedIds = new Set(u.locations.map((l) => l.locationId));
  const grantableLocations = (lookups?.locations ?? []).filter((l) => !grantedIds.has(l.id));

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
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular">{u.employeeCode ?? "—"}</span>
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
          <TabsTrigger value="permissions">Roles &amp; Permissions</TabsTrigger>
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
                  <Meta label="Employee Code" value={<span className="tabular">{u.employeeCode ?? "—"}</span>} />
                  <Meta label="Email" icon={Mail} value={u.email ?? "—"} />
                  <Meta label="Phone" icon={Phone} value={<span className="tabular">{u.phone ?? "—"}</span>} />
                  <Meta label="Created" icon={Calendar} value={formatDate(u.createdAt)} />
                  <Meta label="Last Login" value={u.lastLoginAt ? formatRelative(u.lastLoginAt) : "Never"} />
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
                    <Switch checked={u.isActive} disabled={busy} onCheckedChange={(v) => void patchFlag("active", v)} />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-navy-700">
                    <div>
                      <div className="text-sm font-medium text-navy-900 dark:text-white inline-flex items-center gap-1.5">
                        <Lock className="size-3.5" /> Account Lock
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Manually lock this account</div>
                    </div>
                    <Switch checked={u.isLocked} disabled={busy} onCheckedChange={(v) => void patchFlag("lock", v)} />
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
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Assigned Role</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div>
                      <div className="text-sm font-semibold text-navy-900 dark:text-white">{roleName}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400">{u.permissionCount} permissions</div>
                    </div>
                  </div>
                  {/* One role per user is all the API carries, so this swaps the
                      role rather than adding a second one. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="w-full" disabled={busy || !lookups}>Change role</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Pick a role</DropdownMenuLabel>
                      {(lookups?.roles ?? []).map((r) => (
                        <DropdownMenuItem
                          key={r.id}
                          onSelect={() => { if (r.id !== u.roleId) void saveAccess({ roleId: r.id }); }}
                        >
                          {r.id === u.roleId ? <Check /> : <ShieldCheck />}
                          <span className="flex-1">
                            <span className="block">{r.name}</span>
                            <span className="block text-2xs text-slate-500 dark:text-slate-400">{r.permissionCount} permissions</span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Location Access</h3>
                <div className="space-y-3">
                  {u.locations.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No locations granted yet.</p>
                  )}
                  {u.locations.map((b) => (
                    <div key={b.locationId} className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="muted">{b.locationCode}</Badge>
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{b.locationName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        disabled={busy}
                        onClick={() => void saveAccess({ locationIds: u.locations.filter((l) => l.locationId !== b.locationId).map((l) => l.locationId) })}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="w-full" disabled={busy || grantableLocations.length === 0}>
                        {grantableLocations.length === 0 ? "All locations granted" : "+ Grant location access"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Add a location</DropdownMenuLabel>
                      {grantableLocations.map((l) => (
                        <DropdownMenuItem
                          key={l.id}
                          onSelect={() => void saveAccess({ locationIds: [...u.locations.map((x) => x.locationId), l.id] })}
                        >
                          <MapPin />
                          <span className="flex-1">
                            <span className="block">{l.name}</span>
                            <span className="block text-2xs tabular text-slate-500 dark:text-slate-400">{l.code}</span>
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardBody>
              {activity.length === 0 ? (
                <EmptyState
                  icon={ActivityIcon}
                  title="Nothing recorded yet"
                  description="Actions this user takes will show up here."
                />
              ) : (
                <div className="space-y-3">
                  {activity.map((a) => {
                    const variant = SEVERITY[a.severity ?? "muted"] ?? "muted";
                    return (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0 border-slate-100 dark:border-navy-700">
                        <div className="min-w-0">
                          <div className="text-sm text-navy-900 dark:text-white inline-flex items-center gap-2">
                            <Badge variant={variant}>{a.action}</Badge>
                            <span className="truncate">{a.detail ?? a.entity ?? ""}</span>
                          </div>
                          {a.ip && (
                            <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 tabular">From {a.ip}</div>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{formatRelative(a.time)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Session listing is not implemented — the API has no endpoint for signed-in
                sessions yet. Use Account Lock on the Profile tab to stop this user signing in.
              </p>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetPwd}
        onOpenChange={setResetPwd}
        title="Reset this user's password?"
        description={`A password reset link will be emailed to ${u.email ?? "this user"}. They will need to set a new password before signing in again.`}
        variant="info"
        confirmLabel="Send reset link"
        loading={busy}
        onConfirm={() => sendPasswordReset()}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`Delete ${u.fullName}?`}
        description="This will deactivate the user and revoke all access. The user record is preserved in the audit log but cannot be recovered for new sign-ins."
        variant="danger"
        confirmLabel="Yes, delete user"
        requireReason
        loading={busy}
        onConfirm={(r) => deleteUser(r)}
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
