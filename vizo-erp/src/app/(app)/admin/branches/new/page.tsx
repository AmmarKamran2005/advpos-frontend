"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, ArrowLeft, Loader2, Building2, Hash } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";

const Schema = z.object({
  code: z.string().min(2).max(10).regex(/^[A-Z]+$/, "Uppercase letters only"),
  name: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  address: z.string().min(5).max(300),
  phone: z.string().min(11, "Pakistan phone").regex(/^(03\d{9}|0\d{2,3}\s?\d{7,8})$/, "Format: 0300 1234567 or 021 1234567"),
  managerName: z.string().min(2),
  isHeadOffice: z.boolean(),
  invoicePrefix: z.string().min(2).max(10).regex(/^[A-Z-]+$/, "Uppercase + hyphens"),
  poPrefix: z.string().min(2).max(10).regex(/^[A-Z-]+$/),
  voucherPrefix: z.string().min(2).max(10).regex(/^[A-Z-]+$/),
  isActive: z.boolean(),
});

type Form = z.infer<typeof Schema>;

export default function NewBranchPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      code: "", name: "", city: "", address: "", phone: "", managerName: "",
      isHeadOffice: false, invoicePrefix: "", poPrefix: "", voucherPrefix: "", isActive: true,
    },
  });

  const code = form.watch("code");
  React.useEffect(() => {
    if (code && !form.getValues("invoicePrefix")) {
      form.setValue("invoicePrefix", `${code}-INV`);
      form.setValue("poPrefix", `${code}-PO`);
      form.setValue("voucherPrefix", `${code}-VCH`);
    }
  }, [code, form]);

  async function onSubmit(d: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Branch created", { description: `${d.name} (${d.code}) is ready to use.` });
    router.push("/admin/branches");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Branches", href: "/admin/branches" }, { label: "New Branch" }]}
        title="New Branch"
        subtitle="Add a legal/accounting unit"
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/branches"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> Create Branch</>}
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4 inline-flex items-center gap-2"><Building2 className="size-4" />Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="code" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Branch code</FormLabel>
                        <FormControl><Input placeholder="KHI" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                        <FormDescription>Short uppercase identifier (e.g. KHI, LHR, ISB)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Display name</FormLabel>
                        <FormControl><Input placeholder="Karachi Head Office" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>City</FormLabel>
                        <FormControl><Input placeholder="Karachi" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone</FormLabel>
                        <FormControl><Input placeholder="021 32412345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Address</FormLabel>
                        <FormControl><Textarea rows={2} placeholder="Kohinoor Market, Saddar, Karachi" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="managerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Branch manager</FormLabel>
                        <FormControl><Input placeholder="Manager full name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4 inline-flex items-center gap-2"><Hash className="size-4" />Document Numbering</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Format: <code className="bg-slate-100 dark:bg-navy-700 px-2 py-0.5 rounded font-mono text-xs">{`{prefix}-{YY}-{seq}`}</code>. Auto-suggested from branch code.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="invoicePrefix" render={({ field }) => (
                      <FormItem><FormLabel required>Invoice prefix</FormLabel><FormControl><Input placeholder="KHI-INV" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="poPrefix" render={({ field }) => (
                      <FormItem><FormLabel required>PO prefix</FormLabel><FormControl><Input placeholder="KHI-PO" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="voucherPrefix" render={({ field }) => (
                      <FormItem><FormLabel required>Voucher prefix</FormLabel><FormControl><Input placeholder="KHI-VCH" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Settings</h3>
                  <div className="space-y-4">
                    <FormField control={form.control} name="isHeadOffice" render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <Label>Head Office</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Marks branch as primary HQ</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                      <FormItem className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-navy-700">
                        <div>
                          <Label>Active</Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inactive branches are hidden from selection</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
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
