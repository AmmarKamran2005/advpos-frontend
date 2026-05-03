"use client";

import * as React from "react";
import { Sparkles, SendHorizonal, Plus, MessageCircle, ChevronRight, Star, Flag } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SUGGESTED = [
  "Which product sold most last month?",
  "Show me overdue invoices in Karachi",
  "Summarise this month's P&L",
  "Who should I call for collections today?",
  "Why did COGS spike in March?",
  "Top 5 customers by revenue this quarter",
  "Compare Karachi vs Lahore branch performance",
  "What's tying up the most working capital?",
];

const RECENT_CHATS = [
  { id: 1, title: "Sales summary for April",       time: "2 hours ago" },
  { id: 2, title: "Overdue invoice analysis",        time: "Yesterday"   },
  { id: 3, title: "Top suppliers Q1 2026",           time: "2 days ago"  },
  { id: 4, title: "Why VR cables stopped selling",   time: "3 days ago"  },
];

export default function AIAssistantPage() {
  const [input, setInput] = React.useState("");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "AI Assistant" }]}
        title={
          <div className="inline-flex items-center gap-2">
            AI Assistant
            <Badge variant="accent">NEW</Badge>
          </div>
        }
        subtitle="Powered by Gemini · Ask anything about your business in plain English"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat sessions sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Button variant="accent" size="md" className="w-full gap-1.5">
            <Plus />
            New Chat
          </Button>

          <Card>
            <CardBody>
              <h3 className="text-2xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">Recent Chats</h3>
              <div className="space-y-1">
                {RECENT_CHATS.map((c) => (
                  <button key={c.id} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 text-left transition-colors group">
                    <MessageCircle className="size-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-navy-900 dark:text-white truncate">{c.title}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400">{c.time}</div>
                    </div>
                    <ChevronRight className="size-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-info/5 border-info/20">
            <CardBody>
              <div className="text-xs text-info-dark dark:text-info-light leading-relaxed">
                💡 <strong>How it works:</strong> The AI uses your real data via secure tool calls. It never sees raw data — only aggregated answers. Every query is logged.
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main chat */}
        <div className="lg:col-span-3">
          <Card className="min-h-[60vh] flex flex-col">
            <CardBody className="flex-1 flex flex-col">
              {/* Welcome state */}
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                <div className="size-20 rounded-3xl bg-brand-yellow/10 flex items-center justify-center mb-4">
                  <Sparkles className="size-9 text-brand-yellow" />
                </div>
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">How can I help you today?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md text-center">
                  Ask me anything about your sales, inventory, finances, or operations. I&apos;ll give you data-grounded answers.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-8 w-full max-w-2xl">
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-left p-3 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-navy-800 hover:bg-brand-yellow/10 dark:hover:bg-brand-yellow/10 hover:text-navy-900 dark:hover:text-white rounded-lg transition-colors border border-transparent hover:border-brand-yellow/30 group"
                    >
                      <div className="flex items-start gap-2">
                        <Star className="size-3.5 text-brand-yellow flex-shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="pt-4 border-t border-slate-200 dark:border-navy-700">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Ask the AI assistant…  (e.g. 'show me sales trend by region')"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="pr-12 h-11 bg-slate-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-800"
                  />
                  <Button size="icon-sm" variant="accent" className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <SendHorizonal />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-2xs text-slate-500 dark:text-slate-400">
                  <span>Powered by Gemini 1.5 Pro · responses are grounded in your data</span>
                  <button className="hover:text-navy-900 dark:hover:text-white inline-flex items-center gap-1">
                    <Flag className="size-3" />
                    Flag wrong answer
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
