"use client";

import * as React from "react";
import axios from "axios";
import {
  Bell, BellOff, Smartphone, Laptop, AlertCircle, Loader2, Send, Trash2, Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { checkSupport, enablePush, disablePush, isSubscribed, currentPermission } from "@/lib/push";

/* GET /push/preferences */
type PrefItem = {
  kind: string;
  group: string;
  label: string;
  description: string;
  pushEnabled: boolean;
  bellEnabled: boolean;
};
type PrefGroup = { group: string; items: PrefItem[] };
type PrefResponse = { pushConfigured: boolean; groups: PrefGroup[] };

/* GET /push/devices */
type Device = { id: number; device: string | null; since: string; lastUsed: string | null };
type DeviceResponse = { count: number; items: Device[] };

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** A user-agent string is unreadable; this is enough to tell two devices apart. */
function describeDevice(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge"
      : /OPR\//.test(ua) ? "Opera"
      : /Chrome\//.test(ua) ? "Chrome"
      : /Firefox\//.test(ua) ? "Firefox"
      : /Safari\//.test(ua) ? "Safari"
      : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows"
      : /Android/.test(ua) ? "Android"
      : /iPhone|iPad|iPod/.test(ua) ? "iPhone or iPad"
      : /Mac OS X/.test(ua) ? "Mac"
      : /Linux/.test(ua) ? "Linux"
      : "";
  return os ? `${browser} on ${os}` : browser;
}

function isMobile(ua: string | null) {
  return Boolean(ua && /Android|iPhone|iPad|iPod|Mobile/.test(ua));
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = React.useState<PrefResponse | null>(null);
  const [devices, setDevices] = React.useState<DeviceResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [thisDeviceOn, setThisDeviceOn] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);

  const support = React.useMemo(() => checkSupport(), []);
  const [permission, setPermission] = React.useState<string>("default");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, sub] = await Promise.all([
        axios.get<PrefResponse>(`${API_BASE_URL}/push/preferences`, { headers: authHeader() }),
        axios.get<DeviceResponse>(`${API_BASE_URL}/push/devices`, { headers: authHeader() }),
        isSubscribed(),
      ]);
      setPrefs(p.data);
      setDevices(d.data);
      setThisDeviceOn(sub);
      setPermission(currentPermission());
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your notification settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  async function toggleThisDevice() {
    setWorking(true);
    try {
      const result = thisDeviceOn ? await disablePush() : await enablePush();
      if (result.ok) {
        toast.success(result.message);
        setThisDeviceOn(!thisDeviceOn);
        await load();
      } else {
        toast.error(result.message);
      }
      setPermission(currentPermission());
    } finally {
      setWorking(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await axios.post<{ message: string }>(
        `${API_BASE_URL}/push/test`, {}, { headers: authHeader() }
      );
      toast.success(res.data.message);
    } catch (e) {
      toast.error(apiMessage(e, "The test notification could not be sent."));
    } finally {
      setTesting(false);
    }
  }

  async function setPref(item: PrefItem, next: { pushEnabled?: boolean; bellEnabled?: boolean }) {
    const pushEnabled = next.pushEnabled ?? item.pushEnabled;
    const bellEnabled = next.bellEnabled ?? item.bellEnabled;

    /* Painted immediately. A switch that waits for a round trip before moving
       feels broken, and this one is reverted below if the save fails. */
    setPrefs((prev) =>
      prev
        ? {
            ...prev,
            groups: prev.groups.map((g) => ({
              ...g,
              items: g.items.map((i) =>
                i.kind === item.kind ? { ...i, pushEnabled, bellEnabled } : i
              ),
            })),
          }
        : prev
    );

    setSaving(item.kind);
    try {
      await axios.put(
        `${API_BASE_URL}/push/preferences`,
        { kind: item.kind, pushEnabled, bellEnabled },
        { headers: authHeader() }
      );
    } catch (e) {
      toast.error(apiMessage(e, "That setting was not saved."));
      await load();
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Notifications" }]}
        title="Notifications"
        subtitle="Where they arrive, and which ones you want"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <ProfileSidebar />

        <div className="flex-1 min-w-0 space-y-6">
          {error && (
            <Card className="p-4 border-danger/40">
              <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-danger shrink-0" />
                <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
                <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
              </div>
            </Card>
          )}

          {/* This device */}
          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                    This device
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {thisDeviceOn
                      ? "Notifications appear on this device even when AdvPOS is closed."
                      : "Turn this on to get notifications on this device's lock screen."}
                  </p>
                </div>
                {support.supported && prefs?.pushConfigured && (
                  <Button
                    variant={thisDeviceOn ? "secondary" : "accent"}
                    className="gap-1.5 shrink-0"
                    disabled={working}
                    onClick={() => void toggleThisDevice()}
                  >
                    {working
                      ? <Loader2 className="size-4 animate-spin" />
                      : thisDeviceOn ? <BellOff /> : <Bell />}
                    {thisDeviceOn ? "Turn off" : "Turn on"}
                  </Button>
                )}
              </div>

              {/* The honest reasons this can be impossible */}
              {!support.supported && (
                <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2.5">
                  <Info className="size-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-navy-900 dark:text-white">{support.reason}</p>
                </div>
              )}

              {support.supported && prefs && !prefs.pushConfigured && (
                <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2.5">
                  <Info className="size-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-sm text-navy-900 dark:text-white">
                    Push notifications are not set up on the server yet. The bell in the header
                    still works — only lock-screen notifications are unavailable.
                  </p>
                </div>
              )}

              {support.supported && permission === "denied" && (
                <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/30 flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-danger shrink-0 mt-0.5" />
                  <p className="text-sm text-navy-900 dark:text-white">
                    This browser is blocking notifications for AdvPOS. Allow them in the
                    browser&apos;s site settings, then come back and turn them on.
                  </p>
                </div>
              )}

              {thisDeviceOn && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                  <Button variant="secondary" size="sm" className="gap-1.5" disabled={testing} onClick={() => void sendTest()}>
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <Send />}
                    Send a test notification
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Every device this person has turned on */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">Your devices</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                Each browser you turn notifications on in is listed separately.
              </p>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !devices || devices.items.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No device is set up yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-navy-700">
                  {devices.items.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 py-3">
                      {isMobile(d.device)
                        ? <Smartphone className="size-4 text-slate-400 shrink-0" />
                        : <Laptop className="size-4 text-slate-400 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-navy-900 dark:text-white">
                          {describeDevice(d.device)}
                        </div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Added {formatDate(d.since)}
                          {d.lastUsed ? ` · last used ${formatDate(d.lastUsed)}` : " · not used yet"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* What to send */}
          <Card>
            <CardBody>
              <h2 className="text-base font-semibold text-navy-900 dark:text-white">
                What to tell you about
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-1">
                <strong>Bell</strong> puts it in the header. <strong>Push</strong> also sends it to
                your devices.
              </p>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mb-4">
                Turn off the noisy ones rather than all of them — otherwise the important
                alerts go quiet too.
              </p>

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !prefs ? null : (
                <div className="space-y-6">
                  {prefs.groups.map((g) => (
                    <div key={g.group}>
                      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        {g.group}
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-navy-700">
                        {g.items.map((item) => (
                          <div key={item.kind} className="flex items-start gap-4 py-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-navy-900 dark:text-white flex items-center gap-2">
                                {item.label}
                                {saving === item.kind && (
                                  <Loader2 className="size-3 animate-spin text-slate-400" />
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {item.description}
                              </div>
                            </div>

                            <div className="flex items-center gap-5 shrink-0 pt-0.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                                  Bell
                                </span>
                                <Switch
                                  checked={item.bellEnabled}
                                  onCheckedChange={(v) => void setPref(item, { bellEnabled: v })}
                                />
                              </label>
                              <label className={cn("flex items-center gap-2 cursor-pointer",
                                !item.bellEnabled && "opacity-50")}>
                                <span className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                                  Push
                                </span>
                                <Switch
                                  checked={item.pushEnabled}
                                  onCheckedChange={(v) => void setPref(item, { pushEnabled: v })}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
