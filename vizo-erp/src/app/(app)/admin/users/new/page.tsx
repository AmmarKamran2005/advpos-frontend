"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, X, ArrowLeft, Loader2, KeyRound, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { roles, branchesAdmin } from "@/data/admin";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  fullName: z.string().min(2, "Required").max(150),
  email: z.string().min(1, "Required").email("Invalid email"),
  phone: z.string().min(11, "Pakistan number: 11 digits").regex(/^03\d{9}$/, "Format: 03XXXXXXXXX"),
  employeeCode: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/, "Uppercase letters/digits/hyphens"),
  roles: z.array(z.string()).min(1, "Pick at least one role"),
  branches: z.array(z.string()).min(1, "Grant access to at least one branch"),
  sendInvite: z.boolean(),
  isActive: z.boolean(),
});

type Form = z.infer<typeof Schema>;

export default function NewUserPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      fullName: "", email: "", phone: "", employeeCode: "",
      roles: [], branches: [], sendInvite: true, isActive: true,
    },
  });

  async function onSubmit(d: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("User created", {
      description: d.sendInvite ? `Invite emailed to ${d.email}` : `${d.fullName} added without invite.`,
    });
    router.push("/admin/users");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users", href: "/admin/users" }, { label: "New User" }]}
        title="New User"
        subtitle="Add a team member with role-based access"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/users"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> Create User</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Full name</FormLabel>
                        <FormControl><Input placeholder="e.g. Hassan Raza" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="employeeCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Employee code</FormLabel>
                        <FormControl><Input placeholder="EMP-013" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                        <FormDescription>Uppercase identifier</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone</FormLabel>
                        <FormControl><Input placeholder="03XXXXXXXXX" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="user@vizo.com.pk" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Roles <span className="text-danger">*</span></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Pick one or more roles. Permissions are the union of all assigned roles.</p>
                  <FormField control={form.control} name="roles" render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2">
                        {roles.map((r) => {
                          const checked = field.value.includes(r.name);
                          return (
                            <label key={r.id} className="flex items-start gap-3 p-3 border border-slate-200 dark:border-navy-700 rounded-lg cursor-pointer hover:border-brand-yellow/40 transition-colors">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  if (v) field.onChange([...field.value, r.name]);
                                  else   field.onChange(field.value.filter((x) => x !== r.name));
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-navy-900 dark:text-white">{r.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.description} · {r.permissionCount} permissions</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Branch Access <span className="text-danger">*</span></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">User will only see data from these branches.</p>
                  <FormField control={form.control} name="branches" render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {branchesAdmin.map((b) => {
                          const checked = field.value.includes(b.code);
                          return (
                            <label key={b.id} className="flex items-center gap-2.5 p-3 border border-slate-200 dark:border-navy-700 rounded-lg cursor-pointer hover:border-brand-yellow/40 transition-colors">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  if (v) field.onChange([...field.value, b.code]);
                                  else   field.onChange(field.value.filter((x) => x !== b.code));
                                }}
                              />
                              <div>
                                <div className="text-sm font-medium text-navy-900 dark:text-white">{b.name}</div>
                                <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{b.code}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardBody>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Activation</h3>
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <Label>Active</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inactive users cannot sign in</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <FormField control={form.control} name="sendInvite" render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                      <div>
                        <Label className="inline-flex items-center gap-1.5"><KeyRound className="size-3.5" />Send invite email</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">User receives a link to set their password</p>
                      </div>
                    </FormItem>
                  )} />
                </CardBody>
              </Card>

              <Card className="bg-info/5 border-info/20">
                <CardBody>
                  <div className="flex items-start gap-2">
                    <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">Temporary password</h3>
                      <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                        If invite is disabled, the user will be assigned a random temporary password and forced to change it on first login.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
