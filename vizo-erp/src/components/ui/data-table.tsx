"use client";

import * as React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
};

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  rowHref,
  pageSize = 10,
  emptyState,
  className,
  hoverable = true,
}: {
  columns: Column<T>[];
  data: T[];
  rowHref?: (row: T) => string;
  pageSize?: number;
  emptyState?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const aStr = String(av);
      const bStr = String(bv);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  if (data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-navy-700/50 border-b border-slate-200 dark:border-navy-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-2.5 whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    !col.align && "text-left",
                    col.sortable && "cursor-pointer select-none hover:text-navy-900 dark:hover:text-white transition-colors"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => toggleSort(col)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-slate-400 dark:text-slate-500">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-navy-700">
            {pageData.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors",
                  hoverable && "hover:bg-slate-50 dark:hover:bg-navy-800",
                  rowHref && "cursor-pointer"
                )}
                onClick={
                  rowHref
                    ? () => {
                        if (typeof window !== "undefined") {
                          window.location.href = rowHref(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm text-slate-700 dark:text-slate-200",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing{" "}
            <span className="tabular font-semibold text-navy-900 dark:text-white">
              {page * pageSize + 1}
            </span>{" "}
            –{" "}
            <span className="tabular font-semibold text-navy-900 dark:text-white">
              {Math.min((page + 1) * pageSize, sorted.length)}
            </span>{" "}
            of{" "}
            <span className="tabular font-semibold text-navy-900 dark:text-white">
              {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={page === 0} onClick={() => setPage(0)}>
              <ChevronsLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-xs px-2 text-slate-600 dark:text-slate-300">
              Page <span className="font-semibold text-navy-900 dark:text-white tabular">{page + 1}</span> of{" "}
              <span className="font-semibold text-navy-900 dark:text-white tabular">{totalPages}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Convenience: Row actions menu trigger */
export function RowActions({ children }: { children?: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
      {children ?? <MoreHorizontal />}
    </Button>
  );
}
