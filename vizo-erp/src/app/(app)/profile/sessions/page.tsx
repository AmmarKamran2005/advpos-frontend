"use client";

import * as React from "react";
import { Smartphone, Monitor, Tablet, Globe, MapPin, Clock, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";

type Session = {
  id: number;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

const SESSIONS: Session[] = [
  { id: 1, device: "desktop", browser: "Chrome 122",  os: "Windows 11",  ip: "182.181.45.10", location: "Karachi, Pakistan", lastActive: "Now",            isCurrent: true  },
  { id: 2, device: "mobile",  browser: "Safari",      os: "iOS 18",      ip: "39.40.123.55",  location: "Karachi, Pakistan", lastActive: "2 hours ago",     isCurrent: false },
  { id: 3, device: "desktop", browser: "Edge 122",    os: "Windows 11",  ip: "182.181.45.10", location: "Karachi, Pakistan", lastActive: "Yesterday",       isCurrent: false },
  { id: 4, device: "tablet",  browser: "Chrome 122",  os: "iPad OS",     ip: "203.135.10.42", location: "Lahore, Pakistan",  lastActive: "5 days ago",      isCurrent: false },
];

const ICON_MAP = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

export default function SessionsPage() {
  const [revokeId, setRevokeId] = React.useState<number | null>(null);
  const [signOutAll, setSignOutAll] = React.useState(false);
  const [list, setList] = React.useState(SESSIONS);

  function revoke(id: number) {
    setList((cur) => cur.filter((s) => s.id !== id));
    toast.success("Session revoked", { description: "Device has been signed out." });
  }

  function revokeAllOthers() {
    setList((cur) => cur.filter((s) => s.isCurrent));
    toast.success("All other sessions signed out");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Sessions" }]}
        title="Active Sessions"
        subtitle={`${list.length} device${list.length === 1 ? "" : "s"} currently signed in to your account`}
        actions={
          <Button variant="danger" size="md" onClick={() => setSignOutAll(true)} disabled={list.length <= 1}>
            Sign out all other sessions
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1"><ProfileSidebar /></div>

        <div className="lg:col-span-3 space-y-3">
          {list.map((s) => {
            const Icon = ICON_MAP[s.device];
            return (
              <Card key={s.id} className={s.isCurrent ? "border-brand-yellow/40" : ""}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-xl bg-slate-100 dark:bg-navy-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{s.browser} on {s.os}</h3>
                        {s.isCurrent && <Badge variant="accent">This device</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5"><Globe className="size-3 text-slate-400" />{s.ip}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3 text-slate-400" />{s.location}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock className="size-3 text-slate-400" />{s.lastActive}</span>
                      </div>
                    </div>
                    {!s.isCurrent && (
                      <Button variant="ghost" size="sm" className="text-danger gap-1" onClick={() => setRevokeId(s.id)}>
                        <X className="size-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={revokeId !== null}
        onOpenChange={(o) => { if (!o) setRevokeId(null); }}
        title="Revoke this session?"
        description="The signed-in device will be immediately signed out and will need to sign in again."
        variant="danger"
        confirmLabel="Revoke session"
        onConfirm={() => { if (revokeId !== null) revoke(revokeId); setRevokeId(null); }}
      />
      <ConfirmDialog
        open={signOutAll}
        onOpenChange={setSignOutAll}
        title="Sign out all other sessions?"
        description="All other browsers and devices will be immediately signed out. This is useful if you suspect unauthorized access."
        variant="danger"
        confirmLabel="Sign out all"
        onConfirm={() => { revokeAllOthers(); setSignOutAll(false); }}
      />
    </>
  );
}
