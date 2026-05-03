"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, MapPin, Calendar, Clock, Camera, Filter, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusPill } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { initials, formatDate } from "@/lib/format";

const VISITS = [
  { id: 1, partyId: 1,  partyName: "Hafeez Center Shop #28",   salesPerson: "Sara Khan",  date: "2026-04-30", time: "11:30 AM", outcome: "Order Placed",      variant: "success" as const, notes: "Discussed bulk discount on PowerX line", lat: "31.5204° N", lng: "74.3587° E" },
  { id: 2, partyId: 2,  partyName: "Mobile Zone Lahore",       salesPerson: "Sara Khan",  date: "2026-04-30", time: "10:00 AM", outcome: "No Order",          variant: "muted" as const,   notes: "Customer wants to wait for new pricing", lat: "31.5497° N", lng: "74.3436° E" },
  { id: 3, partyId: 5,  partyName: "Cellular World KHI",       salesPerson: "Hassan Raza",date: "2026-04-29", time: "03:45 PM", outcome: "Followup",          variant: "info" as const,    notes: "Need to send updated catalog by Mon",    lat: "24.8607° N", lng: "67.0011° E" },
  { id: 4, partyId: 3,  partyName: "Saddar Mobile Plaza",      salesPerson: "Hassan Raza",date: "2026-04-29", time: "12:15 PM", outcome: "Payment Collected", variant: "success" as const, notes: "Collected PKR 32,750 against INV-141",    lat: "24.8567° N", lng: "67.0152° E" },
  { id: 5, partyId: 6,  partyName: "Faisal Mobile Mart",       salesPerson: "Sara Khan",  date: "2026-04-29", time: "10:30 AM", outcome: "Order Placed",      variant: "success" as const, notes: "Reorder of Titan T9, 50 units",          lat: "31.5497° N", lng: "74.3436° E" },
  { id: 6, partyId: 12, partyName: "Margalla Distributors",    salesPerson: "Bilal Ahmed",date: "2026-04-28", time: "02:00 PM", outcome: "Order Placed",      variant: "success" as const, notes: "Big order for VOLT chargers + Speakers",  lat: "33.7294° N", lng: "73.0931° E" },
  { id: 7, partyId: 11, partyName: "Pak Mobile Centre",        salesPerson: "Bilal Ahmed",date: "2026-04-28", time: "11:00 AM", outcome: "Followup",          variant: "info" as const,    notes: "Will decide after Eid",                    lat: "34.0151° N", lng: "71.5249° E" },
];

export default function VisitsPage() {
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"list" | "map">("list");

  const filtered = VISITS.filter(
    (v) =>
      !search ||
      v.partyName.toLowerCase().includes(search.toLowerCase()) ||
      v.salesPerson.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Parties", href: "/parties" }, { label: "Customer Visits" }]}
        title="Customer Visits"
        subtitle="Sales rep field activity across all branches"
        actions={
          <>
            <div className="flex items-center bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg p-0.5">
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "list"
                    ? "bg-navy-900 text-brand-yellow dark:bg-navy-700 dark:text-brand-yellow"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView("map")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "map"
                    ? "bg-navy-900 text-brand-yellow dark:bg-navy-700 dark:text-brand-yellow"
                    : "text-slate-500 hover:text-navy-900 dark:hover:text-white"
                }`}
              >
                Map
              </button>
            </div>
            <Button variant="accent" size="md" className="gap-1.5">
              <Plus />
              <span>Log Visit</span>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Visits Today
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">5</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">3 active reps</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Orders Generated
          </div>
          <div className="text-2xl tabular font-bold text-success mt-1">3</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">60% conversion</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Cities Covered
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">4</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">KHI · LHR · ISB · PEW</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Pending Followups
          </div>
          <div className="text-2xl tabular font-bold text-warning mt-1">2</div>
        </Card>
      </div>

      {view === "map" ? (
        <Card className="overflow-hidden">
          <div className="aspect-[16/9] bg-gradient-to-br from-info/5 to-brand-yellow/5 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
            <div className="text-center">
              <MapPin className="size-12 text-brand-yellow mx-auto mb-3" />
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">Map view</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Live visit locations across Pakistan — pin clusters per city
              </p>
              <div className="mt-3 text-xs text-slate-400">Map integration coming in Phase I</div>
            </div>
            {/* Decorative pins */}
            {VISITS.slice(0, 5).map((v, i) => (
              <div
                key={v.id}
                className="absolute size-3 rounded-full bg-brand-yellow ring-4 ring-brand-yellow/20 animate-pulse-soft"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${30 + i * 12}%`,
                }}
              />
            ))}
          </div>
        </Card>
      ) : (
        <>
          <FilterBar
            searchPlaceholder="Search by party or sales rep…"
            searchValue={search}
            onSearchChange={setSearch}
          />

          <div className="space-y-3">
            {filtered.map((v) => (
              <Card key={v.id} className="hover:border-brand-yellow/40 transition-colors">
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar initials={initials(v.salesPerson)} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-navy-900 dark:text-white">
                            {v.salesPerson}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">visited</span>
                          <Link
                            href={`/parties/${v.partyId}`}
                            className="text-sm font-medium text-brand-yellow-700 dark:text-brand-yellow hover:underline"
                          >
                            {v.partyName}
                          </Link>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5">{v.notes}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="size-3 text-slate-400" />
                            {formatDate(v.date)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3 text-slate-400" />
                            {v.time}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3 text-slate-400" />
                            <span className="tabular">{v.lat}, {v.lng}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-info">
                            <Camera className="size-3" />
                            2 photos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusPill variant={v.variant}>{v.outcome}</StatusPill>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
