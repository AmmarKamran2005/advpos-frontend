"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import axios from "axios";
import { Save, X, Loader2, AlertCircle, RefreshCw, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { useSession, API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";
import { PARTY_COPY, partyOrigin, refineParty, type PartyOrigin } from "@/lib/party-tax";

/* ───────────────────────────────────────────────────────────────────────────
   EDITING A PARTY

   PUT /parties/{id} has existed since the controller was written and nothing
   ever called it — there was no edit screen at all. A customer whose phone
   number changed had to be opened, read, and then corrected in the database,
   or left wrong.

   This is that screen. It is the new-party form with three differences: it
   loads what is already there, it does not allocate a code, and it cannot
   change the party type — see below.

   COUNTRY WORKS EXACTLY AS IT DOES ON THE NEW FORM. The party's city decides
   it, through the province, which is the same route the server takes when it
   validates. So a supplier in Shenzhen is asked for a Social Credit Code and a
   Resident ID card, and one in Karachi for an NTN and a CNIC — and the words
   come from @/lib/party-tax, the one place all three party screens read.
   ─────────────────────────────────────────────────────────────────────────── */

type Lookups = {
  categories: { id: number; key: string; name: string }[];
  cities: { id: number; name: string; province: string; country: string }[];
  holdPolicies: { id: number; key: string; name: string }[];
  locations: { id: number; code: string; name: string }[];
  salesPeople: { id: number; name: string }[];
};

type Party = {
  id: number; partyCode: string; type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  legalName: string; displayName: string;
  phone: string | null; altPhone: string | null; email: string | null;
  cityId: number | null; city: string | null; province: string | null;
  country: string | null; addressLine: string | null;
  categoryId: number | null; category: string | null;
  industry: string | null; ntn: string | null; strn: string | null; cnic: string | null;
  creditLimit: number; creditDays: number;
  holdPolicyId: number | null; creditHoldPolicy: string | null;
  openingBalance: number;
  salesPersonUserId: number | null;
  defaultLocationId: number | null;
  rating: string | null; notes: string | null;
  isActive: boolean;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const Schema = z.object({
  origin: z.enum(["PK", "CN"]).default("PK"),
  legalName: z.string().min(2, "At least 2 characters").max(200, "Max 200 characters"),
  displayName: z.string().max(150).optional().or(z.literal("")),
  categoryId: z.coerce.number().min(1, "Pick a category"),
  industry: z.string().max(100).optional().or(z.literal("")),

  phone: z.string().min(1, "Phone is required"),
  altPhone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),

  addressLine1: z.string().max(200).optional().or(z.literal("")),
  cityId: z.coerce.number().min(1, "Pick a city"),

  ntn: z.string().optional().or(z.literal("")),
  strn: z.string().optional().or(z.literal("")),
  cnic: z.string().optional().or(z.literal("")),

  creditLimit: z.coerce.number().min(0, "Cannot be negative").default(0),
  creditDays: z.coerce.number().min(0).max(365, "Max 365 days").default(0),
  holdPolicyId: z.coerce.number().min(1, "Pick a policy"),

  defaultLocationId: z.coerce.number(),
  salesPersonUserId: z.coerce.number().optional().or(z.literal("")),
  notes: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
}).superRefine((d, ctx) => {
  refineParty(d, (path, message) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message }));
});

type FormValues = z.infer<typeof Schema>;

export default function EditPartyPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const router = useRouter();
  const { can } = useSession();

  const [party, setParty] = React.useState<Party | null>(null);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const canFillTax = can("customers.tax");
  const canSetLimits = can("limits.manage");

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    mode: "onChange",
    defaultValues: {
      origin: "PK", legalName: "", displayName: "", categoryId: 0, industry: "",
      phone: "", altPhone: "", email: "", addressLine1: "", cityId: 0,
      ntn: "", strn: "", cnic: "",
      creditLimit: 0, creditDays: 0, holdPolicyId: 0,
      defaultLocationId: 1, salesPersonUserId: "", notes: "",
    },
  });

  const load = React.useCallback(async () => {
    if (!Number.isFinite(id)) { setLoading(false); return; }
    try {
      const [p, l] = await Promise.all([
        axios.get<Party>(`${API_BASE_URL}/parties/${id}`, { headers: authHeader() }),
        axios.get<Lookups>(`${API_BASE_URL}/parties/lookups`, { headers: authHeader() }),
      ]);

      setParty(p.data);
      setLookups(l.data);

      form.reset({
        origin: partyOrigin(p.data.country),
        legalName: p.data.legalName,
        displayName: p.data.displayName === p.data.legalName ? "" : (p.data.displayName ?? ""),
        categoryId: p.data.categoryId ?? 0,
        industry: p.data.industry ?? "",
        phone: p.data.phone ?? "",
        altPhone: p.data.altPhone ?? "",
        email: p.data.email ?? "",
        addressLine1: p.data.addressLine ?? "",
        cityId: p.data.cityId ?? 0,
        ntn: p.data.ntn ?? "",
        strn: p.data.strn ?? "",
        cnic: p.data.cnic ?? "",
        creditLimit: p.data.creditLimit,
        creditDays: p.data.creditDays,
        holdPolicyId: p.data.holdPolicyId ?? 0,
        defaultLocationId: p.data.defaultLocationId ?? 1,
        salesPersonUserId: p.data.salesPersonUserId ?? "",
        notes: p.data.notes ?? "",
      });

      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load this party."));
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const chosenCity = lookups?.cities.find((c) => c.id === Number(form.watch("cityId")));

  /* The city is the answer, the button is only how you narrow the list --
     exactly as on the new-party form, and exactly how the server reads it. */
  const isSupplier = party?.type === "SUPPLIER" || party?.type === "BOTH";
  const chosen = form.watch("origin");
  const origin: PartyOrigin =
    (chosenCity?.country === "CN" || chosenCity?.country === "PK")
      ? (chosenCity.country as PartyOrigin)
      : (isSupplier ? chosen : "PK");
  const copy = PARTY_COPY[origin];

  React.useEffect(() => {
    if (form.getValues("origin") !== origin) {
      form.setValue("origin", origin, { shouldValidate: form.formState.isSubmitted });
    }
  }, [origin, form]);

  const cities = isSupplier
    ? (lookups?.cities ?? []).filter((c) => c.country === chosen)
    : (lookups?.cities ?? []);

  const isCustomer = party?.type === "CUSTOMER" || party?.type === "BOTH";

  async function onSubmit(d: FormValues) {
    if (!party) return;
    try {
      const res = await axios.put<{ id: number; message: string }>(
        `${API_BASE_URL}/parties/${id}`,
        {
          /* Null keeps the code the server already allocated. Changing an
             account number after it has been printed on invoices is not an
             edit, it is a different account. */
          partyCode: null,
          legalName: d.legalName,
          displayName: d.displayName || null,
          /* The TYPE is not editable here. Turning a customer into a supplier
             swaps the underlying role and the ledger side they sit on, with
             orders and invoices already hanging off both -- that is a decision,
             not a correction, and it does not belong on a form whose other
             fields are phone numbers and addresses. */
          type: party.type,
          email: d.email || null,
          phone: d.phone,
          altPhone: d.altPhone || null,
          addressLine: d.addressLine1 || null,
          categoryId: Number(d.categoryId),
          cityId: Number(d.cityId),
          industry: d.industry || null,
          ntn: d.ntn || null,
          strn: d.strn || null,
          cnic: d.cnic || null,
          creditLimit: d.creditLimit,
          creditDays: d.creditDays,
          holdPolicyId: Number(d.holdPolicyId),
          /* Carried through untouched. The opening balance is history and the
             rating is set elsewhere; sending anything else here would quietly
             overwrite both. */
          openingBalance: party.openingBalance,
          rating: party.rating ?? "C",
          salesPersonUserId: Number(d.salesPersonUserId) > 0 ? Number(d.salesPersonUserId) : null,
          defaultLocationId: Number(d.defaultLocationId),
          notes: d.notes || null,
          isActive: party.isActive,
        },
        { headers: authHeader() }
      );

      toast.success(res.data.message);
      router.push(`/parties/${id}`);
    } catch (e) {
      toast.error(apiMessage(e, "Could not save the changes."));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !party || !lookups) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not open this party for editing"
        description={error ?? "The party could not be found."}
        action={
          <Button variant="accent" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw />
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <PageHeader
          breadcrumbs={[
            { label: "People", href: "/parties" },
            { label: party.legalName, href: `/parties/${party.id}` },
            { label: "Edit" },
          ]}
          title={`Edit ${party.legalName}`}
          subtitle={`${party.partyCode} · ${party.type === "BOTH" ? "Customer & Supplier" : party.type.charAt(0) + party.type.slice(1).toLowerCase()}`}
          actions={
            <>
              <Button variant="ghost" asChild>
                <Link href={`/parties/${party.id}`}><X /> Cancel</Link>
              </Button>
              <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                  : <><Save /> Save changes</>}
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Where the party is. Only for the ones that could be either. */}
            {isSupplier && (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-1">
                    Where is this party? <span className="text-danger">*</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    It decides which tax numbers are asked for, and which cities are offered.
                  </p>
                  <FormField control={form.control} name="origin" render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-3">
                        {(["PK", "CN"] as const).map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => field.onChange(o)}
                            className={cn(
                              "p-4 rounded-lg border-2 text-left transition-colors",
                              field.value === o
                                ? "border-brand-yellow bg-brand-yellow/5"
                                : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                            )}
                          >
                            <div className="text-sm font-semibold text-navy-900 dark:text-white">
                              {PARTY_COPY[o].label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {PARTY_COPY[o].blurb}
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

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="legalName" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>Legal Name</FormLabel>
                      <FormControl><Input placeholder={copy.legalName} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="displayName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl><Input placeholder={copy.displayName} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Category</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          <option value={0}>— Select —</option>
                          {lookups.categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </SelectNative>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Industry</FormLabel>
                      <FormControl><Input placeholder={copy.industry} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Phone</FormLabel>
                      <FormControl><Input placeholder={copy.phone} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="altPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate Phone</FormLabel>
                      <FormControl><Input placeholder={copy.altPhone} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder={copy.email} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="addressLine1" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl><Input placeholder={copy.address} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cityId" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>City</FormLabel>
                      <FormControl>
                        <SelectNative {...field}>
                          <option value={0}>— Select a city —</option>
                          {cities.map((c) => (
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
                      <Input value={chosenCity?.province ?? ""} readOnly disabled placeholder="Set by the city" />
                    </FormControl>
                  </FormItem>
                </div>
              </CardBody>
            </Card>

            {canFillTax && (
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">
                    Tax &amp; Compliance
                  </h3>
                  {/* Three fields, three database columns, and which three
                      numbers they are depends on where the party is. */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {copy.tax.map((t) => (
                      <FormField key={t.key} control={form.control} name={t.key} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.label}</FormLabel>
                          <FormControl><Input placeholder={t.placeholder} {...field} /></FormControl>
                          <FormDescription>{t.hint}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

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
                    <FormField control={form.control} name="holdPolicyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hold Policy</FormLabel>
                        <FormControl>
                          <SelectNative {...field}>
                            <option value={0}>— Select —</option>
                            {lookups.holdPolicies.map((h) => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
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

          <div className="space-y-6">
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
                    <h3 className="text-sm font-semibold text-info-dark dark:text-info-light">
                      Two things this form will not change
                    </h3>
                    <p className="text-xs text-info-dark/80 dark:text-info-light/80 mt-1">
                      The account code {party.partyCode}, because it is already
                      printed on invoices, and whether this is a customer or a
                      supplier — that swaps the side of the ledger they sit on,
                      which is a decision rather than a correction.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
