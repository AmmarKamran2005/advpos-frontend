"use client";

import * as React from "react";
import { z } from "zod";
import {
  Plus, Warehouse, Store, ClipboardList, PackageX, Edit3, Trash2, Star,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import {
  activeLocations, locationKindLabels, type StockLocation, type LocationKind,
} from "@/data/settings";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<LocationKind, typeof Warehouse> = {
  warehouse: Warehouse,
  shop: Store,
  department: ClipboardList,
  claim: PackageX,
};

const Schema = z.object({
  code: z.string().min(2, "Code required").max(12),
  name: z.string().min(2, "Name required").max(60),
  kind: z.enum(["warehouse", "shop", "department", "claim"]),
  inCharge: z.string().max(60).optional(),
  address: z.string().max(160).optional(),
  isDefault: z.boolean(),
  excludeFromSellable: z.boolean(),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function LocationsPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; loc?: StockLocation } | null>(null);
  const [del, setDel] = React.useState<StockLocation | null>(null);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "code", label: "Code", type: "text", placeholder: "LOC-04", required: true, hint: "Shown on transfers and stock reports" },
    { name: "name", label: "Name", type: "text", placeholder: "e.g. Shop 3", required: true },
    {
      name: "kind", label: "Type", type: "select", required: true,
      options: (Object.keys(locationKindLabels) as LocationKind[]).map((k) => ({
        value: k, label: locationKindLabels[k],
      })),
    },
    { name: "inCharge", label: "In charge", type: "text", placeholder: "Who runs this place" },
    { name: "address", label: "Address", type: "text", fullWidth: true },
    { name: "isDefault", label: "Use by default on new documents", type: "switch", fullWidth: true },
    { name: "excludeFromSellable", label: "Do not count as sellable stock", type: "switch", hint: "Turn on for claim or damaged-goods locations", fullWidth: true },
    { name: "isActive", label: "Active", type: "switch", fullWidth: true },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Locations" }]}
        title="Locations"
        subtitle="Every place stock can sit. Transfers move goods between these."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Location</span>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activeLocations().map((loc) => {
          const Icon = KIND_ICON[loc.kind];
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
                      {loc.code} · {locationKindLabels[loc.kind]}
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
                    <dd className="text-slate-700 dark:text-slate-200 truncate">{loc.address || "—"}</dd>
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
          code: dialog?.loc?.code ?? `LOC-0${activeLocations().length + 1}`,
          name: dialog?.loc?.name ?? "",
          kind: dialog?.loc?.kind ?? "warehouse",
          inCharge: dialog?.loc?.inCharge ?? "",
          address: dialog?.loc?.address ?? "",
          isDefault: dialog?.loc?.isDefault ?? false,
          excludeFromSellable: dialog?.loc?.excludeFromSellable ?? false,
          isActive: dialog?.loc?.isActive ?? true,
        }}
        successMessage={
          dialog?.mode === "edit"
            ? { title: "Location updated", description: dialog?.loc?.name }
            : { title: "Location added" }
        }
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description="Stock sitting here must be moved to another location first. Past documents keep showing this name."
        variant="danger"
        confirmLabel="Delete location"
        onConfirm={() => {
          toast.success("Location deleted", { description: del?.name });
          setDel(null);
        }}
      />
    </>
  );
}
