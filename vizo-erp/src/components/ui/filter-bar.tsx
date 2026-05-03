"use client";

import * as React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export type FilterChip = {
  key: string;
  label: string;
  value: string;
};

export function FilterBar({
  searchPlaceholder = "Search…",
  onSearchChange,
  searchValue,
  chips = [],
  onRemoveChip,
  onClearAll,
  extraActions,
  className,
}: {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  chips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
  extraActions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 mb-4",
        className
      )}
    >
      <div className="relative flex-1 min-w-0">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9 bg-slate-50 dark:bg-navy-900 border-transparent focus:bg-white dark:focus:bg-navy-800"
        />
      </div>

      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map((c) => (
            <Badge
              key={c.key}
              variant="muted"
              className="gap-1.5 pr-1"
            >
              <span className="text-2xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                {c.label}:
              </span>
              <span className="text-slate-700 dark:text-slate-200">{c.value}</span>
              <button
                onClick={() => onRemoveChip?.(c.key)}
                className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-navy-600 transition-colors"
                aria-label={`Remove ${c.label} filter`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {chips.length > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="text-xs text-slate-500 hover:text-navy-900 dark:hover:text-white px-1.5 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="secondary" size="md" className="gap-1.5">
          <Filter />
          <span>Filters</span>
        </Button>
        {extraActions}
      </div>
    </div>
  );
}
