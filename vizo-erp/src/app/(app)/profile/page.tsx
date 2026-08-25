"use client";

import * as React from "react";
import axios from "axios";
import { AlertCircle, RefreshCw, Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { formatDate, formatRelative } from "@/lib/format";

/* GET /profile -> the signed-in person's own record.
   The four Account Activity tiles are counted off ActivityLog by the API. They
   used to be hard-coded ("248 logins", "3 devices"); every number on this
   screen now comes from the database or is not shown. */
type Profile = {
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  initials: string;
  roleId: number;
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
  primaryLocationId: number | null;
  primaryLocationName: string | null;
  employeeCode: string | null;
  joinedOn: string | null;
  isLocked: boolean;
  lastLoginAt: string | null;
  totalLogins: number;
  lastSeenAt: string | null;
  knownIpCount: number;
};

type LocationOption = { id: number; code: string; name: string };

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** Never, or the shared relative formatter (which reads the API's naive
    timestamps as UTC -- see parseApiDate in lib/format). */
function relative(iso: string | null): string {
  return iso ? formatRelative(iso) : "Never";
}

export default function ProfilePage() {
  const { user, refresh } = useSession();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [locations, setLocations] = React.useState<LocationOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* The editable copy. Kept apart from `profile` so Cancel can put the form
     back without another round trip. */
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [locationId, setLocationId] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const applyToForm = React.useCallback((p: Profile) => {
    setFullName(p.fullName);
    setPhone(p.phone ?? "");
    setLocationId(p.primaryLocationId ? String(p.primaryLocationId) : "");
  }, []);

  const load = React.useCallback(async () => {
    try {
      const [me, locs] = await Promise.all([
        axios.get<Profile>(`${API_BASE_URL}/profile`, { headers: authHeader() }),
        axios.get<LocationOption[]>(`${API_BASE_URL}/profile/locations`, { headers: authHeader() }),
      ]);
      setProfile(me.data);
      setLocations(locs.data);
      applyToForm(me.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  }, [applyToForm]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  async function save() {
    if (!fullName.trim()) {
      toast.error("Your name cannot be blank.");
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/profile`,
        {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          primaryLocationId: locationId ? Number(locationId) : null,
        },
        { headers: authHeader() }
      );
      /* Re-read rather than patch local state: the API trims and normalises,
         and the top-bar avatar reads the session, so both must catch up. */
      await load();
      await refresh();
      toast.success("Profile saved");
    } catch (e) {
      toast.error("Could not save your profile", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    profile !== null &&
    (fullName !== profile.fullName ||
      phone !== (profile.phone ?? "") ||
      locationId !== (profile.primaryLocationId ? String(profile.primaryLocationId) : ""));

  if (!user) return null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile" }]}
        title="My Profile"
        subtitle="Manage your personal information and preferences"
      />

      {error && (
        <Card className="mb-6">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                The API must be running on {API_BASE_URL}.
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1"><ProfileSidebar /></div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Personal Information</h3>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : profile ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Full Name">
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </Field>
                    <Field label="Email" hint="Your sign-in identity — changed by a Super Admin">
                      <Input type="email" value={profile.email ?? ""} disabled />
                    </Field>
                    <Field label="Phone">
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300 0000000" />
                    </Field>
                    <Field label="Employee Code">
                      <Input value={profile.employeeCode ?? "—"} disabled />
                    </Field>
                    <Field label="Default Location">
                      <SelectNative value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                        <option value="">None</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </SelectNative>
                    </Field>
                    <Field label="Role" hint="Set by a Super Admin at /admin/users">
                      <Input value={profile.roleLabel} disabled />
                    </Field>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                    <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={saving || !dirty}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => applyToForm(profile)} disabled={saving || !dirty}>
                      Cancel
                    </Button>
                    {dirty && !saving && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Unsaved changes</span>
                    )}
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Account Activity</h3>
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : profile ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Stat label="Member Since" value={profile.joinedOn ? formatDate(profile.joinedOn) : formatDate(profile.createdAt)} />
                  <Stat label="Total Logins" value={String(profile.totalLogins)} />
                  <Stat label="Last Login" value={relative(profile.lastSeenAt ?? profile.lastLoginAt)} />
                  {/* No device table exists, so this counts distinct sign-in IPs
                      rather than inventing "3 devices active". */}
                  <Stat label="Known IPs" value={String(profile.knownIpCount)} />
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-base font-bold text-navy-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}
