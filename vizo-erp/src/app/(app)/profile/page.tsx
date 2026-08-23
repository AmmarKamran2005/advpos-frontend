"use client";

import Link from "next/link";
import { User, Lock, Settings, Smartphone, Mail, Phone, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";

export default function ProfilePage() {
  const { user } = useSession();
  if (!user) return null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile" }]}
        title="My Profile"
        subtitle="Manage your personal information and preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <Avatar initials={user.initials} size="xl" className="size-20 text-2xl mb-3" />
                <h3 className="text-base font-semibold text-navy-900 dark:text-white">{user.fullName}</h3>
                <Badge variant="accent" className="mt-1">{user.roleLabel}</Badge>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{user.email}</div>
              </div>
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-navy-700 space-y-2">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-yellow/10 text-brand-yellow-700 dark:text-brand-yellow font-semibold text-sm">
                  <User className="size-4" /> Profile
                </Link>
                <Link href="/profile/security" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 text-sm">
                  <Lock className="size-4" /> Security
                </Link>
                <Link href="/profile/preferences" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 text-sm">
                  <Settings className="size-4" /> Preferences
                </Link>
                <Link href="/profile/sessions" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 text-sm">
                  <Smartphone className="size-4" /> Active Sessions
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name"><Input defaultValue={user.fullName} /></Field>
                <Field label="Email"><Input type="email" defaultValue={user.email ?? ""} disabled /></Field>
                <Field label="Phone"><Input defaultValue="0300 7287607" /></Field>
                <Field label="Employee Code"><Input defaultValue="EMP-001" disabled /></Field>
                <Field label="Default Location">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Karachi Head Office</option>
                    <option>Lahore Location</option>
                    <option>Islamabad Location</option>
                  </select>
                </Field>
                <Field label="Role"><Input defaultValue={user.roleLabel} disabled /></Field>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                <Button variant="accent" size="md">Save Changes</Button>
                <Button variant="ghost" size="md">Cancel</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Account Activity</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Member Since" value="Aug 2025" />
                <Stat label="Total Logins" value="248" />
                <Stat label="Last Login" value="2 min ago" />
                <Stat label="Devices" value="3 active" />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">{label}</label>
      {children}
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
