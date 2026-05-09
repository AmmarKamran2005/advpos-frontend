"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Eye, EyeOff, Smartphone, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";

const PasswordSchema = z.object({
  current: z.string().min(1, "Current password is required"),
  password: z.string().min(8, "Min 8 characters").regex(/[A-Z]/, "Needs uppercase").regex(/\d/, "Needs a number"),
  confirm: z.string().min(1, "Please confirm"),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type PasswordForm = z.infer<typeof PasswordSchema>;

export default function SecurityPage() {
  const [show, setShow] = React.useState(false);
  const [twoFA, setTwoFA] = React.useState(false);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });

  async function onSubmit(_d: PasswordForm) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Password changed", { description: "All other devices have been signed out." });
    form.reset();
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Security" }]}
        title="Security"
        subtitle="Manage your password, 2FA, and account security"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1"><ProfileSidebar /></div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-start gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                <div className="size-10 rounded-lg bg-brand-yellow/10 text-brand-yellow flex items-center justify-center">
                  <Lock className="size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white">Change Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a strong password — minimum 8 characters with an uppercase letter and number.</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                  <FormField control={form.control} name="current" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Current password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={show ? "text" : "password"} className="pr-10" {...field} />
                          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400">
                            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>New password</FormLabel>
                      <FormControl><Input type={show ? "text" : "password"} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirm" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Confirm new password</FormLabel>
                      <FormControl><Input type={show ? "text" : "password"} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" variant="accent" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Update password"}
                  </Button>
                </form>
              </Form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                      Two-Factor Authentication
                      {!twoFA && <Badge variant="warning">Recommended</Badge>}
                      {twoFA && <Badge variant="success">Enabled</Badge>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      Add an extra layer of security by requiring a code from your authenticator app on every login.
                    </p>
                  </div>
                </div>
                <Switch checked={twoFA} onCheckedChange={(v) => {
                  setTwoFA(v);
                  toast.success(v ? "2FA enabled" : "2FA disabled", { description: v ? "You'll need to scan a QR code on next login." : "Your account is now less secure." });
                }} />
              </div>
            </CardBody>
          </Card>

          <Card className="bg-danger/5 border-danger/20">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-danger-dark dark:text-danger-light">Sign out everywhere</h3>
                  <p className="text-xs text-danger-dark/80 dark:text-danger-light/80 mt-1">
                    This will sign you out of all browsers and devices except this one. Useful if you suspect unauthorized access.
                  </p>
                </div>
                <Button variant="danger" size="md" onClick={() => toast.success("All sessions signed out", { description: "Other devices have been logged out." })}>
                  <Smartphone className="size-4" /> Sign out all
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
