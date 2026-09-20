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
import { PARTY_COPY, refineParty, type PartyOrigin } from "@/lib/party-tax";
import {
  CustomerDocumentsStep, type DocumentUrls, type ReadFields,
} from "@/components/parties/customer-documents-step";

/* ───────────────────────────────────────────────────────────────────────────
   OPENING A SHOP ACCOUNT IS TWO PAGES NOW

     1  the paperwork -- CNIC, the shop's business card, the affidavit, each
        photographed or uploaded, each set skippable
     2  this form, with whatever could be read off them already in the boxes

   The second page is the form that was always here. It is not filled in by a
   machine and then saved: every box is editable, the salesperson reads them
   against the documents in their hand, and what they save is what goes in.

   A SUPPLIER SKIPS PAGE ONE. The documents are a customer's; a supplier is
   opened the way it always was.

   EDITING NEVER RE-READS. This is the NEW screen -- /parties/[id]/edit takes
   pictures too, and files them, but leaves the details alone: once a person
   has checked a name, a machine does not get to have another go at it.
   ─────────────────────────────────────────────────────────────────────────── */

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

/* Everything that differs between a Pakistani party and a Chinese one -- the
   placeholders, the three tax fields, the phone and number shapes -- lives in
   @/lib/party-tax, because THREE screens now need it: this one, the profile
   that shows it back, and the edit form. Two copies of those words is how a
   supplier gets saved as a USCC and displayed as an "NTN". */
type Origin = PartyOrigin;
const COPY = PARTY_COPY;

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
  /* One place, all three party forms, and the server runs the same rules on
     the way in. See refineParty in @/lib/party-tax. */
  refineParty(d, (path, message) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message }));
});

type Form = z.infer<typeof Schema>;

export default function NewPartyPage() {
  const router = useRouter();

  /* Page one until the paperwork is done with, then the form. A supplier
     never sees page one -- see `wantsDocuments` below. */
  const [stage, setStage] = React.useState<"documents" | "form">("documents");
  const [docs, setDocs] = React.useState<DocumentUrls>({
    cnicFrontUrl: null, cnicBackUrl: null, cardFrontUrl: null,
    cardBackUrl: null, affidavitFrontUrl: null, affidavitBackUrl: null,
  });
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

  /* WHAT THE READER FOUND GOES INTO THE BOXES, and nowhere else.

     Each field is written with react-hook-form's setValue so it behaves like
     something typed: it validates, it can be edited, and it is what gets
     saved. Nothing here writes to the database. */
  const applyRead = React.useCallback((fields: ReadFields | null) => {
    if (!fields) return;
    const put = (name: keyof Form, value: string | number) => {
      if (value === "" || value === null || value === undefined) return;
      form.setValue(name, value as never, { shouldValidate: false, shouldDirty: true });
    };

    put("legalName", fields.legalName);
    put("displayName", fields.displayName);
    put("industry", fields.industry);
    put("phone", fields.phone ?? "");
    put("altPhone", fields.altPhone ?? "");
    put("email", fields.email);
    put("addressLine1", fields.addressLine);
    put("cnic", fields.cnic);
    put("ntn", fields.ntn);
    if (fields.cityId) put("cityId", fields.cityId);
    /* Retailer unless the card says otherwise -- and only one of the three
       kinds a rep is allowed to open. */
    if (["RETAILER", "WHOLESALER", "AGENT"].includes(fields.categoryKey)) {
      put("category", fields.categoryKey as Form["category"]);
    }
  }, [form]);

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
  /* A CUSTOMER IS IN PAKISTAN. The owner asked for the city list on the sales
     side to be Pakistani only -- this business sells here and buys abroad, so
     a shop in Guangzhou on the customer form is a mis-click waiting to happen
     (and the CNIC reader matches against these same cities).

     A supplier still gets the country it was opened under, which is how the
     Chinese suppliers were added in September. */
  const cities = asksOrigin
    ? lookups.cities.filter((c) => c.country === chosen)
    : partyType === "CUSTOMER"
      ? lookups.cities.filter((c) => c.country === "PK")
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
          /* The photographs taken on page one. Null for every set the
             salesperson marked as not available. */
          ...docs,
        },
        { headers: authHeader() }
      );

      toast.success(res.data.message);

      /* THE ONE PDF, built after the account exists because it is stored
         against it. Swallowed on failure on purpose -- the customer is
         created either way, the pictures are all on file, and the PDF can be
         rebuilt from the customer's own screen. Failing the save because a
         document store had a bad moment would be the tail wagging the dog. */
      const hasDocs = Object.values(docs).some(Boolean);
      if (hasDocs) {
        try {
          await axios.post(`${API_BASE_URL}/parties/${res.data.id}/documents/pdf`, {},
            { headers: authHeader() });
        } catch {
          toast.warning("The documents PDF could not be built", {
            description: "The pictures are saved. Rebuild it from the customer's screen.",
          });
        }
      }

      router.push(`/parties/${res.data.id}`);
    } catch (e) {
      /* Stay on the form so nothing typed is lost. */
      toast.error(apiMessage(e, "Could not save the party."));
    }
  }

  /* PAGE ONE IS FOR A CUSTOMER ONLY. A supplier has no CNIC and no shop card
     in this business -- it is a company -- so it goes straight to the form. */
  const wantsDocuments = partyType === "CUSTOMER";
  const onDocuments = stage === "documents" && wantsDocuments;

  const documentCount = Object.values(docs).filter(Boolean).length;

  return (
    <>
      <PageHeader
        breadcrumbs={
          canChooseType
            ? [{ label: "People", href: "/parties" }, { label: "New Party" }]
            : [{ label: "People" }, { label: "Customers", href: "/parties/customers" }, { label: "New Customer" }]
        }
        title={canChooseType ? "New Party" : "New Customer"}
        subtitle={
          onDocuments
            ? "First the paperwork. Photograph what the shop has; skip what it does not."
            : canChooseType ? "Create a customer, a supplier, or both" : "Open a new customer account"
        }
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href={canChooseType ? "/parties" : "/parties/customers"}><ArrowLeft /> Back</Link>
            </Button>
            {!onDocuments && (
              <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> {canChooseType ? "Save Party" : "Save Customer"}</>}
              </Button>
            )}
          </>
        }
      />

      {/* ── page one: the documents ───────────────────────────────────── */}
      {onDocuments && (
        <CustomerDocumentsStep
          onDone={(taken, fields) => {
            setDocs(taken);
            applyRead(fields);
            setStage("form");
          }}
        />
      )}

      {/* What page one found, kept in view on page two so nobody has to
          remember what they photographed. */}
      {!onDocuments && wantsDocuments && (
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-center gap-3 py-3">
            <Info className="size-4 text-brand-yellow shrink-0" />
            <div className="text-sm text-slate-600 dark:text-slate-300 flex-1 min-w-0">
              {documentCount > 0
                ? <>{documentCount} document {documentCount === 1 ? "picture" : "pictures"} will be saved with this customer, and bound into one PDF.</>
                : <>No documents were photographed. Everything here is typed in.</>}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStage("documents")}>
              {documentCount > 0 ? "Change them" : "Take them now"}
            </Button>
          </CardBody>
        </Card>
      )}

      {loadError && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{loadError}</div>
            <Button variant="secondary" size="sm" onClick={() => void loadLookups()}>Try again</Button>
          </div>
        </Card>
      )}

      <div className={onDocuments ? "hidden" : undefined}>
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
      </div>
    </>
  );
}
