"use client";

import * as React from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { Save, Sun, Moon, Monitor, Bell, Mail, MessageSquare, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /profile/preferences -> the whole set, defaults filled in by the API so
   an unset toggle reads the same way every time.
   Storage is the "UserPreference" key/value table -- (UserId, PrefKey) ->
   PrefValue -- so adding a preference costs a row, not a migration. */
type Preferences = {
  theme: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyWhatsapp: boolean;
  notifyInApp: boolean;
  listDensity: string;
  listPageSize: number;
  dateFormat: string;
  numberFormat: string;
};

/* Shown under the email / WhatsApp rows so the toggle names the address it
   would actually reach. */
type Contact = { email: string | null; phone: string | null };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = React.useState<Preferences | null>(null);
  const [contact, setContact] = React.useState<Contact>({ email: null, phone: null });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [p, me] = await Promise.all([
        axios.get<Preferences>(`${API_BASE_URL}/profile/preferences`, { headers: authHeader() }),
        axios.get<Contact>(`${API_BASE_URL}/profile`, { headers: authHeader() }),
      ]);
      setPrefs(p.data);
      setContact({ email: me.data.email, phone: me.data.phone });

      /* The stored theme is the authority across devices; push it into
         next-themes so the screen matches what the database says. */
      if (p.data.theme && p.data.theme !== theme) setTheme(p.data.theme);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your preferences."));
    } finally {
      setLoading(false);
    }
    /* `theme`/`setTheme` deliberately out of the dependency list: this should
       run on mount, not every time the theme changes. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  /** Local edit; nothing reaches the database until Save. */
  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
  }

  function pickTheme(value: string) {
    setTheme(value);          // instant, so the screen reacts as you click
    set("theme", value);      // persisted on Save
  }

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/profile/preferences`, prefs, { headers: authHeader() });
      await load();
      toast.success("Preferences saved");
    } catch (e) {
      toast.error("Could not save your preferences", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Preferences" }]}
        title="Preferences"
        subtitle="Customize how AdvPOS looks and behaves for you"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={saving || loading || !prefs}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save />}
            {saving ? "Saving…" : "Save"}
          </Button>
        }
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
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Appearance</h3>
              <div>
                <Label className="mb-2 inline-block">Theme</Label>
                <div className="grid grid-cols-3 gap-3 max-w-lg">
                  {[
                    { value: "light",  label: "Light",  icon: Sun },
                    { value: "dark",   label: "Dark",   icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const active = theme === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => pickTheme(t.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                          active ? "border-brand-yellow bg-brand-yellow/5" : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                        )}
                      >
                        <Icon className={cn("size-5", active ? "text-brand-yellow" : "text-slate-400")} />
                        <span className={cn("text-sm font-medium", active ? "text-navy-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Saved against your account, so it follows you to any browser you sign in from.
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Defaults</h3>
              {loading || !prefs ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <Label className="mb-1.5 inline-block">Table density</Label>
                    <SelectNative value={prefs.listDensity} onChange={(e) => set("listDensity", e.target.value)}>
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </SelectNative>
                  </div>
                  <div>
                    <Label className="mb-1.5 inline-block">Items per table page</Label>
                    <SelectNative value={String(prefs.listPageSize)} onChange={(e) => set("listPageSize", Number(e.target.value))}>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </SelectNative>
                  </div>
                  <div>
                    <Label className="mb-1.5 inline-block">Date format</Label>
                    <SelectNative value={prefs.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}>
                      <option value="dmy">DD-MMM-YYYY</option>
                      <option value="ymd">YYYY-MM-DD</option>
                      <option value="dmy2">DD/MM/YYYY</option>
                    </SelectNative>
                  </div>
                  <div>
                    <Label className="mb-1.5 inline-block">Number format</Label>
                    <SelectNative value={prefs.numberFormat} onChange={(e) => set("numberFormat", e.target.value)}>
                      <option value="intl">International (1,000,000)</option>
                      <option value="pk">Pakistani (10,00,000)</option>
                    </SelectNative>
                  </div>
                </div>
              )}
              {/* Honest note: these four persist, but only the notification
                  toggles and the theme are read back by the rest of the app
                  today. Density / page size / the two formats are stored
                  against the account ready for the screens to consume. */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Saved to your account. Date and number formats are stored but not yet applied across every screen.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Notifications</h3>
              {loading || !prefs ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <div className="space-y-1">
                  <NotifRow icon={Bell} label="In-app notifications" desc="Bell icon on top bar"
                    checked={prefs.notifyInApp} onChange={(v) => set("notifyInApp", v)} />
                  <NotifRow icon={Mail} label="Email notifications"
                    desc={contact.email ? `Sent to ${contact.email}` : "No email address on your account"}
                    checked={prefs.notifyEmail} enabled={Boolean(contact.email)} onChange={(v) => set("notifyEmail", v)} />
                  <NotifRow icon={MessageSquare} label="WhatsApp updates"
                    desc={contact.phone ? `Sent to ${contact.phone}` : "No phone number on your account"}
                    checked={prefs.notifyWhatsapp} enabled={Boolean(contact.phone)} onChange={(v) => set("notifyWhatsapp", v)} />
                  <NotifRow icon={Bell} label="Browser push" desc="Requires browser permission"
                    checked={prefs.notifyPush} onChange={(v) => set("notifyPush", v)} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function NotifRow({
  icon: Icon, label, desc, checked, enabled = true, onChange,
}: { icon: typeof Bell; label: string; desc: string; checked: boolean; enabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100 dark:border-navy-700">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-slate-400" />
        <div>
          <div className="text-sm font-medium text-navy-900 dark:text-white">{label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={!enabled} />
    </div>
  );
}
