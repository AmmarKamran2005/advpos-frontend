"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Save, Shield, Lock, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

type PermissionGroup = { module: string; permissions: { key: string; label: string }[] };

type RoleDetail = {
  id: number;
  key: string;
  name: string;
  description: string;
  homePath: string;
  isSystem: boolean;
  isStaffRole: boolean;
  userCount: number;
  permissions: string[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function RoleEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const parsed = parseInt(params?.id ?? "0", 10);
  const id = Number.isNaN(parsed) ? 0 : parsed;
  const isNew = id === 0;

  const [groups, setGroups] = React.useState<PermissionGroup[]>([]);
  const [role, setRole] = React.useState<RoleDetail | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [homePath, setHomePath] = React.useState("/dashboard");
  const [perms, setPerms] = React.useState<Set<string>>(() => new Set<string>());

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);

  /* The catalogue is the only source of permission keys — there is no inline
     list any more. An existing role additionally seeds the ticked boxes. */
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const catalogue = await axios.get<PermissionGroup[]>(`${API_BASE_URL}/admin/permissions`, {
        headers: authHeader(),
      });
      setGroups(catalogue.data);

      if (isNew) {
        setRole(null);
        setName("");
        setDescription("");
        setHomePath("/dashboard");
        setPerms(new Set<string>());
      } else {
        const res = await axios.get<RoleDetail>(`${API_BASE_URL}/admin/roles/${id}`, {
          headers: authHeader(),
        });
        setRole(res.data);
        setName(res.data.name ?? "");
        setDescription(res.data.description ?? "");
        setHomePath(res.data.homePath || "/dashboard");
        setPerms(new Set(res.data.permissions ?? []));
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(apiMessage(e, "Could not load this role."));
      }
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const allKeys = React.useMemo(
    () => groups.flatMap((g) => g.permissions.map((p) => p.key)),
    [groups]
  );

  function toggle(key: string) {
    setPerms((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: PermissionGroup) {
    const allHave = group.permissions.every((p) => perms.has(p.key));
    setPerms((cur) => {
      const next = new Set(cur);
      group.permissions.forEach((p) => (allHave ? next.delete(p.key) : next.add(p.key)));
      return next;
    });
  }

  async function save() {
    /* Client-side guards mirror the server so the round trip is skipped —
       if the server still refuses, its message wins below. */
    if (!name || name.trim().length < 2) {
      toast.error("Role name is required");
      return;
    }
    if (perms.size === 0) {
      toast.error("Pick at least one permission");
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      homePath: homePath.trim() || "/dashboard",
      permissions: Array.from(perms),
    };
    try {
      if (isNew) {
        const res = await axios.post<{ id: number; message: string }>(
          `${API_BASE_URL}/admin/roles`,
          body,
          { headers: authHeader() }
        );
        toast.success(res.data.message);
        router.push("/admin/roles");
      } else {
        const res = await axios.put<{ message: string }>(
          `${API_BASE_URL}/admin/roles/${id}`,
          body,
          { headers: authHeader() }
        );
        toast.success(res.data.message);
        await load();
      }
    } catch (e) {
      toast.error(apiMessage(e, "Could not save this role."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(reason?: string) {
    setDeleting(true);
    try {
      const res = await axios.delete<{ message: string }>(`${API_BASE_URL}/admin/roles/${id}`, {
        headers: authHeader(),
        data: { reason: reason ?? "" },
      });
      toast.success(res.data.message);
      setConfirmDel(false);
      router.push("/admin/roles");
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete this role."));
    } finally {
      setDeleting(false);
    }
  }

  if (notFound) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Role not found"
        action={
          <Button asChild>
            <Link href="/admin/roles">Back</Link>
          </Button>
        }
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not load this role"
        description={error}
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/admin/roles">
                <ArrowLeft />
                Back
              </Link>
            </Button>
            <Button variant="accent" onClick={() => void load()}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full mt-4" />
              <Skeleton className="h-9 w-24 mt-6" />
            </CardBody>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-navy-700">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-12 rounded-md" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
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
                  <div className="text-2xl tabular font-bold text-brand-yellow mt-1">{perms.size} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">/ {allKeys.length}</span></div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={Shield}
                  title="No permissions defined"
                  description="The server returned an empty permission catalogue, so there is nothing to assign yet."
                />
              </CardBody>
            </Card>
          ) : (
            groups.map((g) => {
              const groupCount = g.permissions.filter((p) => perms.has(p.key)).length;
              const allChecked = groupCount === g.permissions.length && g.permissions.length > 0;
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
            })
          )}
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
        loading={deleting}
        onConfirm={(reason) => remove(reason)}
      />
    </>
  );
}
