"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Save, X, Loader2, Info, ArrowLeft, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { useSession } from "@/components/providers/session-provider";
import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /parties/lookups -- categories, cities, hold policies, locations and
   sales reps, all from the database. The form used to carry these as hardcoded
   enums and a free-text city box, which meant a typo produced a party the
   ledger could not group and a city that did not exist. */
type Lookups = {
  categories: { id: number; key: string; name: string }[];
  cities: { id: number; name: string; province: string }[];
  holdPolicies: { id: number; key: string; name: string }[];
  locations: { id: number; code: string; name: string }[];
  salesPeople: { id: number; name: string }[];
};

const NO_LOOKUPS: Lookups = {
  categories: [], cities: [], holdPolicies: [], locations: [], salesPeople: [],
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

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
  /* cityId, not a free-typed name: "City" is a real table and the party row
     carries its foreign key. Province comes with the city, so it is shown
     rather than asked for. */
  cityId: z.coerce.number().min(1, "Pick a city"),

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

  defaultLocationId: z.coerce.number(),
  salesPersonUserId: z.coerce.number().optional().or(z.literal("")),
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
      cityId: 0,
      ntn: "",
      strn: "",
      cnic: "",
      creditLimit: 0,
      creditDays: 0,
      holdPolicy: "WARN",
      defaultLocationId: 1,
      salesPersonUserId: "",
      notes: "",
    },
  });

  const { can, user } = useSession();

  const [lookups, setLookups] = React.useState<Lookups>(NO_LOOKUPS);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const loadLookups = React.useCallback(async () => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/parties/lookups`, {
        headers: authHeader(),
      });
      setLookups(res.data);
      setLoadError(null);
    } catch (e) {
      setLoadError(apiMessage(e, "Could not load the dropdown options."));
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void loadLookups();
  }, [loadLookups]);

  /* A rep only ever opens customer accounts, so the type choice is not shown
     to them and the record is forced to CUSTOMER. */
  const canChooseType = can("suppliers.manage");
  const canFillTax = can("customers.tax");
  const canSetLimits = can("limits.manage");

  const chosenCity = lookups.cities.find((c) => c.id === Number(form.watch("cityId")));

  const partyType = canChooseType ? form.watch("type") : "CUSTOMER";
  const isCustomer = partyType === "CUSTOMER" || partyType === "BOTH";

  /* The real thing. POST /parties writes the User row and the Party row inside
     one transaction, allocates the next VZ-C-#### code, and returns it. */
  async function onSubmit(d: Form) {
    try {
      const category = lookups.categories.find((c) => c.key === d.category);
      const policy = lookups.holdPolicies.find((h) => h.key === d.holdPolicy);

      if (!category) { toast.error("Pick a valid category."); return; }
      if (!policy) { toast.error("Pick a valid credit-hold policy."); return; }

      const res = await axios.post<{ id: number; partyCode: string; message: string }>(
        `${API_BASE_URL}/parties`,
        {
          partyCode: null,               // the API allocates it
          legalName: d.legalName,
          displayName: d.displayName || null,
          type: canChooseType ? d.type : "CUSTOMER",
          email: d.email || null,
          phone: d.phone,
          altPhone: d.altPhone || null,
          addressLine: d.addressLine1 || null,
          categoryId: category.id,
          cityId: Number(d.cityId),
          industry: d.industry || null,
          ntn: d.ntn || null,
          strn: d.strn || null,
          cnic: d.cnic || null,
          creditLimit: d.creditLimit,
          creditDays: d.creditDays,
          holdPolicyId: policy.id,
          openingBalance: 0,
          salesPersonUserId: d.salesPersonUserId === "" ? null : Number(d.salesPersonUserId),
          defaultLocationId: Number(d.defaultLocationId),
          rating: "C",
          notes: d.notes || null,
          isActive: true,
        },
        { headers: authHeader() }
      );

      toast.success(res.data.message);
      router.push(`/parties/${res.data.id}`);
    } catch (e) {
      /* Stay on the form so nothing typed is lost. */
      toast.error(apiMessage(e, "Could not save the party."));
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={
          canChooseType
            ? [{ label: "People", href: "/parties" }, { label: "New Party" }]
            : [{ label: "People" }, { label: "Customers", href: "/parties/customers" }, { label: "New Customer" }]
        }
        title={canChooseType ? "New Party" : "New Customer"}
        subtitle={canChooseType ? "Create a customer, a supplier, or both" : "Open a new customer account"}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href={canChooseType ? "/parties" : "/parties/customers"}><ArrowLeft /> Back</Link>
            </Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> {canChooseType ? "Save Party" : "Save Customer"}</>}
            </Button>
          </>
        }
      />

      {loadError && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{loadError}</div>
            <Button variant="secondary" size="sm" onClick={() => void loadLookups()}>Try again</Button>
          </div>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Type selector */}
              {canChooseType && (
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
              )}

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
                            {lookups.categories.map((c) => (
                              <option key={c.id} value={c.key}>{c.name}</option>
                            ))}
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
                    <FormField control={form.control} name="cityId" render={({ field }) => (
                      <FormItem>
                        <FormLabel required>City</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value={0}>— Select a city —</option>
                            {lookups.cities.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </SelectNative>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        {/* Comes with the city -- asking twice invites the two
                            to disagree. */}
                        <Input value={chosenCity?.province ?? ""} readOnly disabled placeholder="Set by the city" />
                      </FormControl>
                    </FormItem>
                  </div>
                </CardBody>
              </Card>

              {/* Tax */}
              {canFillTax && (
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
              )}

              {/* Credit (only for customer/both) */}
              {isCustomer && canSetLimits && (
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
              {!canFillTax && (
                <Card className="border-info/30 bg-info/5">
                  <CardBody className="flex items-start gap-3 py-3">
                    <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Tax details and the credit limit are filled in by Accounts
                      once they have the shop&rsquo;s papers. Save what you know —
                      the rest gets added later.
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {canChooseType && (
                <Card>
                  <CardBody>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Assignment</h3>
                    <div className="space-y-4">
                      <FormField control={form.control} name="defaultLocationId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Location</FormLabel>
                          <FormControl>
                            <SelectNative {...field}>
                              {lookups.locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </SelectNative>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {isCustomer && (
                        <FormField control={form.control} name="salesPersonUserId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sales Rep</FormLabel>
                            <FormControl>
                              <SelectNative {...field}>
                                <option value="">— None —</option>
                                {lookups.salesPeople.map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </SelectNative>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}

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
                      <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">Account code is automatic</h3>
                      <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                        The next code in the series is allocated by the server when
                        you save, so two people opening an account at the same moment
                        cannot take the same number. It is shown in the confirmation.
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
