"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewPartyPage() {
  const [partyType, setPartyType] = React.useState<"CUSTOMER" | "SUPPLIER" | "BOTH">("CUSTOMER");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "New Party" }]}
        title="New Party"
        subtitle="Create a new customer, supplier, or both"
        actions={
          <>
            <Button variant="ghost" size="md" asChild>
              <Link href="/parties">
                <X />
                Cancel
              </Link>
            </Button>
            <Button variant="secondary" size="md">
              Save as Draft
            </Button>
            <Button variant="accent" size="md" className="gap-1.5">
              <Save />
              Save & Continue
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type selector */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Party Type</h3>
              <div className="grid grid-cols-3 gap-3">
                {(["CUSTOMER", "SUPPLIER", "BOTH"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPartyType(t)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      partyType === t
                        ? "border-brand-yellow bg-brand-yellow/5"
                        : "border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600"
                    }`}
                  >
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">
                      {t === "BOTH" ? "Customer & Supplier" : t.charAt(0) + t.slice(1).toLowerCase()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t === "CUSTOMER" && "We sell to them"}
                      {t === "SUPPLIER" && "We buy from them"}
                      {t === "BOTH" && "Bidirectional relationship"}
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Basic info */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Legal Name" required>
                  <Input placeholder="e.g. Hafeez Center Shop #28" />
                </FormField>
                <FormField label="Display Name">
                  <Input placeholder="Same as legal name if blank" />
                </FormField>
                <FormField label="Category" required>
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Retailer</option>
                    <option>Wholesaler</option>
                    <option>Distributor</option>
                    <option>Manufacturer</option>
                    <option>Agent</option>
                  </select>
                </FormField>
                <FormField label="Industry">
                  <Input placeholder="e.g. Mobile accessories" />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* Contact */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Phone" required>
                  <Input placeholder="0300 1234567" />
                </FormField>
                <FormField label="Alternate Phone">
                  <Input placeholder="Optional" />
                </FormField>
                <FormField label="Email" className="sm:col-span-2">
                  <Input type="email" placeholder="contact@example.pk" />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* Address */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Address Line 1" className="sm:col-span-2">
                  <Input placeholder="Shop #28, Hafeez Center, Liberty" />
                </FormField>
                <FormField label="City" required>
                  <Input placeholder="Lahore" />
                </FormField>
                <FormField label="Province">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Punjab</option>
                    <option>Sindh</option>
                    <option>KPK</option>
                    <option>Balochistan</option>
                    <option>Islamabad Capital</option>
                    <option>AJK</option>
                    <option>Gilgit-Baltistan</option>
                  </select>
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* Tax */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Tax & Compliance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="NTN" hint="National Tax Number">
                  <Input placeholder="1234567-8" />
                </FormField>
                <FormField label="STRN" hint="Sales Tax Registration">
                  <Input placeholder="Optional" />
                </FormField>
                <FormField label="CNIC" hint="For sole proprietors">
                  <Input placeholder="00000-0000000-0" />
                </FormField>
              </div>
            </CardBody>
          </Card>

          {/* Credit (only for customer/both) */}
          {(partyType === "CUSTOMER" || partyType === "BOTH") && (
            <Card>
              <CardBody>
                <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Credit Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Credit Limit (PKR)">
                    <Input type="number" placeholder="0" defaultValue="0" />
                  </FormField>
                  <FormField label="Credit Days">
                    <Input type="number" placeholder="0" defaultValue="0" />
                  </FormField>
                  <FormField label="Hold Policy">
                    <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                      <option>WARN — show warning, allow order</option>
                      <option>BLOCK — prevent order, require override</option>
                      <option>NONE — no checks</option>
                    </select>
                  </FormField>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-4">Assignment</h3>
              <div className="space-y-4">
                <FormField label="Default Branch">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Karachi Head Office</option>
                    <option>Lahore Branch</option>
                    <option>Islamabad Branch</option>
                  </select>
                </FormField>
                {(partyType === "CUSTOMER" || partyType === "BOTH") && (
                  <FormField label="Sales Rep">
                    <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                      <option>— None —</option>
                      <option>Sara Khan</option>
                      <option>Hassan Raza</option>
                      <option>Bilal Ahmed</option>
                    </select>
                  </FormField>
                )}
                {(partyType === "CUSTOMER" || partyType === "BOTH") && (
                  <FormField label="Price List">
                    <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                      <option>Default Retail</option>
                      <option>Wholesale</option>
                      <option>Distributor</option>
                    </select>
                  </FormField>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-navy-900 dark:text-white mb-3">Notes</h3>
              <textarea
                rows={4}
                className="input resize-none"
                placeholder="Internal notes about this party (not visible on invoices)"
              />
            </CardBody>
          </Card>

          <Card className="bg-info/5 border-info/20">
            <CardBody>
              <h3 className="text-sm font-semibold text-info-dark dark:text-info-light mb-2">
                ℹ️ Auto-generated party code
              </h3>
              <p className="text-xs text-info-dark/80 dark:text-info-light/80">
                A unique party code (e.g. <code className="bg-white dark:bg-navy-900 px-1.5 py-0.5 rounded font-mono text-2xs">VZ-C-0024</code>) will be assigned automatically based on the type and current sequence.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function FormField({
  label,
  children,
  required,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
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
