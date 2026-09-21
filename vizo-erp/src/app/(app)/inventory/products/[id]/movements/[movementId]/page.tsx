"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, ArrowRight, ArrowDownLeft, ArrowUpRight, ExternalLink, AlertCircle, RefreshCw,
  User, MapPin, Clock, Hash, Layers, History as HistoryIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL, authHeader, useSession } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/products/product-image";
import { itemHref, itemsCrumb } from "@/lib/item-links";
import { formatDate, formatDateTime, formatMoney, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* GET /inventory/products/{id}/movements/{movementId} -- one movement of ONE
   product, with the document it belongs to. The rest of that document is one
   click further on, behind "See complete transfer" (or receipt, or invoice). */
type Leg = {
  id: number; type: string; typeName: string; movedAt: string;
  qty: number; balanceAfter: number; location: string; by: string;
};

type DocumentBlock = {
  kind: string; label: string; id: number; no: string; url: string; completeLabel: string;
  date: string; status: string | null; statusKey: string | null;
  facts: { label: string; value: string }[];
  thisLine: { qty: number; rate: number | null; amount: number | null } | null;
  lineCount: number; totalUnits: number;
  lines: { productId: number; sku: string; name: string; qty: number; isThis: boolean }[];
  orderUrl?: string | null;
};

type MovementDetail = {
  id: number; type: string; typeName: string; movedAt: string; reference: string | null;
  qty: number; balanceAfter: number; direction: "in" | "out" | "move";
  locationId: number; location: string; locationCode: string; city: string;
  by: string; byRole: string; valueAtCost: number;
  product: { id: number; sku: string; name: string; imageUrl: string | null; packing: number; costPrice: number; dutyPrice: number };
  legs: Leg[];
  document: DocumentBlock | null;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export default function MovementDetailPage() {
  const { can } = useSession();
  const params = useParams<{ id: string; movementId: string }>();
  const productId = parseInt(params.id ?? "0", 10);
  const movementId = parseInt(params.movementId ?? "0", 10);

  const [m, setM] = React.useState<MovementDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<MovementDetail>(
        `${API_BASE_URL}/inventory/products/${productId}/movements/${movementId}`, { headers: authHeader() });
      setM(res.data);
      setError(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) setNotFound(true);
      else setError(apiMessage(e, "Could not load this movement."));
    } finally {
      setLoading(false);
    }
  }, [productId, movementId]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- axios inside the page is the brief */
    void load();
  }, [load]);

  const back = can("products.view") ? `/inventory/products/${productId}?tab=movements` : `/inventory/products/${productId}/history`;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState icon={AlertCircle} title="Movement not found"
        description="It may belong to a different product."
        action={<Button variant="accent" asChild><Link href={back}>Back to the product</Link></Button>} />
    );
  }

  if (error || !m) {
    return (
      <EmptyState icon={AlertCircle} title="Could not load this movement" description={error ?? ""}
        action={<Button variant="accent" onClick={() => { setLoading(true); void load(); }}><RefreshCw />Try again</Button>} />
    );
  }

  const doc = m.document;
  const isTransfer = m.type === "TRANSFER_OUT" || m.type === "TRANSFER_IN";
  const outLeg = m.legs.find((l) => l.type === "TRANSFER_OUT");
  const inLeg = m.legs.find((l) => l.type === "TRANSFER_IN");
  const from = isTransfer ? (outLeg?.location ?? doc?.facts.find((f) => f.label === "From")?.value) : m.qty < 0 ? m.location : null;
  const to = isTransfer ? (inLeg?.location ?? doc?.facts.find((f) => f.label === "To")?.value) : m.qty >= 0 ? m.location : null;
  const qty = Math.abs(isTransfer ? (outLeg ?? inLeg ?? m).qty : m.qty);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inventory" },
          itemsCrumb(can),
          { label: m.product.name, href: itemHref(can, productId) },
          { label: "Movements", href: back },
          { label: m.reference ?? `#${m.id}` },
        ]}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <span>{isTransfer ? "Transfer" : m.typeName}</span>
            {m.reference && <span className="tabular text-slate-500 dark:text-slate-400">{m.reference}</span>}
            {doc?.status && <Badge variant="info">{doc.status}</Badge>}
          </div>
        }
        subtitle={`${formatDateTime(m.movedAt)} · by ${m.by}`}
        actions={
          <>
            <Button variant="ghost" asChild><Link href={back}><ArrowLeft /> <span className="hidden sm:inline">Movements</span></Link></Button>
            {doc && (
              <Button variant="accent" className="gap-1.5" asChild>
                <Link href={doc.url}><ExternalLink /> {doc.completeLabel}</Link>
              </Button>
            )}
          </>
        }
      />

      {/* ── what happened, in one line ─────────────────────────────── */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <Link href={itemHref(can, productId)} className="flex items-center gap-3 min-w-0 group lg:w-80">
              <ProductImage url={m.product.imageUrl} name={m.product.name} size="lg" zoom={false} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy-900 dark:text-white group-hover:text-brand-yellow-700 dark:group-hover:text-brand-yellow line-clamp-2">
                  {m.product.name}
                </div>
                <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{m.product.sku}</div>
              </div>
            </Link>

            <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
              <Place label="From" value={from ?? (m.type === "PURCHASE" ? "Supplier" : "—")} />
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={cn("tabular text-2xl font-bold flex items-center gap-1",
                  m.direction === "in" ? "text-success" : m.direction === "out" ? "text-danger" : "text-info")}>
                  {m.direction === "in" && <ArrowDownLeft className="size-5" />}
                  {m.direction === "out" && <ArrowUpRight className="size-5" />}
                  {qty}
                </div>
                <ArrowRight className="size-5 text-slate-400" />
                <span className="text-2xs text-slate-500 dark:text-slate-400">pieces</span>
              </div>
              <Place label="To" value={to ?? (m.type === "SALE" ? "Customer" : m.type === "PURCHASE_RETURN" ? "Supplier" : "—")} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── the details ───────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">
                {doc ? doc.label : "Movement"} details
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Fact icon={Hash} label="Reference" value={m.reference ?? "—"} mono />
                <Fact icon={Clock} label="Recorded" value={formatDateTime(m.movedAt)} />
                {doc && <Fact icon={Clock} label="Document date" value={formatDate(doc.date)} />}
                <Fact icon={User} label="Done by" value={`${m.by} (${m.byRole})`} />
                <Fact icon={MapPin} label="Location" value={`${m.location} · ${m.locationCode}`} hint={m.city} />
                <Fact icon={Layers} label="Left at that location" value={`${m.balanceAfter} pieces`} />
                {doc?.facts.map((f) => <Fact key={f.label} label={f.label} value={f.value} />)}
                {doc?.thisLine?.rate !== null && doc?.thisLine?.rate !== undefined && (
                  <Fact label="Rate on the document" value={`${formatMoney(doc.thisLine.rate)} each`}
                    hint={doc.thisLine.amount !== null ? `${formatMoney(doc.thisLine.amount)} for this line` : undefined} />
                )}
                <Fact label="Value at today's landed cost" value={formatMoney(m.valueAtCost)}
                  hint={`${qty} × ${formatMoney(m.product.costPrice + m.product.dutyPrice)}`} />
              </dl>
            </CardBody>
          </Card>

          {/* Both legs of a transfer: out of one shelf, into the other. */}
          {m.legs.length > 1 && (
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-1">Both sides of this transfer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Stock leaves one shelf and arrives at the other — often hours apart.
                </p>
                <ol className="space-y-3">
                  {m.legs.map((l) => (
                    <li key={l.id} className={cn("rounded-lg border p-3",
                      l.id === m.id ? "border-brand-yellow bg-brand-yellow/5" : "border-slate-200 dark:border-navy-700")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-navy-900 dark:text-white">
                            {l.qty < 0 ? "Left" : "Arrived at"} {l.location}
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">
                            {formatDate(l.movedAt)} · {formatTime(l.movedAt)} · by {l.by}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={cn("tabular font-bold", l.qty < 0 ? "text-danger" : "text-success")}>
                            {l.qty > 0 ? "+" : ""}{l.qty}
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">{l.balanceAfter} left there</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ── the rest of the document ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {doc && (
            <Card>
              <CardBody>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white">On the same {doc.label.toLowerCase()}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.lineCount} product{doc.lineCount === 1 ? "" : "s"} · {doc.totalUnits} pieces in all
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-navy-700">
                  {doc.lines.slice(0, 12).map((l) => (
                    <li key={`${l.productId}-${l.sku}`} className={cn("flex items-center justify-between gap-3 py-2",
                      l.isThis && "-mx-2 rounded-md bg-brand-yellow/10 px-2")}>
                      <div className="min-w-0">
                        <div className="truncate text-sm text-navy-900 dark:text-white">
                          {l.isThis ? <b>{l.name}</b> : <Link href={itemHref(can, l.productId)} className="hover:underline">{l.name}</Link>}
                        </div>
                        <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{l.sku}</div>
                      </div>
                      <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">{l.qty}</div>
                    </li>
                  ))}
                </ul>
                {doc.lines.length > 12 && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">and {doc.lines.length - 12} more…</p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="accent" className="w-full gap-1.5" asChild>
                    <Link href={doc.url}><ExternalLink /> {doc.completeLabel}</Link>
                  </Button>
                  {doc.orderUrl && (
                    <Button variant="secondary" className="w-full gap-1.5" asChild>
                      <Link href={doc.orderUrl}>Open the customer order</Link>
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="flex items-center gap-3">
              <HistoryIcon className="size-5 text-brand-yellow flex-shrink-0" />
              <div className="flex-1 text-sm text-navy-900 dark:text-white">Everything else that happened to this product</div>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/inventory/products/${productId}/history`}>History</Link>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Place({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-navy-700 dark:bg-navy-900">
      <div className="text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-navy-900 dark:text-white break-words">{value}</div>
    </div>
  );
}

function Fact({ icon: Icon, label, value, hint, mono }: {
  icon?: typeof User; label: string; value: string; hint?: string; mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {Icon && <Icon className="size-3" />}{label}
      </dt>
      <dd className={cn("mt-0.5 text-sm font-medium text-navy-900 dark:text-white break-words", mono && "tabular")}>{value}</dd>
      {hint && <dd className="text-2xs text-slate-500 dark:text-slate-400">{hint}</dd>}
    </div>
  );
}
