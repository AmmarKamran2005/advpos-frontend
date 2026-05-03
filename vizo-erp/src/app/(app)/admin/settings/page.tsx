"use client";

import { Save, Building, Hash, Receipt, Mail, Wifi, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "System Settings" }]}
        title="System Settings"
        subtitle="Configure VIZO ERP organisation-wide"
        actions={
          <Button variant="accent" size="md" className="gap-1.5">
            <Save />
            <span>Save Changes</span>
          </Button>
        }
      />

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="overflow-x-auto scrollbar-thin flex-nowrap">
          <TabsTrigger value="company"><Building className="size-3.5 mr-1.5" /> Company</TabsTrigger>
          <TabsTrigger value="numbering"><Hash className="size-3.5 mr-1.5" /> Numbering</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="size-3.5 mr-1.5" /> Tax</TabsTrigger>
          <TabsTrigger value="email"><Mail className="size-3.5 mr-1.5" /> Email</TabsTrigger>
          <TabsTrigger value="integrations"><Wifi className="size-3.5 mr-1.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="locale"><Globe className="size-3.5 mr-1.5" /> Locale</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Company Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company Name"><Input defaultValue="VIZO Pakistan" /></Field>
                <Field label="Legal Name"><Input defaultValue="VIZO Trading Company (Pvt.) Ltd." /></Field>
                <Field label="NTN"><Input defaultValue="0123456-7" /></Field>
                <Field label="STRN"><Input defaultValue="32-77-8901-234-56" /></Field>
                <Field label="Email"><Input type="email" defaultValue="info@vizo.com.pk" /></Field>
                <Field label="Phone"><Input defaultValue="0300 7287607" /></Field>
                <Field label="Website"><Input defaultValue="https://www.vizo.com.pk" /></Field>
                <Field label="Industry"><Input defaultValue="Mobile Accessories Distribution" /></Field>
                <Field label="Head Office Address" className="sm:col-span-2">
                  <textarea rows={3} className="input resize-none" defaultValue="Kohinoor Market, Saddar, Karachi, Sindh, Pakistan" />
                </Field>
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="numbering">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Document Numbering</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Format: <code className="bg-slate-100 dark:bg-navy-700 px-2 py-0.5 rounded font-mono text-xs">{`{branch}-{prefix}-{YY}-{seq}`}</code>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Sales Order"><Input defaultValue="ORD" /></Field>
                <Field label="Sales Invoice"><Input defaultValue="INV" /></Field>
                <Field label="Sales Return"><Input defaultValue="RET" /></Field>
                <Field label="Purchase Order"><Input defaultValue="PO" /></Field>
                <Field label="Goods Receipt"><Input defaultValue="GRN" /></Field>
                <Field label="Purchase Invoice"><Input defaultValue="PI" /></Field>
                <Field label="Voucher"><Input defaultValue="VCH" /></Field>
                <Field label="Journal Entry"><Input defaultValue="JE" /></Field>
                <Field label="Stock Transfer"><Input defaultValue="TRF" /></Field>
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Tax Settings (Pakistan)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Default Sales Tax (%)"><Input type="number" defaultValue="18" /></Field>
                <Field label="Default Withholding Tax (%)"><Input type="number" defaultValue="4.5" /></Field>
                <Field label="Tax Inclusive Pricing">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Exclusive (price + tax)</option>
                    <option>Inclusive (price includes tax)</option>
                  </select>
                </Field>
                <Field label="Rounding Method">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Banker&apos;s rounding</option>
                    <option>Round half up</option>
                  </select>
                </Field>
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Email (SMTP)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="From Name"><Input defaultValue="VIZO ERP" /></Field>
                <Field label="From Address"><Input type="email" defaultValue="noreply@vizo.com.pk" /></Field>
                <Field label="SMTP Host"><Input defaultValue="smtp.sendgrid.net" /></Field>
                <Field label="SMTP Port"><Input type="number" defaultValue="587" /></Field>
                <Field label="Username"><Input defaultValue="apikey" /></Field>
                <Field label="Password"><Input type="password" placeholder="••••••••" /></Field>
              </div>
              <Button variant="secondary" size="md" className="mt-4">Send Test Email</Button>
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Easypaisa Business",  status: "Connected",    desc: "Mobile wallet receipts", color: "success" as const },
              { name: "JazzCash Business",    status: "Connected",    desc: "Mobile wallet receipts", color: "success" as const },
              { name: "Jazz BizSMS",          status: "Connected",    desc: "Primary SMS gateway",    color: "success" as const },
              { name: "Telenor Tameer SMS",   status: "Connected",    desc: "Failover SMS gateway",   color: "success" as const },
              { name: "Twilio (PK route)",    status: "Disconnected", desc: "International fallback", color: "muted"   as const },
              { name: "Google Gemini",        status: "Connected",    desc: "LLM AI assistant",       color: "success" as const },
              { name: "OpenAI",               status: "Disconnected", desc: "LLM fallback",           color: "muted"   as const },
              { name: "FBR e-Invoice",        status: "Not configured", desc: "Tax authority integration", color: "muted" as const },
            ].map((i) => (
              <Card key={i.name}>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-navy-900 dark:text-white">{i.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{i.desc}</p>
                    </div>
                    <Button variant={i.color === "success" ? "secondary" : "accent"} size="sm">
                      {i.color === "success" ? "Configure" : "Connect"}
                    </Button>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs">
                    <span className={`size-2 rounded-full ${i.color === "success" ? "bg-success" : "bg-slate-300"}`} />
                    <span className={i.color === "success" ? "text-success" : "text-slate-500"}>{i.status}</span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locale">
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Locale & Format</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Time Zone">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Asia/Karachi (PKT, UTC+5)</option>
                  </select>
                </Field>
                <Field label="Currency">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>PKR — Pakistani Rupee</option>
                  </select>
                </Field>
                <Field label="Date Format">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>DD-MMM-YYYY (01-May-2026)</option>
                    <option>YYYY-MM-DD (2026-05-01)</option>
                    <option>DD/MM/YYYY (01/05/2026)</option>
                  </select>
                </Field>
                <Field label="Number Format">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>International (1,000,000)</option>
                    <option>Pakistani lakhs/crores (10,00,000)</option>
                  </select>
                </Field>
                <Field label="Week Start">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>Monday</option>
                    <option>Sunday</option>
                  </select>
                </Field>
                <Field label="Fiscal Year Starts">
                  <select className="input bg-white dark:bg-navy-800 dark:border-navy-700 dark:text-white">
                    <option>July (Pakistan standard)</option>
                    <option>January</option>
                  </select>
                </Field>
              </div>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-navy-900 dark:text-white mb-1.5">{label}</label>
      {children}
    </div>
  );
}
