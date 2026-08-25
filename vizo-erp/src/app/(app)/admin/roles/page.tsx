"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Shield, Users, Lock, Edit3, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

type RoleRow = {
  id: number;
  key: string;
  name: string;
  description: string;
  homePath: string;
  isSystem: boolean;
  isStaffRole: boolean;
  userCount: number;
  permissionCount: number;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* One card, drawn the same way whether it links somewhere or not. */
function RoleCard({ r, editable }: { r: RoleRow; editable: boolean }) {
  return (
    <Card className={`${editable ? "cursor-pointer hover:border-brand-yellow/40" : ""} transition-colors group h-full`}>
      <CardBody>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`size-12 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow ${editable ? "group-hover:bg-brand-yellow group-hover:text-navy-900" : ""} transition-colors`}>
            <Shield className="size-5" />
          </div>
          {!editable ? (
            <Badge variant="muted" className="gap-1">
              <Lock className="size-3" />
              Directory
            </Badge>
          ) : r.isSystem ? (
            <Badge variant="accent" className="gap-1">
              <Lock className="size-3" />
              System
            </Badge>
          ) : (
            <Edit3 className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
          )}
        </div>
        <h3 className="text-base font-semibold text-navy-900 dark:text-white">{r.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{r.description}</p>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
          <div>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Users</div>
            <div className="text-base font-bold text-navy-900 dark:text-white mt-1 inline-flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              {r.userCount}
            </div>
          </div>
          <div>
            <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Permissions</div>
            <div className="text-base font-bold text-navy-900 dark:text-white mt-1">{r.permissionCount}</div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function RolesPage() {
  const [rows, setRows] = React.useState<RoleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<RoleRow[]>(`${API_BASE_URL}/admin/roles`, { headers: authHeader() });
      setRows(res.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load roles."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  /* Staff roles are the ones a person signs in with, so those are the only
     ones the editor should touch. Customer / Supplier / Customer & Supplier
     are directory classifications on the party ledger — they carry no screen
     permissions and renaming or re-permissioning them would break posting. */
  const staffRoles = React.useMemo(() => rows.filter((r) => r.isStaffRole), [rows]);
  const otherRoles = React.useMemo(() => rows.filter((r) => !r.isStaffRole), [rows]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Roles & Permissions" }]}
        title="Roles & Permissions"
        subtitle="Define what each user role can access"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" asChild>
            <Link href="/admin/roles/0">
              <Plus />
              <span>New Role</span>
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardBody>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Skeleton className="size-12 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full mt-2.5" />
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load roles"
              description={error}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Shield}
              title="No roles yet"
              description="Create the first role to decide what your staff can reach."
              action={
                <Button variant="accent" asChild>
                  <Link href="/admin/roles/0">
                    <Plus />
                    New Role
                  </Link>
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffRoles.map((r) => (
              <Link key={r.id} href={`/admin/roles/${r.id}`}>
                <RoleCard r={r} editable />
              </Link>
            ))}
          </div>

          {otherRoles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-navy-900 dark:text-white">Directory roles</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                Customers and suppliers are classified with these. They are not sign-in roles and carry no screen
                permissions, so they cannot be edited here.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherRoles.map((r) => (
                  <RoleCard key={r.id} r={r} editable={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
