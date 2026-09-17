"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { Save, ArrowLeft, Loader2, KeyRound, Info, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* The API takes exactly one role and a list of location ids, so the form holds
   ids — not the role names and location codes the mock data used. */
const Schema = z.object({
  fullName: z.string().min(2, "Required").max(150),
  email: z.string().min(1, "Required").email("Invalid email"),
  phone: z.string().min(11, "Pakistan number: 11 digits").regex(/^03\d{9}$/, "Format: 03XXXXXXXXX"),
  employeeCode: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/, "Uppercase letters/digits/hyphens"),
  roleId: z.number().int().min(1, "Pick a role"),
  locationIds: z.array(z.number().int()).min(1, "Grant access to at least one location"),
  sendInvite: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof Schema>;

type LocationRef = {
  id: number; code: string; name: string;
  kind: string; kindLabel: string;
  cityId: number; city: string;
};

type Lookups = {
  roles: { id: number; key: string; name: string; description: string; isStaff: boolean; permissionCount: number }[];
  locations: LocationRef[];
};

/* ───────────────────────────────────────────────────────────────────────────
   TWO ROLES BELONG TO A PLACE, NOT TO THE COMPANY

   A warehouse keeper picks stock off a particular shelf in a particular city;
   an order-desk clerk packs at a particular desk. Everybody else — the owner,
   the accountant, a sales rep — works across the whole business.

   So for those two the question is not "which locations may this person see"
   but "WHICH WAREHOUSE IS THIS", and it has exactly one answer. A checkbox
   grid asks the wrong question and lets through the answers that break things:
   none, or three, or the Claim Stock shelf. The keeper's queue then showed
   every order in the company, Lahore's included, and somebody in Karachi could
   mark stock four hundred miles away as sent.

   The API enforces the same rule — AdminUsersController.ValidatePlace — because
   a form is a convenience and not a guarantee. This is here so the person
   filling it in is never offered the wrong thing in the first place.

   The list of warehouses is whatever the owner has created at
   Administration → Locations. Nothing here knows any location's id.
   ─────────────────────────────────────────────────────────────────────────── */
const PLACE_BOUND: Record<string, { kind: string; noun: string; hint: string }> = {
  "warehouse-keeper": {
    kind: "warehouse",
    noun: "warehouse",
    hint: "This keeper only sees orders picked from this warehouse.",
  },
  "order-dept": {
    kind: "department",
    noun: "order department",
    hint: "This desk only sees the orders that arrive at it.",
  },
};

type UserDetail = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  roleId: number;
  locations: { locationId: number; locationCode: string; locationName: string }[];
  isActive: boolean;
};

/** Pull `{ message }` off an axios error, or say the server is unreachable. */
function apiMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      return (err.response.data as { message?: string } | undefined)?.message ?? fallback;
    }
    return "Cannot reach the server.";
  }
  return fallback;
}

/* `useSearchParams` needs a suspense boundary above it, so the page itself is
   only the boundary and the form lives one level down. */
export default function NewUserPage() {
  return (
    <React.Suspense fallback={<FormSkeleton />}>
      <UserForm />
    </React.Suspense>
  );
}

function UserForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const idParam = searchParams.get("id");
  const editingId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;
  const isEdit = editingId !== null;

  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: {
      fullName: "", email: "", phone: "", employeeCode: "",
      roleId: 0, locationIds: [], sendInvite: true, isActive: true,
    },
  });
  const { reset } = form;

  /* The role drives the location card, so it is watched rather than read once. */
  const roleId = form.watch("roleId");

  const load = React.useCallback(async () => {
    try {
      const [lists, existing] = await Promise.all([
        axios.get<Lookups>(`${API_BASE_URL}/admin/lookups`, { headers: authHeader() }),
        editingId !== null
          ? axios.get<UserDetail>(`${API_BASE_URL}/admin/users/${editingId}`, { headers: authHeader() })
          : Promise.resolve(null),
      ]);
      setLookups(lists.data);
      if (existing) {
        const u = existing.data;
        reset({
          fullName: u.fullName ?? "",
          email: u.email ?? "",
          /* stored numbers can carry spaces; the field wants 11 bare digits */
          phone: (u.phone ?? "").replace(/\D/g, ""),
          employeeCode: u.employeeCode ?? "",
          roleId: u.roleId ?? 0,
          locationIds: (u.locations ?? []).map((l) => l.locationId),
          sendInvite: false,
          isActive: u.isActive,
        });
      }
    } catch (err) {
      setError(apiMessage(err, "Could not load the form."));
    } finally {
      setLoading(false);
    }
  }, [editingId, reset]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  async function onSubmit(d: FormValues) {
    const body = {
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      employeeCode: d.employeeCode,
      roleId: d.roleId,
      locationIds: d.locationIds,
      isActive: d.isActive,
      sendInvite: d.sendInvite,
      password: "Vizo@1234",
    };

    try {
      const res = isEdit
        ? await axios.put<{ message?: string }>(`${API_BASE_URL}/admin/users/${editingId}`, body, { headers: authHeader() })
        : await axios.post<{ message?: string; id?: number }>(`${API_BASE_URL}/admin/users`, body, { headers: authHeader() });

      toast.success(res.data?.message ?? (isEdit ? "User updated." : "User created."));
      router.push("/admin/users");
    } catch (err) {
      toast.error(apiMessage(err, isEdit ? "Could not save the user." : "Could not create the user."));
    }
  }

  if (loading) return <FormSkeleton />;

  if (error || !lookups) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={isEdit ? "Could not load this user" : "Could not load the form"}
        description={error ?? "Roles and locations are unavailable right now."}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void load()}>Try again</Button>
            <Button asChild><Link href="/admin/users">Back to users</Link></Button>
          </div>
        }
      />
    );
  }

  /* Which role is selected decides what the location card asks, so it is read
     off the form and follows the radio the moment it changes. */
  const selectedRoleKey = lookups.roles.find((r) => r.id === roleId)?.key ?? "";
  const place = PLACE_BOUND[selectedRoleKey];
  const places = place ? lookups.locations.filter((l) => l.kind === place.kind) : [];

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Administration" },
          { label: "Users", href: "/admin/users" },
          { label: isEdit ? "Edit User" : "New User" },
        ]}
        title={isEdit ? "Edit User" : "New User"}
        subtitle={isEdit ? "Update this team member's details and access" : "Add a team member with role-based access"}
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/admin/users"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
                : <><Save /> {isEdit ? "Save changes" : "Create User"}</>}
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Role <span className="text-danger">*</span></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">A user carries exactly one role, and that role decides what they can do.</p>
                  <FormField control={form.control} name="roleId" render={({ field }) => (
                    <FormItem>
                      <div className="space-y-2" role="radiogroup" aria-label="Role">
                        {/* Staff only. Customer, Supplier and Customer & Supplier
                            are PARTY roles -- a shop that buys from us -- and
                            picking one here made a staff account with an
                            employee code and no party behind it. */}
                        {lookups.roles.filter((r) => r.isStaff !== false).map((r) => {
                          const checked = field.value === r.id;
                          return (
                            <label
                              key={r.id}
                              className={cn(
                                "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                                "hover:border-brand-yellow/40",
                                "focus-within:ring-2 focus-within:ring-brand-yellow focus-within:ring-offset-1",
                                checked
                                  ? "border-brand-yellow bg-brand-yellow/5"
                                  : "border-slate-200 dark:border-navy-700"
                              )}
                            >
                              <input
                                type="radio"
                                name="roleId"
                                className="sr-only"
                                value={r.id}
                                checked={checked}
                                onChange={() => {
                                  field.onChange(r.id);
                                  /* Switching TO a place-bound role drops any
                                     locations that are not one of its places.
                                     Without this, ticking three boxes and then
                                     choosing Warehouse Keeper leaves a hidden
                                     selection the radio below cannot show and
                                     the API then refuses -- a validation error
                                     about something no longer on screen. */
                                  const bound = PLACE_BOUND[r.key];
                                  if (!bound) return;
                                  const kept = form
                                    .getValues("locationIds")
                                    .filter((id) =>
                                      lookups.locations.some((l) => l.id === id && l.kind === bound.kind));
                                  form.setValue("locationIds", kept.slice(0, 1));
                                }}
                                onBlur={field.onBlur}
                              />
                              <span
                                aria-hidden
                                className={cn(
                                  "mt-0.5 size-4 shrink-0 rounded-full border flex items-center justify-center transition-colors",
                                  checked
                                    ? "bg-brand-yellow border-brand-yellow"
                                    : "border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800"
                                )}
                              >
                                {checked && <span className="size-1.5 rounded-full bg-navy-900" />}
                              </span>
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
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">
                    {place ? `Which ${place.noun}` : "Location Access"} <span className="text-danger">*</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {place
                      ? `${place.hint} One only \u2014 if somebody genuinely covers two cities, give them two accounts.`
                      : "The user only sees stock and documents for these locations."}
                  </p>

                  <FormField control={form.control} name="locationIds" render={({ field }) => (
                    <FormItem>
                      {/* ONE PLACE, CHOSEN FROM WHAT THE OWNER HAS CREATED.
                          A radio list rather than a dropdown, because the city
                          matters as much as the name and a one-line option
                          cannot show both comfortably. When the owner has not
                          set one up yet it says so, rather than rendering an
                          empty box that looks broken. */}
                      {place ? (
                        places.length === 0 ? (
                          <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                            <div className="text-sm font-semibold text-warning-dark dark:text-warning-light">
                              No {place.noun} has been set up yet
                            </div>
                            <p className="text-xs text-warning-dark/80 dark:text-warning-light/80 mt-1">
                              Add one under{" "}
                              <Link href="/admin/locations" className="underline font-medium">
                                Administration &rarr; Locations
                              </Link>{" "}
                              &mdash; one {place.noun} per city &mdash; and it will appear here.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2" role="radiogroup" aria-label={`Which ${place.noun}`}>
                            {places.map((b) => {
                              const checked = field.value.length === 1 && field.value[0] === b.id;
                              return (
                                <label
                                  key={b.id}
                                  className={cn(
                                    "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                                    "hover:border-brand-yellow/40",
                                    checked
                                      ? "border-brand-yellow bg-brand-yellow/5"
                                      : "border-slate-200 dark:border-navy-700"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name="placeId"
                                    className="sr-only"
                                    value={b.id}
                                    checked={checked}
                                    /* Replaces rather than adds: exactly one. */
                                    onChange={() => field.onChange([b.id])}
                                    onBlur={field.onBlur}
                                  />
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "mt-0.5 size-4 shrink-0 rounded-full border flex items-center justify-center transition-colors",
                                      checked
                                        ? "bg-brand-yellow border-brand-yellow"
                                        : "border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-800"
                                    )}
                                  >
                                    {checked && <span className="size-1.5 rounded-full bg-navy-900" />}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-navy-900 dark:text-white">{b.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {b.city} &middot; <span className="tabular">{b.code}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {lookups.locations.map((b) => {
                            const checked = field.value.includes(b.id);
                            return (
                              <label key={b.id} className="flex items-center gap-2.5 p-3 border border-slate-200 dark:border-navy-700 rounded-lg cursor-pointer hover:border-brand-yellow/40 transition-colors">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    if (v) field.onChange([...field.value, b.id]);
                                    else   field.onChange(field.value.filter((x) => x !== b.id));
                                  }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-navy-900 dark:text-white">{b.name}</div>
                                  <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                                    {b.city} &middot; {b.code}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
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

function FormSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-52" />
        <Skeleton className="h-7 w-44" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardBody><SkeletonText lines={5} /></CardBody></Card>
          <Card><CardBody><SkeletonText lines={5} /></CardBody></Card>
        </div>
        <div className="space-y-6">
          <Card><CardBody><SkeletonText lines={2} /></CardBody></Card>
          <Card><CardBody><SkeletonText lines={2} /></CardBody></Card>
        </div>
      </div>
    </>
  );
}
