"use client";

import * as React from "react";
import axios from "axios";
import { Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { ProductImage } from "@/components/products/product-image";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney, formatDate } from "@/lib/format";
import { round2, saleOf, weightedAverage, type PriceParts } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE PRICE POPUP — one per purchase-order line

   The owner (26 Sep): "average automatically kisi bhi product ki price ko
   update nahi karega". Instead the admin sees every earlier purchase of this
   item — the price it was bought to sell at and how many are still on the
   shelves — ticks the ones to average with this new purchase, and settles the
   final selling price, which then applies to every unit of the item.

   The average is weighted by what is LEFT of each purchase (claim locations
   not counted — damaged stock is not going to be sold at any price). This
   purchase is always in it. The admin may type his own final figure; the API
   puts the difference into Margin 1 so the five parts still add up.

   Nothing is saved here: the decision rides on the line and is applied, with
   the identical arithmetic, when the purchase order is saved.
   ─────────────────────────────────────────────────────────────────────────── */

export type PriceDecision = { keep: boolean; batchIds: number[]; finalSalePrice: number | null; preview: number };

type Lot = {
  id: number; batchNo: string; date: string; poId: number | null; supplier: string | null;
  qtyReceived: number; unitCost: number; unitDuty: number; unitFs: number; unitMargin1: number; unitMargin2: number;
  unitSalePrice: number; onHand: number; inClaim: number;
  places: { location: string; qty: number }[];
};
type LotsResponse = {
  product: { id: number; name: string; sku: string; imageUrl: string | null; salePrice: number };
  lots: Lot[];
  onHandTotal: number;
};

const partsOf = (l: Lot): PriceParts => ({ cost: l.unitCost, duty: l.unitDuty, fs: l.unitFs, margin1: l.unitMargin1, margin2: l.unitMargin2 });

export function PriceDecisionDialog({
  open, onOpenChange, productId, qty, parts, current, onDecide,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: number;
  /** This line's quantity and five parts — the new purchase. */
  qty: number;
  parts: PriceParts;
  /** The decision already on the line, if any, so reopening shows it. */
  current: PriceDecision | null;
  onDecide: (d: PriceDecision) => void;
}) {
  const [data, setData] = React.useState<LotsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ticked, setTicked] = React.useState<Set<number>>(new Set());
  const [keep, setKeep] = React.useState(false);
  const [final, setFinal] = React.useState<string>("");
  const [finalTouched, setFinalTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    /* eslint-disable react-hooks/set-state-in-effect --
       Load-on-open, axios in the component, as everywhere in this app. */
    setData(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    axios.get<LotsResponse>(`${API_BASE_URL}/purchases/products/${productId}/lots`, { headers: authHeader() })
      .then((r) => {
        if (!alive) return;
        setData(r.data);
        if (current) {
          setTicked(new Set(current.batchIds));
          setKeep(current.keep);
          setFinal(current.finalSalePrice !== null ? String(current.finalSalePrice) : "");
          setFinalTouched(current.finalSalePrice !== null);
        } else {
          /* Default: every earlier purchase that still has stock is ticked —
             the owner's example averages everything still in the godown. */
          setTicked(new Set(r.data.lots.filter((l) => l.onHand > 0).map((l) => l.id)));
          setKeep(false);
          setFinal("");
          setFinalTouched(false);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setError(axios.isAxiosError(e) && e.response ? (e.response.data as { message?: string })?.message ?? "Could not load." : "Cannot reach the server.");
      });
    return () => { alive = false; };
  }, [open, productId, current]);

  const newSale = saleOf(parts);
  const chosen = (data?.lots ?? []).filter((l) => ticked.has(l.id));
  const avg = weightedAverage([
    ...chosen.map((l) => ({ qty: l.onHand, parts: partsOf(l) })),
    { qty, parts },
  ]);
  const finalPrice = finalTouched && final.trim() !== "" ? round2(parseFloat(final) || 0) : avg.sale;
  const totalUnits = avg.units;

  function toggle(id: number) {
    setTicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function confirm() {
    onDecide(keep
      ? { keep: true, batchIds: [], finalSalePrice: null, preview: data?.product.salePrice ?? 0 }
      : {
          keep: false,
          batchIds: [...ticked],
          finalSalePrice: finalTouched && final.trim() !== "" ? finalPrice : null,
          preview: finalPrice,
        });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New selling price</DialogTitle>
          <DialogDescription>
            Tick the earlier purchases to average with this one. The result becomes the selling price of every unit of this item.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : !data ? (
            <div className="py-10 text-center"><Loader2 className="inline size-5 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <ProductImage url={data.product.imageUrl} name={data.product.name} size="md" zoom={false} />
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 dark:text-white">{data.product.name}</div>
                  <div className="text-xs text-slate-500">
                    {data.product.sku} · selling now at <span className="tabular font-semibold">{formatMoney(data.product.salePrice)}</span>
                    {" "}· {data.onHandTotal} on the shelves
                  </div>
                </div>
              </div>

              {/* This purchase: always part of the average. */}
              <div className="rounded-lg border-2 border-brand-yellow/60 bg-brand-yellow/5 p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-navy-900 dark:text-white">
                    <Check className="size-4 text-brand-yellow-700" /> This purchase
                  </span>
                  <span className="tabular ml-auto">{formatMoney(newSale)}</span>
                  <span className="tabular text-xs text-slate-500 w-32 text-right">{qty} new {qty === 1 ? "unit" : "units"}</span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Earlier purchases</div>
                {data.lots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-navy-700">
                    This is the first purchase of this item.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-navy-700 dark:border-navy-700">
                    {data.lots.map((l) => {
                      const empty = l.onHand <= 0;
                      return (
                        <label key={l.id}
                          className={cn("flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm",
                            empty && "opacity-60", keep && "pointer-events-none opacity-50")}>
                          <Checkbox className="mt-0.5" checked={ticked.has(l.id)} disabled={keep}
                            onCheckedChange={() => toggle(l.id)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3">
                              <span className="font-medium text-navy-900 dark:text-white">
                                {l.poId ? l.batchNo : "Opening stock"}
                              </span>
                              <span className="text-xs text-slate-500">{formatDate(l.date)}{l.supplier ? ` · ${l.supplier}` : ""}</span>
                            </div>
                            <div className="text-2xs text-slate-500 tabular">
                              {formatMoney(l.unitCost)} + {formatMoney(l.unitDuty)} + {formatMoney(l.unitFs)} + {formatMoney(l.unitMargin1)} + {formatMoney(l.unitMargin2)}
                              {l.places.length > 0 && <> · {l.places.map((p) => `${p.location} ${p.qty}`).join(", ")}</>}
                              {l.inClaim > 0 && <> · {l.inClaim} in claim (not counted)</>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="tabular font-semibold">{formatMoney(l.unitSalePrice)}</div>
                            <div className="tabular text-2xs text-slate-500">{l.onHand} of {l.qtyReceived} left</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* The result. */}
              <div className={cn("rounded-lg bg-slate-50 p-3 dark:bg-navy-900", keep && "opacity-50")}>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-48">
                    <div className="text-xs text-slate-500">
                      Average over {totalUnits} units ({chosen.length} earlier + this one)
                    </div>
                    <div className="tabular text-sm text-slate-600 dark:text-slate-300">
                      {chosen.map((l) => `${l.onHand} × ${formatMoney(l.unitSalePrice)}`).concat(`${qty} × ${formatMoney(newSale)}`).join(" + ")}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 tabular text-lg font-bold text-navy-900 dark:text-white">
                      <Sparkles className="size-4 text-brand-yellow" /> {formatMoney(avg.sale)}
                    </div>
                  </div>
                  <div className="w-44">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Final selling price</label>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} disabled={keep}
                      className="text-right tabular font-semibold"
                      placeholder={String(avg.sale)} value={finalTouched ? final : String(avg.sale)}
                      onChange={(e) => { setFinal(e.target.value); setFinalTouched(true); }} />
                  </div>
                </div>
                {!keep && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    All <span className="font-semibold">{(data.onHandTotal + qty).toLocaleString()}</span> units of this item will sell at{" "}
                    <span className="tabular font-semibold">{formatMoney(finalPrice)}</span>
                    {finalPrice !== avg.sale && <> — {formatMoney(round2(finalPrice - avg.sale))} goes into Margin 1</>}.
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={keep} onCheckedChange={(v) => setKeep(v === true)} />
                Keep the current selling price ({formatMoney(data.product.salePrice)}) — do not change it
              </label>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" onClick={confirm} disabled={!data || (!keep && finalPrice < 0)}>
            <Check /> {keep ? "Keep price" : `Set ${formatMoney(finalPrice)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
