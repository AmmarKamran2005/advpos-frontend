"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Save, X, Loader2, Info, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const Schema = z.object({
  type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  category: z.enum(["RETAILER", "WHOLESALER", "DISTRIBUTOR", "MANUFACTURER", "AGENT"]),
  legalName: z.string().min(2, "At least 2 characters").max(200, "Max 200 characters"),
  displayName: z.string().max(150).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),

  phone: z.string()
    .min(11, "Pakistani number must be 11 digits")
    .regex(/^(03\d{9}|\+923\d{9}|021|042|051|031)/, "Invalid Pakistan phone format"),
  altPhone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),

  addressLine1: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "City required").max(100),
  province: z.enum(["Sindh", "Punjab", "KPK", "Balochistan", "Islamabad Capital", "AJK", "Gilgit-Baltistan"]),

  ntn: z.string()
    .regex(/^\d{7}-\d$|^$/, "Format: 1234567-8")
    .optional().or(z.literal("")),
  strn: z.string().optional().or(z.literal("")),
  cnic: z.string()
    .regex(/^\d{5}-\d{7}-\d$|^$/, "Format: 00000-0000000-0")
    .optional().or(z.literal("")),

  creditLimit: z.coerce.number().min(0, "Cannot be negative").default(0),
  creditDays:  z.coerce.number().min(0).max(365, "Max 365 days").default(0),
  holdPolicy:  z.enum(["NONE", "WARN", "BLOCK"]).default("WARN"),

  defaultBranchId: z.coerce.number(),
  salesPerson: z.string().optional().or(z.literal("")),
  notes: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
});

type Form = z.infer<typeof Schema>;

export default function NewPartyPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      type: "CUSTOMER",
      category: "RETAILER",
      legalName: "",
      displayName: "",
      industry: "",
      phone: "",
      altPhone: "",
      email: "",
      addressLine1: "",
      city: "",
      province: "Sindh",
      ntn: "",
      strn: "",
      cnic: "",
      creditLimit: 0,
      creditDays: 0,
      holdPolicy: "WARN",
      defaultBranchId: 1,
      salesPerson: "",
      notes: "",
    },
  });

  const partyType = form.watch("type");
  const isCustomer = partyType === "CUSTOMER" || partyType === "BOTH";

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Party created", { description: `${_d.legalName} added with code VZ-${_d.type[0]}-0024.` });
    router.push("/parties");
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "New Party" }]}
        title="New Party"
        subtitle="Create a new customer, supplier, or both"
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href="/parties"><ArrowLeft /> Back</Link>
            </Button>
            <Button variant="secondary" onClick={() => toast.info("Saved as draft")}>Save as Draft</Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> Save Party</>}
            </Button>
          </>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Type selector */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Party Type <span className="text-danger">*</span></h3>
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-3 gap-3">
                        {(["CUSTOMER", "SUPPLIER", "BOTH"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => field.onChange(t)}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-colors",
                              field.value === t
                                ? "border-brand-yellow bg-brand-yellow/5"
                                : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                            )}
                          >
                            <div className="text-sm font-semibold text-navy-900 dark:text-white">
                              {t === "BOTH" ? "Customer & Supplier" : t.charAt(0) + t.slice(1).toLowerCase()}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {t === "CUSTOMER" && "We sell to them"}
                              {t === "SUPPLIER" && "We buy from them"}
                              {t === "BOTH" && "Bidirectional relationship"}
                            </div>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardBody>
              </Card>

              {/* Basic */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="legalName" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel required>Legal Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Hafeez Center Shop #28" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="displayName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl><Input placeholder="Same as legal name if blank" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Category</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value="RETAILER">Retailer</option>
                            <option value="WHOLESALER">Wholesaler</option>
                            <option value="DISTRIBUTOR">Distributor</option>
                            <option value="MANUFACTURER">Manufacturer</option>
                            <option value="AGENT">Agent</option>
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="industry" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Industry</FormLabel>
                        <FormControl><Input placeholder="e.g. Mobile Accessories" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              {/* Contact */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Phone</FormLabel>
                        <FormControl><Input placeholder="03XXXXXXXXX or 021XXXXXXX" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="altPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternate Phone</FormLabel>
                        <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="contact@example.pk" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              {/* Address */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="addressLine1" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl><Input placeholder="Shop #28, Hafeez Center, Liberty" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>City</FormLabel>
                        <FormControl><Input placeholder="Lahore" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="province" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Province</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option>Punjab</option>
                            <option>Sindh</option>
                            <option>KPK</option>
                            <option>Balochistan</option>
                            <option>Islamabad Capital</option>
                            <option>AJK</option>
                            <option>Gilgit-Baltistan</option>
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              {/* Tax */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Tax & Compliance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="ntn" render={({ field }) => (
                      <FormItem>
                        <FormLabel>NTN</FormLabel>
                        <FormControl><Input placeholder="1234567-8" {...field} /></FormControl>
                        <FormDescription>National Tax Number</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="strn" render={({ field }) => (
                      <FormItem>
                        <FormLabel>STRN</FormLabel>
                        <FormControl><Input placeholder="32-77-8901-234-56" {...field} /></FormControl>
                        <FormDescription>Sales Tax Registration</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="cnic" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNIC</FormLabel>
                        <FormControl><Input placeholder="00000-0000000-0" {...field} /></FormControl>
                        <FormDescription>For sole proprietors</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardBody>
              </Card>

              {/* Credit (only for customer/both) */}
              {isCustomer && (
                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Credit Settings</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField control={form.control} name="creditLimit" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Limit (PKR)</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="creditDays" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Credit Days</FormLabel>
                          <FormControl><Input type="number" min={0} max={365} {...field} /></FormControl>
                          <FormDescription>Net days for payment</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="holdPolicy" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hold Policy</FormLabel>
                          <FormControl>
                            <SelectNative {...field}>
                              <option value="WARN">WARN — show warning, allow order</option>
                              <option value="BLOCK">BLOCK — prevent order, require override</option>
                              <option value="NONE">NONE — no checks</option>
                            </SelectNative>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Assignment</h3>
                  <div className="space-y-4">
                    <FormField control={form.control} name="defaultBranchId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Branch</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value="1">Karachi Head Office</option>
                            <option value="2">Lahore Branch</option>
                            <option value="3">Islamabad Branch</option>
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {isCustomer && (
                      <FormField control={form.control} name="salesPerson" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sales Rep</FormLabel>
                          <FormControl>
                            <SelectNative {...field}>
                              <option value="">— None —</option>
                              <option>Sara Khan</option>
                              <option>Hassan Raza</option>
                              <option>Bilal Ahmed</option>
                            </SelectNative>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Notes</h3>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea rows={4} placeholder="Internal notes (not shown on invoices)" {...field} /></FormControl>
                      <FormDescription>{(field.value?.length ?? 0)}/500 characters</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardBody>
              </Card>

              <Card className="bg-info/5 border-info/20">
                <CardBody>
                  <div className="flex items-start gap-2">
                    <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">Auto-generated party code</h3>
                      <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                        A unique party code (e.g. <code className="bg-white dark:bg-navy-900 px-1.5 py-0.5 rounded font-mono text-2xs">VZ-C-0024</code>) will be assigned automatically.
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
