"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import {
  Save, Building, Globe, Loader2, CheckCircle2, Package, Receipt, Truck,
  PackageX, SlidersHorizontal, AlertCircle, RefreshCw, Hash, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* ─────────────────────────── shapes from the API ─────────────────────────── */

type Company = {
  id: number;
  companyName: string;
  legalName: string | null;
  addressLine: string | null;
  cityId: number | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  ntn: string | null;
  strn: string | null;
  fiscalYearStartMonth: number;
  currencyCode: string;
  currencySymbol: string;
  foreignRate: number;
};

/** Exactly what `PUT /admin/company` accepts — id, city and foreignRate are read-only. */
type CompanyForm = Omit<Company, "id" | "city" | "foreignRate">;

type SettingRow = {
  id: number;
  group: string;
  key: string;
  value: string;
  description: string;
};

type City = { id: number; name: string; province: string };

type Lookups = { cities: City[] };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const GROUP_ICON: Record<string, typeof Package> = {
  stock: Package,
  sales: Receipt,
  delivery: Truck,
  claim: PackageX,
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

function toForm(c: Company): CompanyForm {
  return {
    companyName: c.companyName,
    legalName: c.legalName,
    addressLine: c.addressLine,
    cityId: c.cityId,
    country: c.country,
    phone: c.phone,
    email: c.email,
    ntn: c.ntn,
    strn: c.strn,
    fiscalYearStartMonth: c.fiscalYearStartMonth,
    currencyCode: c.currencyCode,
    currencySymbol: c.currencySymbol,
  };
}

const isBoolean = (v: string) => v === "true" || v === "false";
const isNumeric = (v: string) => v.trim() !== "" && !Number.isNaN(Number(v));

export default function SettingsPage() {
  const [company, setCompany] = React.useState<CompanyForm | null>(null);
  const [companyBase, setCompanyBase] = React.useState<CompanyForm | null>(null);
  const [settings, setSettings] = React.useState<SettingRow[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [cities, setCities] = React.useState<City[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRes, settingsRes, lookupRes] = await Promise.all([
        axios.get<Company>(`${API_BASE_URL}/admin/company`, { headers: authHeader() }),
        axios.get<SettingRow[]>(`${API_BASE_URL}/admin/settings`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/admin/lookups`, { headers: authHeader() }),
      ]);
      const form = toForm(companyRes.data);
      setCompany(form);
      setCompanyBase(form);
      setSettings(settingsRes.data);
      setValues(Object.fromEntries(settingsRes.data.map((s) => [s.key, s.value])));
      setCities(lookupRes.data.cities ?? []);
    } catch (e) {
      setError(apiMessage(e, "Could not load the settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  /* What actually changed — that is both the dirty flag and the PUT body. */
  const changedSettings = React.useMemo(
    () => settings.filter((s) => values[s.key] !== s.value).map((s) => ({ key: s.key, value: values[s.key] })),
    [settings, values]
  );

  const companyDirty = React.useMemo(
    () => (company && companyBase ? JSON.stringify(company) !== JSON.stringify(companyBase) : false),
    [company, companyBase]
  );

  const dirty = companyDirty || changedSettings.length > 0;

  React.useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const groups = React.useMemo(() => {
    const seen: string[] = [];
    for (const s of settings) if (!seen.includes(s.group)) seen.push(s.group);
    return seen;
  }, [settings]);

  function setField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setCompany((c) => (c ? { ...c, [key]: value } : c));
  }

  const save = React.useCallback(async () => {
    if (!company) return;
    setSaving(true);
    const messages: string[] = [];
    try {
      if (companyDirty) {
        const res = await axios.put<{ message?: string }>(`${API_BASE_URL}/admin/company`, company, {
          headers: authHeader(),
        });
        if (res.data?.message) messages.push(res.data.message);
      }
      if (changedSettings.length > 0) {
        const res = await axios.put<{ message?: string }>(`${API_BASE_URL}/admin/settings`, changedSettings, {
          headers: authHeader(),
        });
        if (res.data?.message) messages.push(res.data.message);
      }
      const time = new Date().toLocaleTimeString();
      setSavedAt(time);
      toast.success(messages.join(" ") || "Settings saved.", { description: `Applied at ${time}.` });
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "The settings could not be saved."));
    } finally {
      setSaving(false);
    }
  }, [company, companyDirty, changedSettings, load]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "System Settings" }]}
        title="System Settings"
        subtitle={savedAt ? `Last saved at ${savedAt}` : "Configure AdvPOS organisation-wide"}
        actions={
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-warning font-medium">● Unsaved changes</span>}
            {!dirty && savedAt && <span className="text-xs text-success font-medium inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" />Saved</span>}
            <Button variant="accent" size="md" className="gap-1.5" onClick={() => void save()} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </Button>
          </div>
        }
      />

      {loading ? (
        <PageSkeleton />
      ) : error || !company ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load the settings"
              description={error ?? "The company record came back empty."}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
            <TabsTrigger value="company"><Building className="size-3.5 mr-1.5" /> Company</TabsTrigger>
            <TabsTrigger value="locale"><Globe className="size-3.5 mr-1.5" /> Locale</TabsTrigger>
            {groups.map((g) => {
              const Icon = GROUP_ICON[g] ?? SlidersHorizontal;
              return (
                <TabsTrigger key={g} value={`group-${g}`} className="capitalize">
                  <Icon className="size-3.5 mr-1.5" /> {g}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Company Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name">
                    <Input value={company.companyName ?? ""} onChange={(e) => setField("companyName", e.target.value)} />
                  </Field>
                  <Field label="Legal Name">
                    <Input value={company.legalName ?? ""} onChange={(e) => setField("legalName", e.target.value)} />
                  </Field>
                  <Field label="NTN">
                    <Input value={company.ntn ?? ""} onChange={(e) => setField("ntn", e.target.value)} />
                  </Field>
                  <Field label="STRN">
                    <Input value={company.strn ?? ""} onChange={(e) => setField("strn", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={company.email ?? ""} onChange={(e) => setField("email", e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <Input value={company.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} />
                  </Field>
                  <Field label="City">
                    <SelectNative
                      value={company.cityId ?? ""}
                      onChange={(e) => setField("cityId", e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— Select a city —</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.province ? ` (${c.province})` : ""}</option>
                      ))}
                    </SelectNative>
                  </Field>
                  <Field label="Country">
                    <Input value={company.country ?? ""} onChange={(e) => setField("country", e.target.value)} />
                  </Field>
                  <Field label="Head Office Address" className="sm:col-span-2">
                    <Textarea
                      rows={3}
                      value={company.addressLine ?? ""}
                      onChange={(e) => setField("addressLine", e.target.value)}
                    />
                  </Field>
                </div>
              </CardBody>
            </Card>
          </TabsContent>

          <TabsContent value="locale">
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Currency &amp; Fiscal Year</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Currency Code">
                    <Input
                      value={company.currencyCode ?? ""}
                      onChange={(e) => setField("currencyCode", e.target.value.toUpperCase())}
                      maxLength={3}
                    />
                  </Field>
                  <Field label="Currency Symbol">
                    <Input value={company.currencySymbol ?? ""} onChange={(e) => setField("currencySymbol", e.target.value)} />
                  </Field>
                  <Field label="Fiscal Year Starts">
                    <SelectNative
                      value={company.fiscalYearStartMonth}
                      onChange={(e) => setField("fiscalYearStartMonth", Number(e.target.value))}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </SelectNative>
                  </Field>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                  Every ledger period, aging bucket and year-to-date figure is cut from the month chosen here — it
                  comes straight off the company record, so nothing else in the app can disagree with it.
                </p>
              </CardBody>
            </Card>
          </TabsContent>

          {groups.map((g) => (
            <TabsContent key={g} value={`group-${g}`}>
              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4 capitalize">{g} policy</h3>
                  <div className="divide-y divide-slate-100 dark:divide-navy-700">
                    {settings.filter((s) => s.group === g).map((s) => (
                      <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white">{s.key}</div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0 w-40 flex justify-end">
                          {isBoolean(s.value) ? (
                            <Switch
                              checked={values[s.key] === "true"}
                              onCheckedChange={(on) =>
                                setValues((v) => ({ ...v, [s.key]: on ? "true" : "false" }))
                              }
                              aria-label={s.key}
                            />
                          ) : (
                            <Input
                              type={isNumeric(s.value) ? "number" : "text"}
                              value={values[s.key] ?? ""}
                              onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                              aria-label={s.key}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* What this screen deliberately does not own. */}
      <Card className="mt-6">
        <CardBody>
          <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Configured elsewhere</h3>
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-2.5">
              <Hash className="size-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Document prefixes, year suffixes and next numbers are edited in{" "}
                <Link href="/admin/numbering" className="text-brand-yellow font-medium inline-flex items-center gap-0.5">
                  Setup → Numbering <ArrowRight className="size-3" />
                </Link>
                , which is the single source of truth for every series.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <SlidersHorizontal className="size-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mail (SMTP), Cloudinary and other third-party credentials live on the server in{" "}
                <code className="bg-slate-100 dark:bg-navy-700 px-1.5 py-0.5 rounded font-mono text-2xs">appsettings.json</code>.
                There is no table behind them, so they are not editable from the web app.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">{label}</label>
      {children}
    </div>
  );
}
