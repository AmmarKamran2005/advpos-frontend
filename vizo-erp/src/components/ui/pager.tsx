"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The pager for a list whose paging happens on the SERVER.
 *
 * DataTable has its own pager, but it slices whatever array it was handed --
 * fine for a list that arrived whole, wrong for one where page 2 is a request
 * the browser has not made yet. The accounting lists have 14,477 invoices
 * behind them; they ask the API for one page at a time and this drives that.
 *
 * Renders nothing when everything fits on one page.
 */
export function Pager({
  page,
  pageCount,
  total,
  noun,
  onPage,
  disabled,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** Plural, lowercase -- "expenses", "entries", "vouchers". */
  noun: string;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/10">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Page <span className="tabular font-medium">{page}</span> of{" "}
        <span className="tabular font-medium">{pageCount}</span> ·{" "}
        <span className="tabular font-medium">{total.toLocaleString()}</span> {noun}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1"
          disabled={disabled || page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1"
          disabled={disabled || page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
