"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTED_PROMPTS = [
  "Which product sold most last month?",
  "Show me overdue invoices in Karachi",
  "Summarise this month's P&L",
  "Who should I call for collections today?",
  "Why did COGS spike in March?",
  "Top 5 customers by revenue this quarter",
];

export function AIDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/55 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-white dark:bg-navy-950 border-l border-slate-200 dark:border-navy-800 z-50 flex flex-col shadow-elevated data-[state=open]:animate-slide-in-right">
          <header className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-navy-800 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center">
                <Sparkles className="size-4 text-brand-yellow" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-navy-900 dark:text-white">
                  AI Assistant
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400">
                  Ask anything about your business
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            <div className="text-center py-6">
              <div className="size-14 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="size-6 text-brand-yellow" />
              </div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">
                How can I help?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Try one of these suggestions:
              </p>
            </div>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="w-full text-left p-3 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-navy-800 hover:bg-brand-yellow/10 hover:text-navy-900 dark:hover:text-white rounded-lg transition-colors border border-transparent hover:border-brand-yellow/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-navy-800 flex-shrink-0">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ask the AI assistant…"
                className="pr-12 bg-slate-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-800"
              />
              <Button
                size="icon-sm"
                variant="accent"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Send"
              >
                <SendHorizonal />
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
