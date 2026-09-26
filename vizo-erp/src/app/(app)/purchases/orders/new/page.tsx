"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Save, Plus, Search, Loader2, ArrowLeft, Truck, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { ProductImage } from "@/components/products/product-image";
import { PoLineCard, lineParts, lineProblem, type PoLine, type LogisticsOption } from "@/components/purchases/po-line-card";
import { LogisticsDialog } from "@/components/purchases/logistics-manager";
import { todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { num, round2, saleOf } from "@/lib/pricing";

/* ───────────────────────────────────────────────────────────────────────────
   NEW PURCHASE ORDER — rebuilt 26 Sep 2026

   The owner's rules, in the order the screen follows them:
   * Receiving location: every place EXCEPT Claim Stock (the API leaves every
     claim-kind location out of the list and refuses one anyway).
   * PO date: today by default, editable — back-dating a purchase that was
     made last week is normal. No Expected Delivery: the goods are counted in
     the moment the order is saved.
   * Each item opens with the five price boxes — Cost, Duty (+ the logistics
     company it is paid to), Fi Sabilillah, Margin 1, Margin 2 — filled from
     the product's stored prices, a reason for each extra box, the quantity,
     and the selling price the line adds up to.
   * Before saving, every line needs its PRICE DECISION from the popup: which
     earlier purchases to average with, and the final selling price (or keep
     the current one). Nothing is averaged automatically.
   * Saving is final: stock lands, the supplier's bill is raised and the five
     vouchers are posted, in one transaction on the API.
   ─────────────────────────────────────────────────────────────────────────── */

type LookupSupplier = { id: number; code: string; name: string };
type LookupLocation = { id: number; code: string; name: string; kind: string };
type LookupProduct = {
  id: number; sku: string; name: string; imageUrl: string | null; packing: number;
  costPrice: number; dutyPrice: number; fsPrice: number; margin1Price: number; margin2Price: number; salePrice: number;
};
type Lookups = {
  suppliers: LookupSupplier[]; locations: LookupLocation[];
  logistics: LogisticsOption[]; products: LookupProduct[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [lookups, setLookups] = React.useState<Lookups>({ suppliers: [], locations: [], logistics: [], products: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [supplierId, setSupplierId] = React.useState<number | null>(null);
  const [locationId, setLocationId] = React.useState<number>(0);
  const [poDate, setPoDate] = React.useState(todayISO());
  const [billNo, setBillNo] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<PoLine[]>([]);
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [logisticsOpen, setLogisticsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  const load = React.useCallback(async (keepLocation = false) => {
    try {
      const res = await axios.get<Lookups>(`${API_BASE_URL}/purchases/lookups`, { headers: authHeader() });
      setLookups({
        suppliers: res.data.suppliers ?? [], locations: res.data.locations ?? [],
        logistics: res.data.logistics ?? [], products: res.data.products ?? [],
      });
      if (!keepLocation) setLocationId(res.data.locations?.[0]?.id ?? 0);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load suppliers, locations and products."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  const supplier = lookups.suppliers.find((s) => s.id === supplierId);

  function pickProduct(id: number) {
    const p = lookups.products.find((x) => x.id === id);
    setProductOpen(false);
    if (!p) return;
    if (lines.some((l) => l.productId === id)) {
      toast.info("That item is already on this order — change its quantity instead.");
      return;
    }
    /* The five boxes open with what the database holds for the item. */
    setLines((ls) => [...ls, {
      key: `${id}-${Date.now()}`,
      productId: id, name: p.name, sku: p.sku, imageUrl: p.imageUrl, currentSale: p.salePrice,
      qty: "1",
      cost: String(p.costPrice), duty: String(p.dutyPrice), fs: String(p.fsPrice),
      margin1: String(p.margin1Price), margin2: String(p.margin2Price),
      dutyAccountId: lookups.logistics.length === 1 ? String(lookups.logistics[0].id) : "",
      dutyNote: "", fsNote: "", margin1Note: "", margin2Note: "",
      decision: null,
    }]);
  }

  const updateLine = (key: string, next: PoLine) => setLines((ls) => ls.map((l) => (l.key === key ? next : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  /* ── totals ── */
  const t = lines.reduce((acc, l) => {
    const q = num(l.qty);
    const p = lineParts(l);
    acc.goods += q * p.cost; acc.duty += q * p.duty; acc.fs += q * p.fs;
    acc.m1 += q * p.margin1; acc.m2 += q * p.margin2; acc.sale += q * saleOf(p); acc.units += q;
    return acc;
  }, { goods: 0, duty: 0, fs: 0, m1: 0, m2: 0, sale: 0, units: 0 });
  const disc = Math.max(0, num(discount));
  const supplierTotal = round2(t.goods - disc);

  async function submit() {
    setShowErrors(true);
    if (!supplierId) return toast.error("Pick a supplier.");
    if (!locationId) return toast.error("Pick where the goods are received.");
    if (!poDate) return toast.error("Enter the purchase order date.");
    if (poDate > todayISO()) return toast.error("A purchase order cannot be dated in the future — the stock arrives when it is saved.");
    if (lines.length === 0) return toast.error("Add at least one item.");
    for (const l of lines) {
      const p = lineProblem(l);
      if (p) return toast.error(l.name, { description: p });
    }
    if (disc > t.goods) return toast.error("The discount is more than the goods are worth.");

    setSaving(true);
    try {
      const res = await axios.post<{ id: number; message: string }>(`${API_BASE_URL}/purchases/orders`, {
        supplierId, locationId, poDate,
        supplierBillNo: billNo.trim() || null,
        discount: disc,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          qty: Math.round(num(l.qty)),
          unitCost: num(l.cost), dutyPrice: num(l.duty),
          dutyAccountId: num(l.duty) > 0 ? Number(l.dutyAccountId) : null,
          fsPrice: num(l.fs), margin1Price: num(l.margin1), margin2Price: num(l.margin2),
          dutyNote: l.dutyNote.trim() || null, fsNote: l.fsNote.trim() || null,
          margin1Note: l.margin1Note.trim() || null, margin2Note: l.margin2Note.trim() || null,
          pricing: { keep: l.decision!.keep, batchIds: l.decision!.batchIds, finalSalePrice: l.decision!.finalSalePrice },
        })),
      }, { headers: authHeader() });
      toast.success("Purchase order saved", { description: res.data.message });
      router.push(`/purchases/orders/${res.data.id}`);
    } catch (e) {
      toast.error("Purchase order not saved", { description: apiMessage(e, "Please try again.") });
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Purchases" }, { label: "Orders to Supplier", href: "/purchases/orders" }, { label: "New" }]}
        title={<><Truck className="size-6 inline-block mr-2 text-brand-yellow" />New Purchase Order</>}
        subtitle="Saving puts the stock on the shelf, raises the supplier's bill and posts the vouchers — all at once."
        actions={
          <>
            <Button variant="ghost" asChild><Link href="/purchases/orders"><ArrowLeft />Back</Link></Button>
            <Button variant="accent" onClick={() => void submit()} disabled={saving || loading}>
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save />Save purchase order</>}
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-6">
          <CardBody className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="size-4" /> Try again
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6 min-w-0">
          {/* ── supplier & receiving ── */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Supplier & receiving</h3>
              <div className="mb-4">
                <Label className="mb-1.5 block">Supplier <span className="text-danger">*</span></Label>
                {supplier ? (
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar initials={supplier.name.slice(0, 2).toUpperCase()} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium text-navy-900 dark:text-white truncate">{supplier.name}</div>
                        <div className="text-2xs text-slate-500 dark:text-slate-400">{supplier.code}</div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSupplierId(null)}>Change</Button>
                  </div>
                ) : (
                  <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="w-full p-3 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm text-slate-500 dark:text-slate-400 text-left hover:border-brand-yellow transition-colors">
                        <Search className="size-4 inline-block mr-2" />Search supplier…
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(92vw,420px)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Type supplier name…" />
                        <CommandList>
                          <CommandEmpty>No supplier found.</CommandEmpty>
                          <CommandGroup>
                            {lookups.suppliers.map((s) => (
                              <CommandItem key={s.id} value={`${s.name} ${s.code}`} onSelect={() => { setSupplierId(s.id); setSupplierOpen(false); }}>
                                <Avatar initials={s.name.slice(0, 2).toUpperCase()} size="sm" />
                                <div>
                                  <div className="text-sm font-medium text-navy-900 dark:text-white">{s.name}</div>
                                  <div className="text-2xs text-slate-500 dark:text-slate-400">{s.code}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                {showErrors && !supplierId && <p className="mt-1 text-xs text-danger">Pick a supplier.</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1.5 block">Receiving location <span className="text-danger">*</span></Label>
                  {loading ? <Skeleton className="h-10" /> : (
                    <SelectNative value={locationId} onChange={(e) => setLocationId(Number(e.target.value))}>
                      {lookups.locations.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </SelectNative>
                  )}
                  <p className="mt-1 text-2xs text-slate-500">The stock lands here when you save.</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Purchase order date <span className="text-danger">*</span></Label>
                  <Input type="date" value={poDate} max={todayISO()} onChange={(e) => setPoDate(e.target.value)} />
                  <p className="mt-1 text-2xs text-slate-500">Today by default — change it if the purchase was earlier.</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">Supplier&apos;s bill no.</Label>
                  <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} maxLength={50} placeholder="Optional" />
                  <p className="mt-1 text-2xs text-slate-500">Printed on our purchase invoice.</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* ── items ── */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                  Items <span className="text-danger">*</span> ({lines.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogisticsOpen(true)}>
                    <Truck /> Logistics companies
                  </Button>
                  <Popover open={productOpen} onOpenChange={setProductOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="accent" size="sm" className="gap-1"><Plus />Add item</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(96vw,44rem)] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search products…" />
                        <CommandList className="max-h-[72vh]">
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {lookups.products.map((p) => (
                              <CommandItem key={p.id} value={`${p.sku} ${p.name}`} onSelect={() => pickProduct(p.id)} className="gap-4 py-3">
                                <ProductImage url={p.imageUrl} name={p.name} size="xl" zoom={false} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-base font-semibold">{p.name}</div>
                                  <div className="text-xs tabular text-slate-500 mt-1">
                                    {p.sku} · cost {formatMoney(p.costPrice)} · sells at {formatMoney(p.salePrice)}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {lines.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg text-sm">
                  Add the items you are buying
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((l) => (
                    <PoLineCard key={l.key} line={l} logistics={lookups.logistics} showErrors={showErrors}
                      onChange={(n) => updateLine(l.key, n)} onRemove={() => removeLine(l.key)}
                      onManageLogistics={() => setLogisticsOpen(true)} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Label className="mb-1.5 block">Notes</Label>
              <Textarea rows={3} maxLength={500} placeholder="Anything worth writing on the order" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardBody>
          </Card>
        </div>

        {/* ── totals ── */}
        <div>
          <Card className="xl:sticky xl:top-20">
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Totals</h3>
              <div className="space-y-2 text-sm">
                <RowKV label="Items / units" v={`${lines.length} / ${t.units}`} />
                <RowKV label="Goods (cost)" v={formatMoney(t.goods)} />
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-slate-500 dark:text-slate-400">Discount</span>
                  <Input type="number" min={0} step="0.01" className="w-28 text-right tabular" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-navy-700">
                  <span className="font-bold text-navy-900 dark:text-white">Owed to supplier</span>
                  <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(supplierTotal)}</span>
                </div>
                <div className="space-y-1.5 border-t border-slate-200 pt-2 dark:border-navy-700">
                  <RowKV label="Duty (logistics)" v={formatMoney(t.duty)} />
                  <RowKV label="Fi Sabilillah" v={formatMoney(t.fs)} />
                  <RowKV label="Margin 1" v={formatMoney(t.m1)} />
                  <RowKV label="Margin 2" v={formatMoney(t.m2)} />
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-navy-900 dark:text-white">Selling value</span>
                    <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(t.sale)}</span>
                  </div>
                </div>
              </div>
              <Button variant="accent" className="w-full mt-6 gap-1.5" onClick={() => void submit()} disabled={saving || loading}>
                {saving ? <><Loader2 className="size-4 animate-spin" />Saving…</> : <><Save />Save purchase order</>}
              </Button>
              <p className="mt-2 text-2xs text-slate-500">
                Five vouchers are posted: goods to the supplier, duty to each logistics company, and Fi Sabilillah, Margin 1 and Margin 2 to their reserves.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <LogisticsDialog open={logisticsOpen} onOpenChange={setLogisticsOpen} onChanged={() => void load(true)} />
    </>
  );
}

function RowKV({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular font-medium text-navy-900 dark:text-white">{v}</span>
    </div>
  );
}
