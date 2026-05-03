"use client";

import * as React from "react";
import Link from "next/link";
import { Save, X, Plus, Trash2, Search, Check, ArrowRight, ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { parties } from "@/data/parties";
import { products } from "@/data/products";
import { formatMoney, formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = ["Customer & Items", "Pricing & Tax", "Review & Submit"];

type LineItem = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  total: number;
};

export default function NewOrderPage() {
  const [step, setStep] = React.useState(0);
  const [selectedCustomer, setSelectedCustomer] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<LineItem[]>([]);

  const customer = parties.find((p) => p.id === selectedCustomer);
  const customers = parties.filter((p) => p.type === "CUSTOMER" || p.type === "BOTH");

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty * (1 - i.discount / 100), 0);
  const tax = items.reduce((s, i) => s + (i.unitPrice * i.qty * (1 - i.discount / 100) * i.taxPercent) / 100, 0);
  const total = subtotal + tax;

  const overLimit = customer && customer.creditLimit > 0 && (customer.currentBalance + total) > customer.creditLimit;

  function addProduct(productId: number) {
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    setItems((cur) => [
      ...cur,
      { id: Date.now(), productId, name: p.name, sku: p.sku, qty: 1, unitPrice: p.salePrice, discount: 0, taxPercent: p.taxRatePercent, total: p.salePrice },
    ]);
  }

  function updateItem(id: number, patch: Partial<LineItem>) {
    setItems((cur) =>
      cur.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, ...patch };
        updated.total = updated.unitPrice * updated.qty * (1 - updated.discount / 100) * (1 + updated.taxPercent / 100);
        return updated;
      })
    );
  }

  function removeItem(id: number) {
    setItems((cur) => cur.filter((i) => i.id !== id));
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Sales" }, { label: "Orders", href: "/sales/orders" }, { label: "New Order" }]}
        title="New Sales Order"
        actions={
          <>
            <Button variant="ghost" size="md" asChild><Link href="/sales/orders"><X />Cancel</Link></Button>
            <Button variant="secondary" size="md">Save as Draft</Button>
          </>
        }
      />

      {/* Step indicator */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(i)}
                  className="flex items-center gap-2.5 group flex-shrink-0"
                >
                  <div className={cn(
                    "size-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                    i < step
                      ? "bg-success text-white"
                      : i === step
                      ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                      : "bg-slate-100 dark:bg-navy-700 text-slate-400"
                  )}>
                    {i < step ? <Check className="size-4" /> : i + 1}
                  </div>
                  <div className="text-left">
                    <div className={cn("text-2xs uppercase tracking-wider font-semibold",
                      i <= step ? "text-navy-900 dark:text-white" : "text-slate-400"
                    )}>
                      Step {i + 1}
                    </div>
                    <div className={cn("text-sm font-medium",
                      i <= step ? "text-navy-900 dark:text-white" : "text-slate-400"
                    )}>
                      {s}
                    </div>
                  </div>
                </button>
                {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5", i < step ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />}
              </React.Fragment>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Customer & Items */}
          {step === 0 && (
            <>
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer</h3>
                  {customer ? (
                    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-navy-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar initials={customer.initials} size="md" />
                        <div>
                          <div className="font-semibold text-navy-900 dark:text-white">{customer.legalName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{customer.partyCode} · {customer.category} · {customer.city}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Change</Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input placeholder="Search customer by name or code…" className="pl-9" />
                      </div>
                      <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-1">
                        {customers.slice(0, 8).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedCustomer(p.id)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-left transition-colors"
                          >
                            <Avatar initials={p.initials} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{p.legalName}</div>
                              <div className="text-2xs text-slate-500 dark:text-slate-400">{p.partyCode} · {p.city}</div>
                            </div>
                            {p.creditLimit > 0 && (
                              <Badge variant="muted" className="tabular text-2xs">
                                Limit {formatCompact(p.creditLimit, false)}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Items ({items.length})</h3>
                    <Button variant="accent" size="sm" className="gap-1" onClick={() => addProduct(1)}>
                      <Plus />Add Product
                    </Button>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg">
                      <p className="text-sm">No items added yet. Click &ldquo;Add Product&rdquo; to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 dark:border-navy-700 rounded-lg">
                          <div className="col-span-4">
                            <div className="text-sm font-medium text-navy-900 dark:text-white truncate">{item.name}</div>
                            <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{item.sku}</div>
                          </div>
                          <Input type="number" value={item.qty} onChange={(e) => updateItem(item.id, { qty: +e.target.value })} className="col-span-2 text-right tabular" />
                          <Input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: +e.target.value })} className="col-span-2 text-right tabular" />
                          <Input type="number" value={item.discount} onChange={(e) => updateItem(item.id, { discount: +e.target.value })} className="col-span-1 text-right tabular" />
                          <div className="col-span-2 text-right tabular text-sm font-semibold text-navy-900 dark:text-white">{formatMoney(item.total)}</div>
                          <Button variant="ghost" size="icon-sm" className="col-span-1 text-danger" onClick={() => removeItem(item.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          )}

          {/* STEP 2: Pricing & Tax */}
          {step === 1 && (
            <Card>
              <CardBody>
                <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Pricing & Tax</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">Discount (overall %)</label>
                    <Input type="number" defaultValue="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">Payment Method</label>
                    <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                      <option>Credit (NET 30)</option>
                      <option>Cash</option>
                      <option>Bank Transfer</option>
                      <option>Easypaisa</option>
                      <option>JazzCash</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">Notes</label>
                    <textarea rows={3} className="input resize-none" placeholder="Internal notes for this order" />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* STEP 3: Review */}
          {step === 2 && (
            <>
              {overLimit && (
                <Card className="bg-warning/5 border-warning/30">
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-warning-dark dark:text-warning-light">Credit limit warning</h4>
                        <p className="text-sm text-warning-dark/80 dark:text-warning-light/80 mt-1">
                          This order will push the customer over their credit limit ({formatMoney(customer!.creditLimit)}). The order may go on credit hold and require override.
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
              <Card>
                <CardBody>
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Review Order</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Please review all details before submitting. After submission, the order goes to the Order Department for confirmation.
                  </p>
                </CardBody>
              </Card>
            </>
          )}
        </div>

        {/* Sidebar — Summary */}
        <div className="space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Items</span>
                  <span className="tabular font-medium text-navy-900 dark:text-white">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="tabular font-medium text-navy-900 dark:text-white">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Tax</span>
                  <span className="tabular font-medium text-navy-900 dark:text-white">{formatMoney(tax)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-navy-700 pt-2 mt-2 flex items-center justify-between">
                  <span className="font-bold text-navy-900 dark:text-white">Total</span>
                  <span className="tabular text-lg font-bold text-navy-900 dark:text-white">{formatMoney(total)}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                {step < STEPS.length - 1 ? (
                  <Button
                    variant="accent"
                    size="md"
                    className="w-full gap-1.5"
                    disabled={step === 0 && (!selectedCustomer || items.length === 0)}
                    onClick={() => setStep(step + 1)}
                  >
                    Next: {STEPS[step + 1]}
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button variant="accent" size="md" className="w-full gap-1.5" asChild>
                    <Link href="/sales/orders">
                      <Save />
                      Submit Order
                    </Link>
                  </Button>
                )}
                {step > 0 && (
                  <Button variant="ghost" size="md" className="w-full gap-1.5" onClick={() => setStep(step - 1)}>
                    <ArrowLeft />
                    Back
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {customer && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Customer Status</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Credit Limit</span>
                    <span className="tabular font-semibold text-navy-900 dark:text-white">{formatMoney(customer.creditLimit)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Outstanding</span>
                    <span className="tabular font-semibold text-warning">{formatMoney(customer.currentBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">After this order</span>
                    <span className={cn("tabular font-semibold", overLimit ? "text-danger" : "text-navy-900 dark:text-white")}>
                      {formatMoney(customer.currentBalance + total)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
