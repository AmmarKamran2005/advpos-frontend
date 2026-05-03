"use client";

import * as React from "react";
import Link from "next/link";
import { Save, X, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, brands, units } from "@/data/products";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inventory" },
          { label: "Products", href: "/inventory/products" },
          { label: "New Product" },
        ]}
        title="New Product"
        subtitle="Add a new SKU to the VIZO catalog"
        actions={
          <>
            <Button variant="ghost" size="md" asChild>
              <Link href="/inventory/products"><X /> Cancel</Link>
            </Button>
            <Button variant="secondary" size="md">Save as Draft</Button>
            <Button variant="accent" size="md" className="gap-1.5">
              <Save /> Save Product
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="SKU" required>
                  <Input placeholder="e.g. VZ-TIT-T9-BLK" />
                </Field>
                <Field label="Product Name" required className="sm:col-span-2">
                  <Input placeholder="e.g. VIZO Titan T9 Wireless Earbuds — Black" />
                </Field>
                <Field label="Category" required>
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    {categories.map((c) => (
                      <option key={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand" required>
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    {brands.map((b) => (
                      <option key={b.id}>{b.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit of Measure" required>
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    {units.map((u) => (
                      <option key={u.id}>{u.code} — {u.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tax Rate (%)">
                  <Input type="number" defaultValue="18" />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <textarea rows={3} className="input resize-none" placeholder="Brief product description (visible on invoices)" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Pricing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cost Price (PKR)" required hint="Used for margin calculation">
                  <Input type="number" placeholder="0" />
                </Field>
                <Field label="Sale Price (PKR)" required>
                  <Input type="number" placeholder="0" />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Barcodes</h3>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Plus className="size-3" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="EAN-13 / Code-128 / UPC" className="flex-1" />
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white w-32">
                    <option>EAN-13</option>
                    <option>UPC-A</option>
                    <option>Code-128</option>
                  </select>
                  <Input type="number" placeholder="Pack qty" className="w-24" defaultValue="1" />
                  <Button variant="ghost" size="icon" className="text-danger">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Stock Settings</h3>
              <div className="space-y-4">
                <Field label="Reorder Level" hint="Alert when stock falls below this">
                  <Input type="number" placeholder="0" />
                </Field>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded border-slate-300 dark:border-navy-600 text-brand-yellow focus:ring-brand-yellow" />
                  <div>
                    <div className="text-sm font-medium text-navy-900 dark:text-white">Hide stock from sales reps</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reps see only "available" but no exact qty</div>
                  </div>
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Product Images</h3>
              <div className="aspect-square border-2 border-dashed border-slate-200 dark:border-navy-700 rounded-lg flex flex-col items-center justify-center text-center p-4 hover:border-brand-yellow/50 cursor-pointer transition-colors">
                <ImageIcon className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
                <div className="text-sm font-medium text-navy-900 dark:text-white">Drop images here</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse</div>
                <div className="text-2xs text-slate-400 mt-2">PNG, JPG up to 5MB · max 10 images</div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Status</h3>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-navy-900 dark:text-white">Active</span>
                <input type="checkbox" defaultChecked className="rounded border-slate-300 dark:border-navy-600 text-brand-yellow focus:ring-brand-yellow" />
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Inactive products won't appear in order screens</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, children, required, hint, className }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
