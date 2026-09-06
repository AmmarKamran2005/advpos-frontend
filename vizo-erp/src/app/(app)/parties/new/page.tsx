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
  /* `country` is "PK" or "CN", read from the city's province. It is what
     decides which set of tax numbers this party has -- see the COPY table
     below and PartiesController.CheckTax on the server. */
  cities: { id: number; name: string; province: string; country: string }[];
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

/* ───────────────────────────────────────────────────────────────────────────
   A PAKISTANI PARTY AND A CHINESE ONE ARE NOT THE SAME FORM

   The stock comes from Shenzhen and Guangzhou as often as from Karachi, and a
   Chinese supplier has none of the three numbers this form used to insist on.
   It has a Unified Social Credit Code, a VAT registration and a Resident ID
   card, and all three look nothing like an NTN, an STRN or a CNIC.

   So everything that differs between the two lives in one table rather than
   being scattered through the markup as ternaries. Adding a third country one
   day means adding a third entry here.

   THE EXAMPLES ARE IN ENGLISH LETTERS ON PURPOSE. A placeholder exists to show
   somebody the shape of the thing they are about to type. Nobody at this
   company reads Chinese characters, so a placeholder in them would show the
   shape of nothing -- these are real Chinese addresses, companies and numbers,
   written the way they appear on an export invoice.
   ─────────────────────────────────────────────────────────────────────────── */

type Origin = "PK" | "CN";

const COPY: Record<Origin, {
  label: string;
  blurb: string;
  legalName: string;
  displayName: string;
  industry: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  tax: { key: "ntn" | "strn" | "cnic"; label: string; hint: string; placeholder: string }[];
}> = {
  PK: {
    label: "Pakistani",
    blurb: "NTN, STRN and CNIC",
    legalName: "e.g. Hafeez Center Shop #28",
    displayName: "Same as legal name if blank",
    industry: "e.g. Mobile Accessories",
    phone: "03XXXXXXXXX or 021XXXXXXX",
    altPhone: "Optional",
    email: "contact@example.pk",
    address: "Shop #28, Hafeez Center, Liberty",
    tax: [
      { key: "ntn",  label: "NTN",  hint: "National Tax Number",  placeholder: "1234567-8" },
      { key: "strn", label: "STRN", hint: "Sales Tax Registration", placeholder: "32-77-8901-234-56" },
      { key: "cnic", label: "CNIC", hint: "For sole proprietors",  placeholder: "00000-0000000-0" },
    ],
  },
  CN: {
    label: "Chinese",
    blurb: "Social Credit Code, VAT and ID card",
    legalName: "e.g. Shenzhen Huaqiang Electronics Co., Ltd",
    displayName: "e.g. Huaqiang Electronics",
    industry: "e.g. Consumer Electronics",
    phone: "+86 138 0013 8000",
    altPhone: "+86 755 8888 6666 (optional)",
    email: "contact@example.cn",
    address: "Room 1201, Block B, Huaqiang North Road, Futian District",
    /* Same three database columns, different three numbers. Renaming the
       columns would mean touching every report that reads them, to gain
       nothing a label does not already give. */
    tax: [
      { key: "ntn",  label: "USCC",    hint: "Unified Social Credit Code",   placeholder: "91440300MA5EDK8T5H" },
      { key: "strn", label: "VAT No.", hint: "General taxpayer registration", placeholder: "440300123456789" },
      { key: "cnic", label: "ID Card", hint: "Resident ID, for sole traders", placeholder: "440301199001011234" },
    ],
  },
};

/* Digits and capitals, minus I, O, S, V and Z -- left out of the Chinese code
   alphabet precisely because they are misread as 1, 0, 5, U and 2. */
const CN_ALPHABET = /^[0-9A-HJ-NP-RTUW-Y]+$/;

const isUscc  = (v: string) => v.length === 18 && CN_ALPHABET.test(v);
const isCnVat = (v: string) => (v.length === 15 || v.length === 18) && CN_ALPHABET.test(v);
const isCnId  = (v: string) => /^\d{17}[\dX]$/.test(v);

/** Mainland mobile, or a landline with its area code. Spaces and dashes ignored. */
const isCnPhone = (v: string) =>
  /^(\+?86)?(1[3-9]\d{9}|0\d{9,11})$/.test(v.replace(/[\s-]/g, ""));

const isPkPhone = (v: string) =>
  /^(03\d{9}|\+923\d{9}|0(21|42|51|31)\d{7,8})$/.test(v.replace(/[\s-]/g, ""));

const Schema = z.object({
  type: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  /* Asked for a supplier or a customer-and-supplier. A customer is Pakistani
     unless the city says otherwise -- see `origin` in the component. */
  origin: z.enum(["PK", "CN"]).default("PK"),
  category: z.enum(["RETAILER", "WHOLESALER", "DISTRIBUTOR", "MANUFACTURER", "AGENT"]),
  legalName: z.string().min(2, "At least 2 characters").max(200, "Max 200 characters"),
  displayName: z.string().max(150).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),

  /* Checked in the refinement below, because which shape is right depends on
     where the party is. */
  phone: z.string().min(1, "Phone is required"),
  altPhone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),

  addressLine1: z.string().max(200).optional().or(z.literal("")),
  /* cityId, not a free-typed name: "City" is a real table and the party row
     carries its foreign key. Province comes with the city, so it is shown
     rather than asked for. */
  cityId: z.coerce.number().min(1, "Pick a city"),

  /* All three are checked in the refinement below. Which three numbers these
     actually are depends on the country -- NTN/STRN/CNIC here, Social Credit
     Code / VAT / ID card there. */
  ntn: z.string().optional().or(z.literal("")),
  strn: z.string().optional().or(z.literal("")),
  cnic: z.string().optional().or(z.literal("")),

  creditLimit: z.coerce.number().min(0, "Cannot be negative").default(0),
  creditDays:  z.coerce.number().min(0).max(365, "Max 365 days").default(0),
  holdPolicy:  z.enum(["NONE", "WARN", "BLOCK"]).default("WARN"),

  defaultLocationId: z.coerce.number(),
  salesPersonUserId: z.coerce.number().optional().or(z.literal("")),
  notes: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
}).superRefine((d, ctx) => {
  /* One place, both countries. The server runs the same rules on the way in
     (PartiesController.CheckTax) -- a shape the browser happens to enforce is
     not a shape the database is protected by. */
  const cn = d.origin === "CN";

  if (d.phone && !(cn ? isCnPhone(d.phone) : isPkPhone(d.phone))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone"],
      message: cn
        ? "Chinese number, e.g. +86 138 0013 8000 or 020 8888 6666"
        : "Pakistani number, e.g. 03001234567 or 02134567890",
    });
  }

  const ntn = (d.ntn ?? "").trim().toUpperCase();
  const strn = (d.strn ?? "").trim().toUpperCase();
  const cnic = (d.cnic ?? "").trim().toUpperCase();

  if (cn) {
    if (ntn && !isUscc(ntn)) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ["ntn"],
      message: "18 characters, e.g. 91440300MA5EDK8T5H",
    });
    if (strn && !isCnVat(strn)) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ["strn"],
      message: "15 or 18 characters, e.g. 440300123456789",
    });
    if (cnic && !isCnId(cnic)) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ["cnic"],
      message: "17 digits and a check character, e.g. 440301199001011234",
    });
    return;
  }

  if (ntn && !/^\d{7}-\d$/.test(ntn)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ["ntn"], message: "Format: 1234567-8",
  });
  if (strn && !/^\d{2}-\d{2}-\d{4}-\d{3}-\d{2}$/.test(strn)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ["strn"], message: "Format: 32-77-8901-234-56",
  });
  if (cnic && !/^\d{5}-\d{7}-\d$/.test(cnic)) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ["cnic"], message: "Format: 00000-0000000-0",
  });
});

type Form = z.infer<typeof Schema>;

export default function NewPartyPage() {
  const router = useRouter();
  const form = useForm<Form>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      type: "CUSTOMER",
      origin: "PK",
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

  /* WHERE THE PARTY IS, AND WHO GETS ASKED.

     The question is put for a supplier or a customer-and-supplier, because
     those are the ones that turn out to be Chinese. A plain customer is a shop
     in Pakistan and is not asked.

     But the CITY is the real answer, not the button. It carries the country
     through its province -- the same route the server takes -- so choosing
     Guangzhou makes the party Chinese whether or not anybody pressed anything.
     That matters for the customer who is never shown the buttons: if they pick
     a Chinese city the form asks for Chinese numbers, which is what the API is
     about to insist on anyway. A form that disagrees with the endpoint behind
     it is worse than a form with one more question on it. */
  const asksOrigin = canChooseType && (partyType === "SUPPLIER" || partyType === "BOTH");
  const chosen = form.watch("origin");
  const origin: Origin =
    (chosenCity?.country === "CN" || chosenCity?.country === "PK")
      ? (chosenCity.country as Origin)
      : (asksOrigin ? chosen : "PK");
  const copy = COPY[origin];

  /* The refinement reads `origin` off the form, so what the city implies has to
     be written back to it -- otherwise a Chinese city would be validated
     against Pakistani rules. */
  React.useEffect(() => {
    if (form.getValues("origin") !== origin) {
      form.setValue("origin", origin, { shouldValidate: form.formState.isSubmitted });
    }
  }, [origin, form]);

  /* Once the admin has said where the supplier is, only that country's cities
     are offered -- a Chinese supplier in Lahore is a typo, not a choice. The
     customer path is untouched and still lists every city, exactly as before. */
  const cities = asksOrigin
    ? lookups.cities.filter((c) => c.country === chosen)
    : lookups.cities;

  /* Switching country strands whatever city was picked under the old one. */
  React.useEffect(() => {
    const id = Number(form.getValues("cityId"));
    if (id && asksOrigin && !cities.some((c) => c.id === id)) {
      form.setValue("cityId", 0, { shouldValidate: false });
    }
  }, [asksOrigin, cities, form]);

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
          /* "> 0, or nothing". The check used to be `=== ""`, which never
             matched: the field is z.coerce.number(), and coercing "" gives 0,
             not "". So leaving Sales Rep on "— None —" sent 0, and 0 is not an
             employee id -- every such save died on the foreign key with a 500.
             Nothing to do with the country work; it just had to be fixed to be
             able to save anything at all from this form. */
          salesPersonUserId: Number(d.salesPersonUserId) > 0 ? Number(d.salesPersonUserId) : null,
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

              {/* Where the party is. Only asked when it could be either. */}
              {asksOrigin && (
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
                              {COPY[o].label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {COPY[o].blurb}
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
                        <FormControl><Input placeholder={copy.industry} {...field} /></FormControl>
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

              {/* Address */}
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
