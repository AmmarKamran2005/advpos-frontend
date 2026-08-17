"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShoppingBag, Plus, Trash2, Search, Banknote, CreditCard, Printer,
  MessageCircle, Check, User,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { toast } from "@/components/ui/toaster";
import { parties } from "@/data/parties";
import { products } from "@/data/products";
import { sellableLocations, defaultLocation, paymentMethods } from "@/data/settings";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = {
  key: number;
  productId: number;
  name: string;
  sku: string;
  qty: number;
  rate: number;
  discount: number;
};

/**
 * A shop walks up to the counter, or rings the office direct. No sales rep in
 * the middle, so the order department raises and settles it in one screen —
 * cash in the drawer, or on the customer's account.
 */
export default function CounterSalePage() {
  const [lines, setLines] = React.useState<Line[]>([]);
  const [nextKey, setNextKey] = React.useState(1);
  const [customerId, setCustomerId] = React.useState<number | "walkin">("walkin");
  const [walkInName, setWalkInName] = React.useState("");
  const [locationId, setLocationId] = React.useState(defaultLocation().id);
  const [method, setMethod] = React.useState("Cash");
  const [received, setReceived] = React.useState(0);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const customers = parties.filter((p) => p.type !== "SUPPLIER");
  const customer = customerId === "walkin" ? null : customers.find((c) => c.id === customerId);
  const onCredit = method === "Credit";

  const subtotal = lines.reduce((s, l) => s + l.rate * l.qty * (1 - l.discount / 100), 0);
  const tax = Math.round(subtotal * 0.18);
  const total = Math.round(subtotal + tax);
  const change = Math.max(0, received - total);

  function addProduct(id: number) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === id);
      if (existing) {
        return prev.map((l) => (l.productId === id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        { key: nextKey, productId: id, name: p.name, sku: p.sku, qty: 1, rate: p.salePrice, discount: 0 },
      ];
    });
    setNextKey((k) => k + 1);
    setPickerOpen(false);
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function remove(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function complete() {
    if (lines.length === 0) {
      toast.error("Nothing to sell", { description: "Add at least one item." });
      return;
    }
    if (onCredit && !customer) {
      toast.error("Credit needs a customer", {
        description: "A walk-in sale has to be paid now. Pick the shop's account for credit.",
      });
      return;
    }
    if (!onCredit && received < total) {
      toast.error("Not enough received", {
        description: `Short by ${formatMoney(total - received)}.`,
      });
      return;
    }

    toast.success("Sale complete", {
      description: onCredit
        ? `INV-26-8869 on ${customer?.displayName}'s account — ${formatMoney(total)}.`
        : `INV-26-8869 paid ${method} — ${formatMoney(total)}${change > 0 ? `, change ${formatMoney(change)}` : ""}.`,
    });
    setLines([]);
    setReceived(0);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Counter Sale" }]}
        title="Counter Sale"
        subtitle="Sell straight from the desk — cash now, or on the shop's account."
        actions={
          <>
            <Button variant="ghost" size="md" className="gap-1.5" asChild>
              <Link href="/sales/orders">Orders</Link>
            </Button>
            <Button variant="accent" size="md" className="gap-1.5" onClick={complete}>
              <Check /> Complete Sale
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                  Items ({lines.length})
                </h3>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="accent" size="sm" className="gap-1">
                      <Plus /> Add Item
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[460px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Scan a barcode, or search by code or name…" />
                      <CommandList>
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                          {products.slice(0, 30).map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.sku} ${p.name}`}
                              onSelect={() => addProduct(p.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-navy-900 dark:text-white truncate">
                                  {p.name}
                                </div>
                                <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                                  {p.sku} · stock {p.totalStock}
                                </div>
                              </div>
                              <span className="tabular text-sm font-bold text-navy-900 dark:text-white">
                                {formatMoney(p.salePrice)}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {lines.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                  <ShoppingBag className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    Nothing added yet. Hit <span className="font-semibold">Add Item</span> or scan a barcode.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-2 pb-1">
                    <div className="col-span-5 text-2xs font-semibold uppercase tracking-wider text-slate-400">Item</div>
                    <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Qty</div>
                    <div className="col-span-2 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Rate</div>
                    <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Disc %</div>
                    <div className="col-span-1 text-2xs font-semibold uppercase tracking-wider text-slate-400 text-right">Amount</div>
                    <div className="col-span-1" />
                  </div>

                  {lines.map((l) => {
                    const amount = l.rate * l.qty * (1 - l.discount / 100);
                    return (
                      <div key={l.key} className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
                        <div className="col-span-12 sm:col-span-5 min-w-0">
                          <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{l.name}</div>
                          <div className="tabular text-2xs text-slate-500 dark:text-slate-400">{l.sku}</div>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input type="number" min={1} value={l.qty} className="text-right tabular h-9"
                            aria-label="Quantity"
                            onChange={(e) => update(l.key, { qty: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Input type="number" min={0} value={l.rate} className="text-right tabular h-9"
                            aria-label="Rate"
                            onChange={(e) => update(l.key, { rate: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Input type="number" min={0} max={100} value={l.discount} className="text-right tabular h-9"
                            aria-label="Discount percent"
                            onChange={(e) => update(l.key, { discount: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3 sm:col-span-1 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">
                          {Math.round(amount).toLocaleString("en-PK")}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button variant="ghost" size="icon-sm" className="text-danger"
                            aria-label={`Remove ${l.name}`} onClick={() => remove(l.key)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Who and how */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer</h3>

              <div className="flex gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => setCustomerId("walkin")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors",
                    customerId === "walkin"
                      ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                      : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerId(customers[0]?.id ?? "walkin")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors",
                    customerId !== "walkin"
                      ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                      : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400"
                  )}
                >
                  Existing shop
                </button>
              </div>

              {customerId === "walkin" ? (
                <div>
                  <Label htmlFor="walkin-name">Name (optional)</Label>
                  <Input
                    id="walkin-name"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Cash customer"
                    className="mt-1.5"
                  />
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                    A walk-in has to pay now — no account to put it on.
                  </p>
                </div>
              ) : (
                <>
                  <SelectNative
                    value={String(customerId)}
                    onChange={(e) => setCustomerId(Number(e.target.value))}
                    aria-label="Pick a customer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} · {c.partyCode}
                      </option>
                    ))}
                  </SelectNative>
                  {customer && (
                    <div className="flex items-center gap-2.5 mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-900">
                      <Avatar initials={customer.initials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-navy-900 dark:text-white truncate">
                          {customer.displayName}
                        </div>
                        <div className="tabular text-2xs text-slate-500 dark:text-slate-400">
                          owes {formatMoney(customer.currentBalance)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Payment</h3>

              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {paymentMethods.filter((m) => m.isActive).map((m) => {
                  const active = method === m.name;
                  const disabled = m.name === "Credit" && customerId === "walkin";
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setMethod(m.name)}
                      className={cn(
                        "px-2 py-2 rounded-lg border-2 text-2xs font-medium transition-colors",
                        active
                          ? "border-brand-yellow bg-brand-yellow/5 text-navy-900 dark:text-white"
                          : "border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-400",
                        disabled && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>

              {!onCredit && (
                <div className="mb-3">
                  <Label htmlFor="received">Received</Label>
                  <Input
                    id="received"
                    type="number"
                    value={received}
                    onChange={(e) => setReceived(Number(e.target.value))}
                    className="mt-1.5 tabular text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setReceived(total)}
                    className="text-2xs text-brand-yellow hover:underline font-medium mt-1.5"
                  >
                    Exact amount
                  </button>
                </div>
              )}

              <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-navy-800">
                <Row label="Subtotal" value={formatMoney(Math.round(subtotal))} />
                <Row label="Sales tax (18%)" value={formatMoney(tax)} />
                <Row label="Total" value={formatMoney(total)} bold />
                {!onCredit && received > 0 && (
                  <Row label="Change" value={formatMoney(change)} tone="success" />
                )}
                {onCredit && (
                  <p className="text-2xs text-warning pt-1">
                    Goes on the shop&rsquo;s account. Accounts will chase it.
                  </p>
                )}
              </div>

              <Button variant="accent" size="lg" className="w-full justify-center gap-1.5 mt-4" onClick={complete}>
                {onCredit ? <CreditCard /> : <Banknote />}
                {onCredit ? "Put on account" : "Take payment"}
              </Button>

              <div className="flex gap-1.5 mt-2">
                <Button variant="secondary" size="sm" className="flex-1 gap-1"
                  onClick={() => toast.info("Printing receipt…")}>
                  <Printer /> Print
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 gap-1"
                  onClick={() => toast.success("Ready to send on WhatsApp")}>
                  <MessageCircle /> Send
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-2">
                Selling from
              </h3>
              <SelectNative
                value={locationId}
                onChange={(e) => setLocationId(Number(e.target.value))}
                aria-label="Stock location"
              >
                {sellableLocations().map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </SelectNative>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5">
                Stock comes out of this location.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label, value, bold, tone,
}: {
  label: string; value: string; bold?: boolean; tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-sm text-slate-500 dark:text-slate-400", bold && "font-bold text-navy-900 dark:text-white")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular text-sm font-semibold text-navy-900 dark:text-white",
          bold && "text-base font-bold",
          tone === "success" && "text-success"
        )}
      >
        {value}
      </span>
    </div>
  );
}
