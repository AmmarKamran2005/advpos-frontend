"use client";

import * as React from "react";
import axios from "axios";
import { z } from "zod";
import { Plus, Truck, Edit3, Trash2, Phone, User, Info, AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
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
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /admin/couriers. The consignment count is computed by the API, so the
   delivery list never has to reach the browser just to be counted. */
type Courier = {
  id: number;
  name: string;
  shortName: string;
  contactPerson: string | null;
  phone: string | null;
  codSettlementDays: number;
  bookingCharge: number;
  codFeePercent: number;
  trackingUrlTemplate: string | null;
  isActive: boolean;
  consignmentCount: number;
  /* The parent category (delivery channel) the courier sits under. The
     dispatch form offers, for the channel the desk picks, only the couriers
     linked to it, so this is what decides where a courier shows up there.
     null = under no channel yet (never offered on dispatch). channelIds lists
     every link that exists; more than one is older data the owner should fix
     by editing the courier and saving it once. */
  channelId: number | null;
  channelName: string | null;
  channelIds: number[];
};

/* GET /admin/couriers/channels — the four parent categories, in id order. */
type Channel = {
  id: number;
  key: string;
  name: string;
  description: string;
  isActive: boolean;
};

const Schema = z.object({
  /* A select's value is a string; it is turned into a number on submit. */
  channelId: z.string().min(1, "Pick the parent category"),
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

/** Every failure comes back as { message } — show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* EntityFormDialog raises its own success toast the instant onSubmit resolves,
   reading this object at that moment. Writing the server reply here before
   returning gives one save exactly one toast, in the wording the API sent,
   without having to change the shared dialog. */
const savedMessage: { title: string; description?: string } = { title: "Courier saved" };

export default function CouriersPage() {
  const [rows, setRows] = React.useState<Courier[]>([]);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  /* "all" or a channel id as a string — which category's couriers to show. */
  const [filter, setFilter] = React.useState<string>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; courier?: Courier } | null>(null);
  const [del, setDel] = React.useState<Courier | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      /* Both at once: the list cannot be grouped without the categories, and
         two sequential round trips would double the wait for no reason. */
      const [res, ch] = await Promise.all([
        axios.get<Courier[]>(`${API_BASE_URL}/admin/couriers`, { headers: authHeader() }),
        axios.get<Channel[]>(`${API_BASE_URL}/admin/couriers/channels`, { headers: authHeader() }),
      ]);
      setRows(res.data);
      setChannels(ch.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the couriers."));
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

  /* One section per category, in channel order, then a catch-all for
     couriers under no category (or under one that no longer exists) so nothing
     silently drops off the screen. Memoised: it only changes when data does. */
  const groups = React.useMemo(() => {
    const known = new Set(channels.map((c) => c.id));
    const list: { key: string; title: string; description?: string; inactive?: boolean; couriers: Courier[] }[] =
      channels.map((ch) => ({
        key: String(ch.id),
        title: ch.name,
        description: ch.description,
        inactive: !ch.isActive,
        couriers: rows.filter((r) => r.channelId === ch.id),
      }));
    const orphans = rows.filter((r) => r.channelId === null || !known.has(r.channelId));
    if (orphans.length > 0) {
      list.push({
        key: "none",
        title: "No parent category",
        description: "Not offered on the dispatch screen until a category is picked.",
        couriers: orphans,
      });
    }
    return list;
  }, [rows, channels]);

  const visibleGroups = filter === "all" ? groups : groups.filter((g) => g.key === filter);
  const unassigned = rows.filter((r) => r.channelId === null).length;
  const multi = rows.filter((r) => r.channelIds.length > 1).length;

  /* Only active categories can be picked (the API refuses the rest). When the
     courier being edited sits under an inactive one it is still listed so the
     select does not appear blank; saving it then asks for an active one. */
  const editingChannel = dialog?.mode === "edit" ? dialog.courier?.channelId ?? null : null;
  const channelOptions = channels
    .filter((c) => c.isActive || c.id === editingChannel)
    .map((c) => ({ value: String(c.id), label: c.isActive ? c.name : `${c.name} (inactive)` }));

  /* A new courier opened while one category is filtered starts in that
     category — that is almost always what the owner means. */
  const newChannelDefault =
    filter !== "all" && filter !== "none" && channels.some((c) => String(c.id) === filter && c.isActive)
      ? filter
      : "";

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "channelId", label: "Parent category", type: "select", required: true, fullWidth: true,
      options: channelOptions, hint: "The dispatch screen lists this courier under this category only" },
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

  async function submit(data: Form) {
    const body = {
      channelId: Number(data.channelId),
      name: data.name,
      shortName: data.shortName,
      contactPerson: data.contactPerson ?? "",
      phone: data.phone ?? "",
      codSettlementDays: data.codSettlementDays,
      bookingCharge: data.bookingCharge,
      codFeePercent: data.codFeePercent,
      trackingUrlTemplate: data.trackingUrlTemplate ?? "",
      isActive: data.isActive,
    };
    const editing = dialog?.mode === "edit" ? dialog.courier : undefined;
    try {
      const res = editing
        ? await axios.put<{ message: string }>(
            `${API_BASE_URL}/admin/couriers/${editing.id}`, body, { headers: authHeader() })
        : await axios.post<{ message: string; id: number }>(
            `${API_BASE_URL}/admin/couriers`, body, { headers: authHeader() });
      savedMessage.title = res.data?.message || "Courier saved";
      savedMessage.description = data.name;
      /* If the list is filtered to another category, the saved courier would
         seem to vanish; jump to where it now lives. */
      if (filter !== "all" && filter !== data.channelId) setFilter(data.channelId);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not save the courier."));
      /* Rethrowing keeps the dialog open with the typed values intact. */
      throw e;
    }
  }

  async function confirmDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      const res = await axios.delete<{ message: string }>(
        `${API_BASE_URL}/admin/couriers/${del.id}`,
        { headers: authHeader() }
      );
      /* An unused courier is deleted, one with deliveries against it is only
         retired. The reply says which happened, so repeat it verbatim. */
      toast.success(res.data?.message || "Courier deleted", { description: del.name });
      setDel(null);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the courier."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Couriers" }]}
        title="Couriers"
        subtitle="The delivery companies you book consignments with, under the category they serve."
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
            Each courier sits under one parent category. On the dispatch screen,
            picking a category lists only the couriers under it. Charges and
            settlement days feed the Delivery screen&rsquo;s COD tracking, so keep
            them in step with what each courier actually bills.
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-14 w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertCircle}
              title="Could not load couriers"
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
              icon={Truck}
              title="No couriers yet"
              description="Add the delivery companies you book consignments with. Their charges feed COD tracking on every consignment."
              action={
                <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
                  <Plus />
                  <span>New Courier</span>
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {(unassigned > 0 || multi > 0) && (
            <Card className="mb-4 border-warning/30 bg-warning/5">
              <CardBody className="flex items-start gap-3 py-3">
                <AlertTriangle className="size-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {unassigned > 0 && (
                    <>
                      {unassigned} {unassigned === 1 ? "courier has" : "couriers have"} no parent
                      category and will not appear on the dispatch screen.{" "}
                    </>
                  )}
                  {multi > 0 && (
                    <>
                      {multi} {multi === 1 ? "courier is" : "couriers are"} under more than one
                      category.{" "}
                    </>
                  )}
                  Open each one, pick its category and save.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Category filter. Chips wrap rather than scroll so nothing is
              cut off at 375px. */}
          <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Parent category">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={rows.length} />
            {groups.map((g) => (
              <FilterChip
                key={g.key}
                active={filter === g.key}
                onClick={() => setFilter(g.key)}
                label={g.title}
                count={g.couriers.length}
              />
            ))}
          </div>

          <div className="space-y-6">
            {visibleGroups.map((g) => (
              <section key={g.key} aria-labelledby={`courier-group-${g.key}`}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 id={`courier-group-${g.key}`} className="text-sm font-semibold text-navy-900 dark:text-white">
                    {g.title}
                  </h2>
                  <span className="text-2xs text-slate-500 dark:text-slate-400">
                    {g.couriers.length} {g.couriers.length === 1 ? "courier" : "couriers"}
                  </span>
                  {g.inactive && <Badge variant="muted">Inactive</Badge>}
                </div>
                {g.description && (
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{g.description}</p>
                )}

                {g.couriers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-navy-700 p-4 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span className="flex-1 min-w-[12rem]">No couriers under this category yet.</span>
                    {!g.inactive && g.key !== "none" && (
                      <Button variant="ghost" size="sm" className="gap-1.5"
                        onClick={() => { setFilter(g.key); setDialog({ mode: "create" }); }}>
                        <Plus />
                        <span>Add one</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {g.couriers.map((c) => {
                      const used = c.consignmentCount;
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
                                {c.channelIds.length > 1 && (
                                  <div className="mt-1 text-2xs text-warning">
                                    Also under {c.channelIds.length - 1} other{" "}
                                    {c.channelIds.length - 1 === 1 ? "category" : "categories"}
                                    {" "}&mdash; edit and save to keep just one.
                                  </div>
                                )}
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
                )}
              </section>
            ))}
          </div>
        </>
      )}

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Courier"
        schema={Schema}
        fields={fields}
        defaultValues={{
          channelId: dialog?.courier?.channelId != null ? String(dialog.courier.channelId) : newChannelDefault,
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
        onSubmit={submit}
        successMessage={savedMessage}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description="Past deliveries keep showing this courier. If any consignment references it, it is retired instead of removed."
        variant="danger"
        confirmLabel="Delete courier"
        loading={deleting}
        onConfirm={confirmDelete}
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

function FilterChip({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-navy-900 bg-navy-900 text-white dark:border-white dark:bg-white dark:text-navy-900"
          : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800"
      )}
    >
      <span>{label}</span>
      <span className="tabular opacity-70">{count}</span>
    </button>
  );
}
