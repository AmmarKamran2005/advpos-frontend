"use client";

import * as React from "react";
import { z } from "zod";
import { Plus, Truck, Edit3, Trash2, Phone, User, Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityFormDialog, ConfirmDialog } from "@/components/dialogs";
import { toast } from "@/components/ui/toaster";
import { couriers, type Courier } from "@/data/settings";
import { deliveries } from "@/data/delivery";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const Schema = z.object({
  name: z.string().min(2, "Name required").max(60),
  shortName: z.string().min(1, "Short name required").max(12),
  contactPerson: z.string().max(60).optional(),
  phone: z.string().max(24).optional(),
  codSettlementDays: z.coerce.number().min(0).max(60),
  bookingCharge: z.coerce.number().min(0),
  codFeePercent: z.coerce.number().min(0).max(20),
  trackingUrlTemplate: z.string().max(200).optional(),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

export default function CouriersPage() {
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; courier?: Courier } | null>(null);
  const [del, setDel] = React.useState<Courier | null>(null);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "name", label: "Courier name", type: "text", placeholder: "e.g. TCS Courier", required: true },
    { name: "shortName", label: "Short name", type: "text", placeholder: "TCS", required: true, hint: "Shown in tables" },
    { name: "contactPerson", label: "Contact person", type: "text" },
    { name: "phone", label: "Phone", type: "tel", placeholder: "021 111 123 456" },
    { name: "bookingCharge", label: "Booking charge (PKR)", type: "number", hint: "Flat fee per consignment" },
    { name: "codFeePercent", label: "COD fee (%)", type: "number", hint: "Percent of collected cash the courier keeps" },
    { name: "codSettlementDays", label: "COD settled in (days)", type: "number", hint: "How long before the cash reaches us" },
    { name: "trackingUrlTemplate", label: "Tracking link", type: "url", placeholder: "https://…/track/{tracking}", fullWidth: true, hint: "Use {tracking} where the number goes" },
    { name: "isActive", label: "Active", type: "switch", fullWidth: true },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Couriers" }]}
        title="Couriers"
        subtitle="The delivery companies you book consignments with."
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Courier</span>
          </Button>
        }
      />

      <Card className="mb-4 border-info/30 bg-info/5">
        <CardBody className="flex items-start gap-3 py-3">
          <Info className="size-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Placeholder list — replace these with the couriers you actually use.
            Charges and settlement days feed the Delivery screen&rsquo;s COD tracking.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {couriers.map((c) => {
          const used = deliveries.filter((d) => d.courierId === c.id).length;
          return (
            <Card key={c.id} className={cn(!c.isActive && "opacity-60")}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="size-5 text-brand-yellow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white truncate">
                      {c.name}
                    </h3>
                    <div className="text-2xs text-slate-500 dark:text-slate-400">
                      {used} {used === 1 ? "consignment" : "consignments"}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 space-y-1.5 text-xs">
                  <Row icon={User} value={c.contactPerson || "—"} />
                  <Row icon={Phone} value={c.phone || "—"} tabular />
                </dl>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Booking" value={c.bookingCharge > 0 ? formatMoney(c.bookingCharge).replace("PKR ", "") : "free"} />
                  <Metric label="COD fee" value={`${c.codFeePercent}%`} />
                  <Metric label="Settles" value={c.codSettlementDays === 0 ? "same day" : `${c.codSettlementDays}d`} />
                </div>

                <div className="mt-4 flex items-center gap-1.5">
                  <Badge variant={c.isActive ? "success" : "muted"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`}
                      onClick={() => setDialog({ mode: "edit", courier: c })}>
                      <Edit3 />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-danger" aria-label={`Delete ${c.name}`}
                      onClick={() => setDel(c)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Courier"
        schema={Schema}
        fields={fields}
        defaultValues={{
          name: dialog?.courier?.name ?? "",
          shortName: dialog?.courier?.shortName ?? "",
          contactPerson: dialog?.courier?.contactPerson ?? "",
          phone: dialog?.courier?.phone ?? "",
          codSettlementDays: dialog?.courier?.codSettlementDays ?? 7,
          bookingCharge: dialog?.courier?.bookingCharge ?? 200,
          codFeePercent: dialog?.courier?.codFeePercent ?? 1.5,
          trackingUrlTemplate: dialog?.courier?.trackingUrlTemplate ?? "",
          isActive: dialog?.courier?.isActive ?? true,
        }}
        successMessage={
          dialog?.mode === "edit"
            ? { title: "Courier updated", description: dialog?.courier?.name }
            : { title: "Courier added" }
        }
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description="Past deliveries keep showing this courier. You will not be able to book new ones with it."
        variant="danger"
        confirmLabel="Delete courier"
        onConfirm={() => {
          toast.success("Courier deleted", { description: del?.name });
          setDel(null);
        }}
      />
    </>
  );
}

function Row({ icon: Icon, value, tabular }: { icon: typeof User; value: string; tabular?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3 text-slate-400 flex-shrink-0" />
      <span className={cn("text-slate-700 dark:text-slate-200 truncate", tabular && "tabular")}>
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 dark:bg-navy-900 py-1.5">
      <div className="tabular text-xs font-semibold text-navy-900 dark:text-white">{value}</div>
      <div className="text-2xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
