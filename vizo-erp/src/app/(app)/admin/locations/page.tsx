"use client";

import * as React from "react";
import axios from "axios";
import { z } from "zod";
import {
  Plus, Warehouse, Store, ClipboardList, PackageX, Truck, Edit3, Trash2, Star,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityFormDialog } from "@/components/dialogs/entity-form-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /admin/locations?includeInactive=true */
type StockLocation = {
  id: number;
  code: string;
  name: string;
  kindId: number;
  kind: string;
  kindLabel: string;
  cityId: number;
  city: string;
  address: string | null;
  inChargeUserId: number | null;
  inCharge: string | null;
  isActive: boolean;
  isDefault: boolean;
  excludeFromSellable: boolean;
  stockUnits: number;
};

/* Only the three slices of GET /admin/lookups this screen fills dropdowns from. */
type Lookups = {
  locationKinds: { id: number; key: string; name: string }[];
  cities: { id: number; name: string; province: string }[];
  staff: { id: number; name: string; role: string }[];
};

const KIND_ICON: Record<string, typeof Warehouse> = {
  warehouse: Warehouse,
  shop: Store,
  department: ClipboardList,
  claim: PackageX,
  transit: Truck,
};

const Schema = z.object({
  code: z.string().min(2, "Code required").max(12),
  name: z.string().min(2, "Name required").max(60),
  kindId: z.coerce.number().int().min(1, "Choose a type"),
  cityId: z.coerce.number().int().min(1, "Choose a city"),
  /* 0 is the "nobody yet" option; it goes to the API as null. */
  inChargeUserId: z.coerce.number().int().min(0),
  address: z.string().max(160).optional(),
  isDefault: z.boolean(),
  excludeFromSellable: z.boolean(),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* EntityFormDialog raises its own success toast the instant onSubmit resolves,
   reading this object at that moment. Writing the server reply here before
   returning gives one save exactly one toast, in the wording the API sent. */
const savedMessage: { title: string; description?: string } = { title: "Location saved" };

export default function LocationsPage() {
  const [rows, setRows] = React.useState<StockLocation[]>([]);
  const [lookups, setLookups] = React.useState<Lookups | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; loc?: StockLocation } | null>(null);
  const [del, setDel] = React.useState<StockLocation | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  /* One trip for the cards, one for every dropdown the form needs. */
  const load = React.useCallback(async () => {
    try {
      const [list, look] = await Promise.all([
        axios.get<StockLocation[]>(`${API_BASE_URL}/admin/locations?includeInactive=true`, {
          headers: authHeader(),
        }),
        axios.get<Lookups>(`${API_BASE_URL}/admin/lookups`, { headers: authHeader() }),
      ]);
      setRows(list.data);
      setError(null);
      setLookups(look.data);
    } catch (e) {
      setError(apiMessage(e, "Could not load the locations."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. Disabled here rather
       than globally so the rule still catches the cases worth fixing. */
    void load();
  }, [load]);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "code", label: "Code", type: "text", placeholder: "LOC-04", required: true, hint: "Shown on transfers and stock reports — must be unique" },
    { name: "name", label: "Name", type: "text", placeholder: "e.g. Shop 3", required: true },
    {
      name: "kindId", label: "Type", type: "select", required: true,
      options: (lookups?.locationKinds ?? []).map((k) => ({ value: k.id, label: k.name })),
    },
    {
      name: "cityId", label: "City", type: "select", required: true,
      options: (lookups?.cities ?? []).map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "inChargeUserId", label: "In charge", type: "select",
      hint: "Who runs this place",
      options: [
        { value: 0, label: "— Nobody yet —" },
        ...(lookups?.staff ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.role}` })),
      ],
    },
    { name: "address", label: "Address", type: "text", fullWidth: true },
    { name: "isDefault", label: "Use by default on new documents", type: "switch", fullWidth: true },
    { name: "excludeFromSellable", label: "Do not count as sellable stock", type: "switch", hint: "Turn on for claim or damaged-goods locations", fullWidth: true },
    { name: "isActive", label: "Active", type: "switch", fullWidth: true },
  ];

  async function submit(data: Form) {
    const body = {
      code: data.code,
      name: data.name,
      kindId: data.kindId,
      cityId: data.cityId,
      address: data.address ?? "",
      inChargeUserId: data.inChargeUserId > 0 ? data.inChargeUserId : null,
      isActive: data.isActive,
      isDefault: data.isDefault,
      excludeFromSellable: data.excludeFromSellable,
    };
    const editing = dialog?.mode === "edit" ? dialog.loc : undefined;
    try {
      const res = editing
        ? await axios.put<{ message: string }>(
            `${API_BASE_URL}/admin/locations/${editing.id}`, body, { headers: authHeader() })
        : await axios.post<{ message: string; id: number }>(
            `${API_BASE_URL}/admin/locations`, body, { headers: authHeader() });
      savedMessage.title = res.data?.message || "Location saved";
      savedMessage.description = data.name;
      /* isDefault is enforced server-side — it clears the flag everywhere else,
         so the refetch is what makes the other cards drop their star. */
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not save the location."));
      /* Rethrowing keeps the dialog open with the typed values intact. */
      throw e;
    }
  }

  async function confirmDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/admin/locations/${del.id}`,
        { headers: authHeader() }
      );
      toast.success(res.data?.message || "Location deleted", { description: del.name });
      setDel(null);
      await load();
    } catch (e) {
      /* Refused while stock sits there, and refused for the default location. */
      toast.error(apiMessage(e, "Could not delete the location."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Locations" }]}
        title="Locations"
        subtitle="Every place stock can sit. Transfers move goods between these."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" disabled={loading}
            onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Location</span>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load locations"
              description={error}
              action={
                <Button variant="accent" onClick={() => void load()}>
                  <RefreshCw />
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Warehouse}
              title="No locations yet"
              description="Add the warehouses, shops and claim rooms stock can sit in. Every transfer and invoice picks from this list."
              action={
                <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
                  <Plus />
                  <span>New Location</span>
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((loc) => {
            const Icon = KIND_ICON[loc.kind] ?? Warehouse;
            return (
              <Card key={loc.id} className={cn(!loc.isActive && "opacity-60")}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="size-5 text-brand-yellow" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-navy-900 dark:text-white truncate">
                          {loc.name}
                        </h3>
                        {loc.isDefault && (
                          <Star className="size-3.5 text-brand-yellow fill-brand-yellow flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">
                        {loc.code} · {loc.kindLabel}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-1.5 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">In charge</dt>
                      <dd className="text-slate-700 dark:text-slate-200 truncate">{loc.inCharge || "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">Address</dt>
                      <dd className="text-slate-700 dark:text-slate-200 truncate">{loc.address || loc.city || "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                    <Badge variant={loc.isActive ? "success" : "muted"}>
                      {loc.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {loc.excludeFromSellable && <Badge variant="warning">Not sellable</Badge>}
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${loc.name}`}
                        onClick={() => setDialog({ mode: "edit", loc })}>
                        <Edit3 />
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${loc.name}`}
                        onClick={() => setDel(loc)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Adding a location makes it available on every transfer, invoice and stock
        screen straight away — nothing else needs changing.
      </p>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Location"
        schema={Schema}
        fields={fields}
        defaultValues={{
          /* No client-side next-code guess: the server owns uniqueness. */
          code: dialog?.loc?.code ?? "",
          name: dialog?.loc?.name ?? "",
          kindId: dialog?.loc?.kindId ?? 0,
          cityId: dialog?.loc?.cityId ?? 0,
          inChargeUserId: dialog?.loc?.inChargeUserId ?? 0,
          address: dialog?.loc?.address ?? "",
          isDefault: dialog?.loc?.isDefault ?? false,
          excludeFromSellable: dialog?.loc?.excludeFromSellable ?? false,
          isActive: dialog?.loc?.isActive ?? true,
        }}
        onSubmit={submit}
        successMessage={savedMessage}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description={
          del && del.stockUnits > 0
            ? `${del.stockUnits.toLocaleString()} units still sit here — the API refuses until they are moved elsewhere. Past documents keep showing this name.`
            : "The default location cannot be removed. Past documents keep showing this name."
        }
        variant="danger"
        confirmLabel="Delete location"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
