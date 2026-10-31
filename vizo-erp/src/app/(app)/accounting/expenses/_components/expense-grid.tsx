"use client";

import * as React from "react";
import { Trash2, Lock, Plus, ChevronsUpDown } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The day's expenses as a table
 * ─────────────────────────────────────────────────────────────────────────────
 * The owner asked for "Excel-like input boxes": open a date and type as many
 * expenses as the day had. Since 27 Oct it looks and works like the Voucher
 * Book (accounting/vouchers/table) -- the same table, the same cells, the same
 * searchable account picker, and a "+ Add row" button under it. There is no
 * payment method (the owner, 1 Nov): the paid-from account says cash or bank.
 *
 *   - Tab moves right (the browser's own order). Enter does too; Enter in the
 *     last cell of the last row adds the next row, the way the old book moved
 *     down the grid. Shift+Enter goes back. Up / Down move between rows in the
 *     same column, in the text cells.
 *   - "+ Add row" adds an empty row. Rows left completely empty are ignored
 *     when the sheet is saved.
 *   - Every row can be deleted.
 *   - A row is checked as soon as the cursor leaves it (and every row when
 *     Save is pressed); the problem is shown under the row, not in a toast.
 *
 * On a narrow screen the table scrolls sideways inside its card, as the
 * Voucher Book does; the page itself never does.
 *
 * The page owns the rows; this component only draws them and reports edits.
 */

export type Head = { id: number; code: string; name: string };
export type PaidFromAccount = { id: number; code: string; name: string };

export type GridRow = {
  /** Stable React key -- the line id for a saved line, a random one for a new row. */
  key: string;
  id?: number;
  expenseNo?: string;
  expenseAccountId: number;
  description: string;
  vendorName: string;
  paidFromAccountId: number;
  /** Kept as typed, so "12." is not rewritten to "12" under the cursor. */
  amount: string;
  /** Already in the ledger on its own (a pre-sheet expense): shown, never edited. */
  locked?: boolean;
  /** Reversed on its own before sheets existed: printed struck through, not counted. */
  excluded?: boolean;
  /** Names as the API sent them, for read-only rows. */
  head?: string;
  headCode?: string;
  paidFrom?: string;
  status?: string;
};

export type Field = "expenseAccountId" | "description" | "vendorName" | "paidFromAccountId" | "amount" | "row";
export type RowErrors = Partial<Record<Field, string>>;

/* The cells a cursor can stop in, in reading order. */
const COLS: Exclude<Field, "row">[] = ["expenseAccountId", "description", "vendorName", "paidFromAccountId", "amount"];

export function newRowKey() {
  return `n${Math.random().toString(36).slice(2, 10)}`;
}

export function parseAmount(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Nothing typed into it: a fresh row, or one cleared out. */
export function isBlank(r: GridRow) {
  return !r.id && !r.expenseAccountId && !r.description.trim() && !r.vendorName.trim() && !r.amount.trim();
}

/** The same rules the API applies, so a mistake is caught while typing. */
export function validateRow(r: GridRow): RowErrors {
  if (r.locked || isBlank(r)) return {};
  const e: RowErrors = {};
  if (!r.expenseAccountId) e.expenseAccountId = "Pick an expense head";
  if (!r.vendorName.trim()) e.vendorName = "Who was paid?";
  else if (r.vendorName.trim().length > 150) e.vendorName = "Keep the vendor under 150 characters";
  if (r.description.length > 500) e.description = "Keep the description under 500 characters";
  if (!r.paidFromAccountId) e.paidFromAccountId = "Pick the account it was paid from";
  const amount = parseAmount(r.amount);
  if (!r.amount.trim() || amount <= 0) e.amount = "Enter an amount above zero";
  return e;
}

export function ExpenseGrid({
  rows,
  editable,
  heads,
  paidFrom,
  vendors,
  errors,
  showAllErrors,
  onRowsChange,
  onClearError,
  defaultPaidFromId,
}: {
  rows: GridRow[];
  editable: boolean;
  heads: Head[];
  paidFrom: PaidFromAccount[];
  vendors: string[];
  /** Server-side refusals by row key. */
  errors: Record<string, RowErrors>;
  /** After Save is pressed every row shows its problems, visited or not. */
  showAllErrors: boolean;
  onRowsChange: (rows: GridRow[]) => void;
  onClearError: (rowKey: string, field: Field) => void;
  defaultPaidFromId: number;
}) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  /* Rows the cursor has left: only those show their own mistakes before Save,
     so a row is not painted red while it is still being typed. */
  const [visited, setVisited] = React.useState<Set<string>>(() => new Set());

  const headById = React.useMemo(() => new Map(heads.map((h) => [h.id, h])), [heads]);
  const paidById = React.useMemo(() => new Map(paidFrom.map((a) => [a.id, a])), [paidFrom]);

  /** An empty row paid from the same account as the row above it. */
  const blankRow = React.useCallback(
    (list: GridRow[]): GridRow => {
      const prevPaid = [...list].reverse().find((r) => r.paidFromAccountId)?.paidFromAccountId ?? defaultPaidFromId;
      return {
        key: newRowKey(),
        expenseAccountId: 0,
        description: "",
        vendorName: "",
        paidFromAccountId: prevPaid,
        amount: "",
      };
    },
    [defaultPaidFromId]
  );

  function update(index: number, patch: Partial<GridRow>, field: Field) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onClearError(rows[index].key, field);
    onRowsChange(next);
  }

  function addRow() {
    const next = [...rows, blankRow(rows)];
    onRowsChange(next);
    focusCell(next.length - 1, 0);
  }

  function remove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    /* Never an empty table on an open sheet -- one blank row to type into. */
    onRowsChange(editable && !next.some((r) => !r.locked) ? [...next, blankRow(next)] : next);
  }

  function focusCell(row: number, col: number) {
    const go = () => {
      const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`);
      if (!el) return false;
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
      return true;
    };
    /* Straight away when the cell is already there; if a row is still being
       added, once React has drawn it. (A timeout, not requestAnimationFrame,
       which a background tab never runs.) */
    if (!go()) setTimeout(go, 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLElement>, row: number, col: number) {
    const isText = e.currentTarget instanceof HTMLInputElement;
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        if (col > 0) focusCell(row, col - 1);
        else if (row > 0) focusCell(row - 1, COLS.length - 1);
      } else if (col < COLS.length - 1) {
        focusCell(row, col + 1);
      } else if (row < rows.length - 1) {
        focusCell(row + 1, 0);
      } else {
        addRow();
      }
    } else if (isText && e.key === "ArrowDown" && row < rows.length - 1) {
      e.preventDefault();
      focusCell(row + 1, col);
    } else if (isText && e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      focusCell(row - 1, col);
    }
  }

  function onRowBlur(e: React.FocusEvent<HTMLTableRowElement>, key: string) {
    /* Leaving the row altogether, not moving between its own cells. A
       popover's list is portalled outside the row, so a click into it is not
       "leaving" either. */
    const to = e.relatedTarget as Node | null;
    if (e.currentTarget.contains(to)) return;
    if (to instanceof Element && to.closest("[data-radix-popper-content-wrapper]")) return;
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  }

  const lineTotal = rows.filter((r) => !isBlank(r) && !r.excluded).reduce((s, r) => s + parseAmount(r.amount), 0);
  let lineNo = 0;

  return (
    <Card>
      <div ref={gridRef} className="overflow-x-auto">
        <datalist id="expense-vendors">
          {vendors.map((v) => <option key={v} value={v} />)}
        </datalist>

        <table className="w-full text-sm min-w-[56rem] table-fixed">
          <thead className="bg-slate-50 dark:bg-navy-800 text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-2 py-2 text-left w-10">#</th>
              <th className="px-2 py-2 text-left w-60">Expense head</th>
              <th className="px-2 py-2 text-left">Description</th>
              <th className="px-2 py-2 text-left w-44">Vendor</th>
              <th className="px-2 py-2 text-left w-48">Paid from</th>
              <th className="px-2 py-2 text-right w-36">Amount</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-3 text-center text-xs text-slate-400">No expenses on this day.</td></tr>
            )}
            {rows.map((r, i) => {
              const blank = isBlank(r);
              if (!blank) lineNo++;
              const shown = showAllErrors || visited.has(r.key) ? validateRow(r) : {};
              const errs: RowErrors = { ...shown, ...(errors[r.key] ?? {}) };
              const messages = Object.values(errs).filter(Boolean) as string[];
              const readOnly = !editable || r.locked;

              return (
                <React.Fragment key={r.key}>
                  <tr
                    onBlur={(e) => onRowBlur(e, r.key)}
                    className={cn(
                      "border-t border-slate-100 dark:border-navy-700 align-top",
                      readOnly && "bg-slate-50/40 dark:bg-navy-900/30",
                      r.excluded && "opacity-60",
                      messages.length > 0 && "bg-danger/5"
                    )}
                  >
                    {/* the line number -- a padlock on a line that cannot be
                        typed over on a sheet that otherwise can */}
                    <td className={cn("px-2 tabular text-slate-400", readOnly ? "py-2" : "py-1.5 pt-3")}>
                      {editable && r.locked
                        ? <Lock className="size-3 text-slate-400 mt-0.5" aria-label="Posted on its own" />
                        : blank ? "" : lineNo}
                    </td>

                    {/* expense head */}
                    <td className={readOnly ? "px-2 py-2" : "px-2 py-1.5"}>
                      {readOnly ? (
                        <span className="font-medium text-navy-900 dark:text-white">
                          {r.head ?? headById.get(r.expenseAccountId)?.name ?? "—"}
                          {r.expenseNo && <span className="block text-2xs tabular text-slate-400">{r.expenseNo}</span>}
                        </span>
                      ) : (
                        <HeadPicker
                          cell={`${i}-0`}
                          heads={heads}
                          value={r.expenseAccountId}
                          /* An old line booked to something that is not an
                             expense head keeps its name visible until it is
                             corrected. */
                          strayName={r.expenseAccountId > 0 && !headById.has(r.expenseAccountId)
                            ? `${r.head ?? "Not an expense head"} — change this` : null}
                          invalid={!!errs.expenseAccountId}
                          label={`Expense head, line ${i + 1}`}
                          onChange={(id) => { update(i, { expenseAccountId: id }, "expenseAccountId"); focusCell(i, 1); }}
                        />
                      )}
                    </td>

                    {/* description */}
                    <td className={readOnly ? "px-2 py-2 text-slate-500 dark:text-slate-400" : "px-2 py-1.5"}>
                      {readOnly ? (r.description || "—") : (
                        <Input
                          data-cell={`${i}-1`}
                          aria-label={`Description, line ${i + 1}`}
                          aria-invalid={!!errs.description}
                          value={r.description}
                          maxLength={500}
                          placeholder="What was it for?"
                          onChange={(e) => update(i, { description: e.target.value }, "description")}
                          onKeyDown={(e) => onKeyDown(e, i, 1)}
                        />
                      )}
                    </td>

                    {/* vendor */}
                    <td className={readOnly ? "px-2 py-2 text-slate-700 dark:text-slate-200" : "px-2 py-1.5"}>
                      {readOnly ? (r.vendorName || "—") : (
                        <Input
                          data-cell={`${i}-2`}
                          aria-label={`Vendor, line ${i + 1}`}
                          aria-invalid={!!errs.vendorName}
                          list="expense-vendors"
                          autoComplete="off"
                          value={r.vendorName}
                          maxLength={150}
                          placeholder="Paid to"
                          onChange={(e) => update(i, { vendorName: e.target.value }, "vendorName")}
                          onKeyDown={(e) => onKeyDown(e, i, 2)}
                        />
                      )}
                    </td>

                    {/* paid from */}
                    <td className={readOnly ? "px-2 py-2 text-slate-700 dark:text-slate-200" : "px-2 py-1.5"}>
                      {readOnly ? (r.paidFrom ?? paidById.get(r.paidFromAccountId)?.name ?? "—") : (
                        <SelectNative
                          data-cell={`${i}-3`}
                          aria-label={`Paid from, line ${i + 1}`}
                          aria-invalid={!!errs.paidFromAccountId}
                          value={r.paidFromAccountId || ""}
                          onChange={(e) => update(i, { paidFromAccountId: Number(e.target.value) || 0 }, "paidFromAccountId")}
                          onKeyDown={(e) => onKeyDown(e, i, 3)}
                        >
                          <option value="">Choose…</option>
                          {paidFrom.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                        </SelectNative>
                      )}
                    </td>

                    {/* amount */}
                    <td className={readOnly ? "px-2 py-2 text-right" : "px-2 py-1.5"}>
                      {readOnly ? (
                        <span className={cn("tabular font-semibold text-navy-900 dark:text-white",
                          r.excluded && "line-through text-slate-400 dark:text-slate-500")}>
                          {formatMoney(parseAmount(r.amount), { decimals: 2 })}
                        </span>
                      ) : (
                        <Input
                          data-cell={`${i}-4`}
                          aria-label={`Amount, line ${i + 1}`}
                          aria-invalid={!!errs.amount}
                          inputMode="decimal"
                          autoComplete="off"
                          className="text-right tabular"
                          value={r.amount}
                          placeholder="0.00"
                          onChange={(e) => {
                            /* Digits, one point, two places. Commas typed by habit are dropped. */
                            const v = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
                            const [whole, frac] = v.split(".");
                            update(i, { amount: frac !== undefined ? `${whole}.${frac.slice(0, 2)}` : whole }, "amount");
                          }}
                          onKeyDown={(e) => onKeyDown(e, i, 4)}
                        />
                      )}
                    </td>

                    {/* delete */}
                    <td className={readOnly ? "px-2 py-2" : "px-2 py-1.5"}>
                      {(editable && r.locked) || r.excluded ? (
                        <span title={`${r.excluded ? "Reversed on its own" : "Posted on its own"} before day sheets existed. It cannot be changed here.`}
                          className="inline-flex text-slate-400 mt-0.5">
                          <Lock className="size-3" />
                        </span>
                      ) : editable && (
                        <Button variant="ghost" size="icon-sm" tabIndex={-1} aria-label={`Delete line ${i + 1}`}
                          title="Delete this line" onClick={() => remove(i)}>
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      )}
                    </td>
                  </tr>

                  {messages.length > 0 && (
                    <tr className="bg-danger/5">
                      <td />
                      <td colSpan={7} className="px-2 pb-2 text-xs text-danger" role="alert">{messages.join(" · ")}</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <CardBody className="border-t border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-3">
        {editable ? (
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={addRow}>
            <Plus /> Add row
          </Button>
        ) : <span />}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs tabular">
          <span className="text-slate-500">Lines <b className="text-navy-900 dark:text-white">{lineNo}</b></span>
          <span className="text-slate-500">Day total <b className="text-danger">{formatMoney(lineTotal, { decimals: 2 })}</b></span>
        </div>
      </CardBody>
    </Card>
  );
}

/** The expense-head cell: type a name or code, pick one -- the Voucher Book's account picker. */
function HeadPicker({
  cell, heads, value, strayName, invalid, label, onChange,
}: {
  cell: string;
  heads: Head[];
  value: number;
  strayName: string | null;
  invalid: boolean;
  label: string;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const chosen = heads.find((h) => h.id === value) ?? null;
  const text = chosen ? `${chosen.code} ${chosen.name}` : strayName;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-cell={cell}
          aria-label={invalid ? `${label} (required)` : label}
          className={cn(
            "w-full h-9 px-3 rounded-lg border bg-white dark:bg-navy-800 text-left text-sm flex items-center gap-2 transition-all",
            "focus:outline-none focus:border-brand-yellow focus:shadow-glow-yellow hover:border-brand-yellow",
            invalid ? "border-danger" : "border-slate-200 dark:border-navy-700"
          )}
        >
          <span className={cn("flex-1 truncate", text ? "text-navy-900 dark:text-white" : "text-slate-400")}>
            {text ?? "Choose head…"}
          </span>
          <ChevronsUpDown className="size-3.5 text-slate-400 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,26rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Type a name or code…" />
          <CommandList className="max-h-72">
            <CommandEmpty>None found.</CommandEmpty>
            <CommandGroup>
              {heads.map((h) => (
                <CommandItem key={h.id} value={`${h.name} ${h.code}`} onSelect={() => { onChange(h.id); setOpen(false); }}>
                  <span className="flex-1 truncate text-sm">{h.name}</span>
                  <span className="text-2xs tabular text-slate-400 shrink-0">{h.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
