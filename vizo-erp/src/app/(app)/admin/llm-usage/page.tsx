"use client";

import { Sparkles, DollarSign, MessageCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

type LlmQuery = {
  id: number;
  user: string;
  question: string;
  intent: string;
  provider: "Gemini" | "OpenAI";
  model: string;
  tokens: number;
  cost: number;
  flagged: boolean;
  time: string;
};

const QUERIES: LlmQuery[] = [
  { id: 1, user: "Umer Memon",   question: "Which product sold most last month?",                    intent: "SALES_INQUIRY",      provider: "Gemini", model: "gemini-1.5-pro", tokens: 842,  cost: 0.0024, flagged: false, time: "2 min ago" },
  { id: 2, user: "Hassan Raza",  question: "Show me overdue invoices in Karachi",                    intent: "AGING_INQUIRY",      provider: "Gemini", model: "gemini-1.5-pro", tokens: 1240, cost: 0.0035, flagged: false, time: "12 min ago" },
  { id: 3, user: "Sara Khan",    question: "Top 5 customers by revenue this quarter",                intent: "REPORT_SUMMARY",     provider: "Gemini", model: "gemini-1.5-pro", tokens: 985,  cost: 0.0028, flagged: false, time: "30 min ago" },
  { id: 4, user: "Bilal Ahmed",  question: "Why did COGS spike in March?",                            intent: "ANOMALY_DETECTION",  provider: "Gemini", model: "gemini-1.5-pro", tokens: 1820, cost: 0.0052, flagged: true,  time: "1 hour ago" },
  { id: 5, user: "Umer Memon",   question: "Summarise this month&apos;s P&L",                          intent: "REPORT_SUMMARY",     provider: "Gemini", model: "gemini-1.5-pro", tokens: 2140, cost: 0.0061, flagged: false, time: "2 hours ago" },
  { id: 6, user: "Fatima Sheikh",question: "Who should I call for collections today?",                intent: "RECOMMENDATION",     provider: "Gemini", model: "gemini-1.5-pro", tokens: 1480, cost: 0.0042, flagged: false, time: "3 hours ago" },
];

export default function LlmUsagePage() {
  const totalCost = QUERIES.reduce((s, q) => s + q.cost, 0) * 30; // simulate monthly
  const totalTokens = QUERIES.reduce((s, q) => s + q.tokens, 0) * 30;

  const columns: Column<LlmQuery>[] = [
    { key: "user", header: "User", cell: (q) => (
        <div className="flex items-center gap-2">
          <Avatar initials={initials(q.user)} size="sm" />
          <span className="text-sm font-medium text-navy-900 dark:text-white">{q.user}</span>
        </div>
      )
    },
    { key: "question",  header: "Question", cell: (q) => <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">{q.question}</span> },
    { key: "intent",    header: "Intent",   cell: (q) => <Badge variant="muted">{q.intent}</Badge> },
    { key: "provider",  header: "Provider", cell: (q) => <Badge variant="info">{q.provider}</Badge> },
    { key: "tokens",    header: "Tokens",   align: "right", cell: (q) => <span className="tabular text-xs text-slate-600 dark:text-slate-300">{q.tokens.toLocaleString()}</span> },
    { key: "cost",      header: "Cost",     align: "right", cell: (q) => <span className="tabular text-xs font-semibold text-navy-900 dark:text-white">${q.cost.toFixed(4)}</span> },
    { key: "flagged",   header: "",         cell: (q) => q.flagged ? <AlertTriangle className="size-4 text-warning" /> : null },
    { key: "time",      header: "Time",     cell: (q) => <span className="text-xs text-slate-500 dark:text-slate-400">{q.time}</span> },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "LLM Usage & Cost" }]}
        title="AI Assistant — Usage & Cost"
        subtitle="Track LLM queries, tokens consumed, and per-user cost"
        actions={
          <Button variant="secondary" size="md">Set Budget Cap</Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Queries this month</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{(QUERIES.length * 30).toLocaleString()}</div>
              <div className="text-xs text-success font-semibold mt-1 inline-flex items-center gap-1">
                <TrendingUp className="size-3" /> +24% vs last month
              </div>
            </div>
            <MessageCircle className="size-5 text-info" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Tokens consumed</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{(totalTokens / 1000).toFixed(0)}K</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">avg 1,418 per query</div>
            </div>
            <Sparkles className="size-5 text-brand-yellow" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Total Cost (USD)</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">${totalCost.toFixed(2)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">PKR {(totalCost * 280).toFixed(0)}</div>
            </div>
            <DollarSign className="size-5 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Flagged Answers</div>
              <div className="text-2xl tabular font-bold text-warning mt-1">3</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">needs review</div>
            </div>
            <AlertTriangle className="size-5 text-warning" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Top Users by Queries</h3>
            <div className="space-y-3">
              {[
                { user: "Umer Memon",    queries: 84, cost: 0.42 },
                { user: "Hassan Raza",   queries: 56, cost: 0.28 },
                { user: "Sara Khan",     queries: 38, cost: 0.18 },
                { user: "Bilal Ahmed",   queries: 24, cost: 0.12 },
                { user: "Fatima Sheikh", queries: 18, cost: 0.09 },
              ].map((u) => (
                <div key={u.user} className="flex items-center gap-3">
                  <Avatar initials={initials(u.user)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy-900 dark:text-white">{u.user}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.queries} queries · ${u.cost.toFixed(2)}</div>
                  </div>
                  <div className="w-32 h-2 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-yellow" style={{ width: `${(u.queries / 84) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="text-base font-semibold text-navy-900 dark:text-white mb-4">Cost Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Sales Inquiries",    pct: 42, color: "bg-brand-yellow" },
                { label: "Report Summaries",   pct: 28, color: "bg-info" },
                { label: "Anomaly Detection",  pct: 18, color: "bg-warning" },
                { label: "Recommendations",    pct: 12, color: "bg-success" },
              ].map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="tabular font-semibold text-navy-900 dark:text-white">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-navy-700 rounded-full overflow-hidden">
                    <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-navy-700">
          <h3 className="text-base font-semibold text-navy-900 dark:text-white">Recent Queries</h3>
        </div>
        <DataTable columns={columns} data={QUERIES} pageSize={10} />
      </Card>
    </>
  );
}
