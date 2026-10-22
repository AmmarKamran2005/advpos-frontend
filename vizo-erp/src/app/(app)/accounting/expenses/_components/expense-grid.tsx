"use client";

import * as React from "react";
import { Trash2, Lock } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The day's expenses as a spreadsheet
 * ─────────────────────────────────────────────────────────────────────────────
 * The owner asked for "Excel-like input boxes": open a date and type as many
 * expenses as the day had. So this is a grid of plain inputs, not a form per
 * expense:
 *
 *   - Tab moves right (the browser's own order). Enter does too, and from the
 *     last cell of a row it lands on the first cell of the next row -- type a
 *     row left to right, press Enter, carry on. Shift+Enter goes back.
 *     Up / Down move between rows in the same column, in the text cells.
 *   - There is always one empty row at the bottom. Typing into it adds the
 *     next one, so nobody ever presses "Add line". Rows left completely empty
 *     are ignored when the sheet is saved.
 *   - Every row can be deleted.
 *   - A row is checked as soon as the cursor leaves it (and every row when
 *     Save is pressed); the problem is shown under the row, not in a toast.
 *
 * ONE DOM FOR BOTH SCREENS. From `md` up each row is a line of the grid; below
 * it the same elements reflow into a card of stacked fields, with the labels
 * the header row gives a desktop. Nothing is rendered twice, so there is one
 * set of inputs, one tab order and one state -- and nothing scrolls sideways
 * at 375 px.
 *
 * The page owns the rows; this component only draws them and reports edits.
 */

export type Head = { id: number; code: string; name: string };
export type PaidFromAccount = { id: number; code: string; name: string; defaultMethodId: number };
export type Method = { id: number; key: string; name: string };

export type GridRow = {
  /** Stable React key -- the line id for a saved line, a random one for a new row. */
  key: string;
  id?: number;
  expenseNo?: string;
  expenseAccountId: number;
  description: string;
  vendorName: string;
  paidFromAccountId: number;
  methodId: number;
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
  method?: string;
  status?: string;
};

export type Field = "expenseAccountId" | "description" | "vendorName" | "paidFromAccountId" | "methodId" | "amount" | "row";
export type RowErrors = Partial<Record<Field, string>>;

/* The cells a cursor can stop in, in reading order. */
const COLS: Exclude<Field, "row">[] = ["expenseAccountId", "description", "vendorName", "paidFromAccountId", "methodId", "amount"];

export function newRowKey() {
  return `n${Math.random().toString(36).slice(2, 10)}`;
}

export function parseAmount(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Nothing typed into it: the spare row at the bottom, or one cleared out. */
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

/* The spreadsheet look from md up (cells flush, a yellow ring on the focused
   one); a normal rounded field below it. */
const cellBase =
  "w-full h-10 px-2.5 text-sm text-navy-900 dark:text-white bg-white dark:bg-navy-800 " +
  "rounded-lg border border-slate-200 dark:border-navy-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
  "md:rounded-none md:border-0 md:bg-transparent dark:md:bg-transparent " +
  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-yellow md:focus:bg-brand-yellow-50/70 dark:md:focus:bg-navy-700 " +
  "disabled:opacity-60 disabled:cursor-not-allowed";
const cellBad = "ring-2 ring-inset ring-danger/70 md:bg-danger/5";

const GRID =
  "grid grid-cols-2 gap-x-2 gap-y-2 md:gap-0 " +
  "md:grid-cols-[2.25rem_minmax(0,1.35fr)_minmax(0,1.6fr)_minmax(0,1.15fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,1fr)_2.25rem]";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="md:hidden block text-2xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
      {children}
    </span>
  );
}

export function ExpenseGrid({
  rows,
  editable,
  heads,
  paidFrom,
  methods,
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
  methods: Method[];
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

  /* Keep exactly one spare row at the bottom while the sheet can be edited. */
  const withSpare = React.useCallback(
    (list: GridRow[]) => {
      if (!editable) return list;
      const last = list[list.length - 1];
      if (last && isBlank(last)) return list;
      const prevPaid = [...list].reverse().find((r) => r.paidFromAccountId)?.paidFromAccountId ?? defaultPaidFromId;
      return [
        ...list,
        {
          key: newRowKey(),
          expenseAccountId: 0,
          description: "",
          vendorName: "",
          paidFromAccountId: prevPaid,
          methodId: paidById.get(prevPaid)?.defaultMethodId ?? 0,
          amount: "",
        },
      ];
    },
    [editable, defaultPaidFromId, paidById]
  );

  function update(index: number, patch: Partial<GridRow>, field: Field) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onClearError(rows[index].key, field);
    onRowsChange(withSpare(next));
  }

  function remove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onRowsChange(withSpare(next));
  }

  function focusCell(row: number, col: number) {
    const go = () => {
      /* The amount has a phone copy (m-prefixed); take whichever is on screen. */
      const el = [`${row}-${col}`, `m${row}-${col}`]
        .map((a) => gridRef.current?.querySelector<HTMLElement>(`[data-cell="${a}"]`))
        .find((x) => x && x.offsetParent !== null);
      if (!el) return false;
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
      return true;
    };
    /* Straight away when the cell is already there -- it nearly always is,
       because the spare row exists before anybody presses Enter in it. If a
       row is still being added, once React has drawn it. (A timeout, not
       requestAnimationFrame, which a background tab never runs.) */
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
      } else {
        focusCell(row + 1, 0);
      }
    } else if (isText && e.key === "ArrowDown" && row < rows.length - 1) {
      e.preventDefault();
      focusCell(row + 1, col);
    } else if (isText && e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      focusCell(row - 1, col);
    }
  }

  function onRowBlur(e: React.FocusEvent<HTMLDivElement>, key: string) {
    /* Leaving the row altogether, not moving between its own cells. */
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)));
  }

  let lineNo = 0;

  return (
    <div ref={gridRef} className="md:rounded-xl md:border md:border-slate-200 dark:md:border-navy-700 md:overflow-hidden">
      <datalist id="expense-vendors">
        {vendors.map((v) => <option key={v} value={v} />)}
      </datalist>

      {/* Column heads -- the desktop's labels. On a phone each card carries its own. */}
      <div
        className={cn(
          GRID,
          "hidden md:grid bg-navy-900 dark:bg-navy-950 text-white text-2xs font-semibold uppercase tracking-wider"
        )}
      >
        <div className="px-2 py-2.5 text-center">#</div>
        <div className="px-2.5 py-2.5">Expense head</div>
        <div className="px-2.5 py-2.5">Description</div>
        <div className="px-2.5 py-2.5">Vendor</div>
        <div className="px-2.5 py-2.5">Paid from</div>
        <div className="px-2.5 py-2.5">Method</div>
        <div className="px-2.5 py-2.5 text-right">Amount</div>
        <div />
      </div>

      <div className="space-y-3 md:space-y-0">
        {rows.map((r, i) => {
          const blank = isBlank(r);
          if (!blank) lineNo++;
          const shown = showAllErrors || visited.has(r.key) ? validateRow(r) : {};
          const errs: RowErrors = { ...shown, ...(errors[r.key] ?? {}) };
          const messages = Object.values(errs).filter(Boolean) as string[];
          const readOnly = !editable || r.locked;
          const spare = editable && blank && i === rows.length - 1;

          return (
            <div
              key={r.key}
              onBlur={(e) => onRowBlur(e, r.key)}
              className={cn(
                GRID,
                "p-3 rounded-xl border bg-white dark:bg-navy-800 md:p-0 md:rounded-none md:border-0 md:border-b",
                "border-slate-200 dark:border-navy-700 md:border-slate-100 dark:md:border-navy-700/60",
                "md:divide-x md:divide-slate-100 dark:md:divide-navy-700/60",
                spare && "border-dashed md:border-solid bg-slate-50/60 dark:bg-navy-900/40 md:bg-slate-50/50",
                r.excluded && "opacity-60",
                messages.length > 0 && "border-danger/40"
              )}
            >
              {/* phone: the card's own heading */}
              <div className="md:hidden col-span-2 flex items-center justify-between -mt-0.5">
                <span className="text-xs font-semibold text-navy-900 dark:text-white">
                  {spare ? "New line" : `Line ${lineNo}`}
                  {r.expenseNo && <span className="ml-2 font-normal text-slate-400 tabular">{r.expenseNo}</span>}
                </span>
                {(editable && r.locked) || r.excluded ? (
                  <LockedTag r={r} />
                ) : (
                  editable && !spare && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-danger p-1 -mr-1"
                      aria-label={`Delete line ${lineNo}`}
                    >
                      <Trash2 className="size-3.5" />Delete
                    </button>
                  )
                )}
              </div>

              {/* desktop: the line number */}
              <div className="hidden md:flex items-center justify-center text-xs tabular text-slate-400">
                {/* A padlock only where it tells somebody something: a line
                    that cannot be typed over on a sheet that otherwise can. */}
                {editable && r.locked ? <Lock className="size-3 text-slate-400" aria-label="Posted on its own" /> : blank ? "" : lineNo}
              </div>

              {/* expense head */}
              <div className="col-span-2 md:col-span-1 min-w-0">
                <Label>Expense head</Label>
                {readOnly ? (
                  <ReadCell strong>{r.head ?? headById.get(r.expenseAccountId)?.name ?? "—"}</ReadCell>
                ) : (
                  <select
                    data-cell={`${i}-0`}
                    aria-label={`Expense head, line ${i + 1}`}
                    aria-invalid={!!errs.expenseAccountId}
                    value={r.expenseAccountId || ""}
                    onChange={(e) => update(i, { expenseAccountId: Number(e.target.value) || 0 }, "expenseAccountId")}
                    onKeyDown={(e) => onKeyDown(e, i, 0)}
                    className={cn(cellBase, "pr-7 cursor-pointer", errs.expenseAccountId && cellBad, !r.expenseAccountId && "text-slate-400")}
                  >
                    <option value="">Choose head…</option>
                    {/* An old line booked to something that is not an expense
                        head (one was filed against Owner Capital) keeps its
                        value visible until it is corrected. */}
                    {r.expenseAccountId > 0 && !headById.has(r.expenseAccountId) && (
                      <option value={r.expenseAccountId}>{r.head ?? "Not an expense head"} — change this</option>
                    )}
                    {heads.map((h) => (
                      <option key={h.id} value={h.id}>{h.code} · {h.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* description */}
              <div className="col-span-2 md:col-span-1 min-w-0">
                <Label>Description</Label>
                {readOnly ? (
                  <ReadCell>{r.description || "—"}</ReadCell>
                ) : (
                  <input
                    data-cell={`${i}-1`}
                    aria-label={`Description, line ${i + 1}`}
                    aria-invalid={!!errs.description}
                    value={r.description}
                    maxLength={500}
                    placeholder={spare ? "What was it for?" : ""}
                    onChange={(e) => update(i, { description: e.target.value }, "description")}
                    onKeyDown={(e) => onKeyDown(e, i, 1)}
                    className={cn(cellBase, errs.description && cellBad)}
                  />
                )}
              </div>

              {/* vendor */}
              <div className="min-w-0">
                <Label>Vendor</Label>
                {readOnly ? (
                  <ReadCell>{r.vendorName || "—"}</ReadCell>
                ) : (
                  <input
                    data-cell={`${i}-2`}
                    aria-label={`Vendor, line ${i + 1}`}
                    aria-invalid={!!errs.vendorName}
                    list="expense-vendors"
                    autoComplete="off"
                    value={r.vendorName}
                    maxLength={150}
                    placeholder={spare ? "Paid to" : ""}
                    onChange={(e) => update(i, { vendorName: e.target.value }, "vendorName")}
                    onKeyDown={(e) => onKeyDown(e, i, 2)}
                    className={cn(cellBase, errs.vendorName && cellBad)}
                  />
                )}
              </div>

              {/* amount -- on a phone it sits beside the vendor, where a thumb expects it */}
              <div className="min-w-0 md:hidden">
                <Label>Amount (PKR)</Label>
                {readOnly ? (
                  <ReadCell right strong struck={r.excluded}>{formatMoney(parseAmount(r.amount), { withSymbol: false, decimals: 2 })}</ReadCell>
                ) : (
                  <AmountInput i={i} r={r} bad={!!errs.amount} update={update} onKeyDown={onKeyDown} spare={spare} mobile />
                )}
              </div>

              {/* paid from */}
              <div className="min-w-0">
                <Label>Paid from</Label>
                {readOnly ? (
                  <ReadCell>{r.paidFrom ?? paidById.get(r.paidFromAccountId)?.name ?? "—"}</ReadCell>
                ) : (
                  <select
                    data-cell={`${i}-3`}
                    aria-label={`Paid from, line ${i + 1}`}
                    aria-invalid={!!errs.paidFromAccountId}
                    value={r.paidFromAccountId || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value) || 0;
                      /* The method follows the account -- Cash on Hand is
                         paid in cash -- and can still be changed after. */
                      update(i, { paidFromAccountId: id, methodId: paidById.get(id)?.defaultMethodId ?? r.methodId }, "paidFromAccountId");
                    }}
                    onKeyDown={(e) => onKeyDown(e, i, 3)}
                    className={cn(cellBase, "pr-7 cursor-pointer", errs.paidFromAccountId && cellBad)}
                  >
                    <option value="">Choose…</option>
                    {paidFrom.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* method */}
              <div className="min-w-0">
                <Label>Method</Label>
                {readOnly ? (
                  <ReadCell muted>{r.method ?? methods.find((m) => m.id === r.methodId)?.name ?? "—"}</ReadCell>
                ) : (
                  <select
                    data-cell={`${i}-4`}
                    aria-label={`Payment method, line ${i + 1}`}
                    value={r.methodId || ""}
                    onChange={(e) => update(i, { methodId: Number(e.target.value) || 0 }, "methodId")}
                    onKeyDown={(e) => onKeyDown(e, i, 4)}
                    className={cn(cellBase, "pr-7 cursor-pointer text-slate-600 dark:text-slate-300")}
                  >
                    <option value="">Auto</option>
                    {methods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* amount, desktop position */}
              <div className="hidden md:block min-w-0">
                {readOnly ? (
                  <ReadCell right strong struck={r.excluded}>{formatMoney(parseAmount(r.amount), { withSymbol: false, decimals: 2 })}</ReadCell>
                ) : (
                  <AmountInput i={i} r={r} bad={!!errs.amount} update={update} onKeyDown={onKeyDown} spare={spare} />
                )}
              </div>

              {/* desktop: delete */}
              <div className="hidden md:flex items-center justify-center">
                {(editable && r.locked) || r.excluded ? (
                  <LockedTag r={r} compact />
                ) : (
                  editable && !spare && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => remove(i)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-danger/10"
                      aria-label={`Delete line ${lineNo}`}
                      title="Delete this line"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )
                )}
              </div>

              {messages.length > 0 && (
                <p className="col-span-2 md:col-span-8 text-xs text-danger md:px-12 md:pb-2 md:pt-1" role="alert">
                  {messages.join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* The amount cell exists twice in the markup (beside the vendor on a phone,
   last on a desktop) but only one is ever displayed -- the other is
   display:none, which also takes it out of the tab order -- so there is still
   one amount field per row that a keyboard can reach. The phone's copy is
   addressed "m<row>-5" and focusCell picks whichever is on screen. */
function AmountInput({
  i, r, bad, update, onKeyDown, spare, mobile = false,
}: {
  i: number;
  r: GridRow;
  bad: boolean;
  update: (index: number, patch: Partial<GridRow>, field: Field) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>, row: number, col: number) => void;
  spare: boolean;
  mobile?: boolean;
}) {
  return (
    <input
      data-cell={mobile ? `m${i}-5` : `${i}-5`}
      aria-label={`Amount, line ${i + 1}`}
      aria-invalid={bad}
      inputMode="decimal"
      autoComplete="off"
      value={r.amount}
      placeholder={spare ? "0.00" : ""}
      onChange={(e) => {
        /* Digits, one point, two places. Commas typed by habit are dropped. */
        const v = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
        const [whole, frac] = v.split(".");
        update(i, { amount: frac !== undefined ? `${whole}.${frac.slice(0, 2)}` : whole }, "amount");
      }}
      onKeyDown={(e) => onKeyDown(e, i, 5)}
      className={cn(cellBase, "text-right tabular font-semibold", bad && cellBad)}
    />
  );
}

function ReadCell({
  children, right, strong, muted, struck,
}: {
  children: React.ReactNode;
  right?: boolean;
  strong?: boolean;
  muted?: boolean;
  struck?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-h-10 md:h-10 flex items-center md:px-2.5 text-sm truncate",
        right && "md:justify-end tabular",
        strong ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200",
        muted && "text-slate-500 dark:text-slate-400 text-xs",
        struck && "line-through text-slate-400 dark:text-slate-500"
      )}
    >
      <span className="truncate">{children}</span>
    </div>
  );
}

function LockedTag({ r, compact = false }: { r: GridRow; compact?: boolean }) {
  const text = r.excluded ? "Reversed on its own" : "Posted on its own";
  return compact ? (
    <span title={`${text} before day sheets existed. It cannot be changed here.`} className="text-slate-400">
      <Lock className="size-3" />
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-2xs font-medium text-slate-500">
      <Lock className="size-3" />{text}
    </span>
  );
}
