"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Save, Sun, Moon, Monitor, Bell, Mail, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const [emailNotifs, setEmailNotifs] = React.useState(true);
  const [pushNotifs, setPushNotifs] = React.useState(false);
  const [smsNotifs, setSmsNotifs] = React.useState(true);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Preferences" }]}
        title="Preferences"
        subtitle="Customize how AdvPOS looks and behaves for you"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => toast.success("Preferences saved")}>
            <Save /> Save
          </Button>
        }
      />

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
                        onClick={() => setTheme(t.value)}
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
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Defaults</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Label className="mb-1.5 inline-block">Default branch on login</Label>
                  <SelectNative defaultValue="1">
                    <option value="1">Karachi Head Office</option>
                    <option value="2">Lahore Branch</option>
                    <option value="3">Islamabad Branch</option>
                  </SelectNative>
                </div>
                <div>
                  <Label className="mb-1.5 inline-block">Date format</Label>
                  <SelectNative defaultValue="dmy">
                    <option value="dmy">DD-MMM-YYYY</option>
                    <option value="ymd">YYYY-MM-DD</option>
                    <option value="dmy2">DD/MM/YYYY</option>
                  </SelectNative>
                </div>
                <div>
                  <Label className="mb-1.5 inline-block">Number format</Label>
                  <SelectNative defaultValue="intl">
                    <option value="intl">International (1,000,000)</option>
                    <option value="pk">Pakistani (10,00,000)</option>
                  </SelectNative>
                </div>
                <div>
                  <Label className="mb-1.5 inline-block">Items per table page</Label>
                  <SelectNative defaultValue="15">
                    <option>10</option>
                    <option>15</option>
                    <option>25</option>
                    <option>50</option>
                  </SelectNative>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Notifications</h3>
              <div className="space-y-1">
                <NotifRow icon={Bell}        label="In-app notifications" desc="Bell icon on top bar"          checked enabled={true}  onChange={() => {}} />
                <NotifRow icon={Mail}        label="Email notifications"   desc="Sent to umer@vizo.com.pk"     checked={emailNotifs} enabled onChange={setEmailNotifs} />
                <NotifRow icon={MessageSquare} label="SMS notifications"   desc="Sent to 0300 7287607"        checked={smsNotifs}   enabled onChange={setSmsNotifs} />
                <NotifRow icon={Bell}        label="Browser push"          desc="Requires browser permission"  checked={pushNotifs}  enabled onChange={setPushNotifs} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function NotifRow({
  icon: Icon, label, desc, checked, enabled, onChange,
}: { icon: typeof Bell; label: string; desc: string; checked: boolean; enabled: boolean; onChange: (v: boolean) => void }) {
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
