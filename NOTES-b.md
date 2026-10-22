# NOTES — session B (ledgers + order desk), 26–27 Sep 2026

Branch `feat/b-ledgers` in both repos. **Not pushed, not merged.** Local DB `advpos_b` only.

## OWNER MUST SEE

1. **Run migration 31 BEFORE the new API goes live.** The API now reads
   `"JournalEntryLine"."StaffId"`; on a database without that column every screen
   that touches the ledger (trial balance, statements, order credit check) answers 500.
   Order: 30 → 31 → 32 → 33, then deploy the API, then the web.
2. **Posting the history moves customer balances.** 27 invoices (PKR 446,755.69) and
   5 returns billed before today never reached the books (gap D7). After the Super
   Admin presses *Post them now* on Customer Ledgers, Accounts Receivable, Sales and the
   credit-limit check include them. Example on the copy: Mobile Zone Lahore goes from
   296,900 to 396,749.30 against a 200,000 limit, so its next order is held.

## What was built

### Backend (`backend/`, commits `7beb2ba`, `3c96fb2`, `495a1f5`)

| File | What |
|---|---|
| `Services/LedgerPosting.cs` (new) | Static posting helper. Sale invoice Dr 1130 (party) / Cr 4001 (total − tax) / Cr 2110 tax; counter sale also posts its payment (Dr cash/bank of the method / Cr 1130) in the same entry. Return Dr 4002 (+ tax share to 2110 when the bill had tax) / Cr 1130 (party). Confirmed collection → a posted RV voucher. Idempotent (never posts a document with an EntryId). **No COGS**: see below. |
| `Controllers/SalesController.cs` | Posting calls inside the transactions of `RaiseInvoiceForOrder` (create order + invoice, invoice button, credit-hold override, status flow), `CreateInvoice`, `CounterSale`, `CreateReturn`; `UpdateOrder` rewrites the invoice's entry in place (refused and logged in a closed month); `SetReturnStatus` posts on Approved/Posted and **reverses by a mirror** on Rejected. Order desk: `SalesPersonUserId` honoured for `order-dept` (required, must be an active sales rep), 0–10 % margin cap now applies to them too. `HideMoneyFromOrderDesk()` zeroes paid/balance/limit/outstanding/credit-hold reason in orders + invoices, and cost/duty/limit/outstanding in `/sales/lookups`. |
| `Controllers/AccountingController.cs` | `ConfirmCollection` only: now posts (RV voucher + entry) in a transaction; `ConfirmedByUserId` uses the Employee id (FK). Expenses untouched. |
| `Controllers/CustomerLedgerController.cs` (new) | `/api/ledgers/customers` — index (balance from 1130 lines + opening), lookups, statement (sales with items, receipts naming the bank, returns, manual rows, reversals), `+` row (manual JE, optional item via `LedgerEntryItem`), reverse, PDF render/archive (`customer-ledger`, key `id:from:to`), categories CRUD (remove refused while in use), quick account, xlsx import (template / preview / commit), `posting-status`, `post-missing` (backfill, super-admin). Roles super-admin, accountant. |
| `Controllers/StaffLedgerController.cs` (new) | `/api/ledgers/staff` — index (auto-creates a staff row for every employee login except EMP-000), create/edit staff **without a login**, categories CRUD, statement, rows (salary, bonus, payment, advance, deduction, adjustment), salary run (idempotent per person+month), reverse, PDF. |
| `Controllers/PackingController.cs` | `GET recent` (orders created in the last 7 PK days, any status, no money), `GET recent/{id}` (read-only order, base price like Packing), `GET order-lookups` (reps, customers + their reps, catalogue at selling price only). |
| `Controllers/PartiesController.cs` | Money zeroed for order-dept (limit, balance, opening, last payment); order-dept creates/edits cannot set limit/opening; statement refused to order-dept; party-form categories now "all except Distributor/Manufacturer" for non-admins so new categories appear. |
| `Controllers/ReportsController.cs` | Money endpoints carry `[Authorize(Roles="super-admin,accountant,sales")]`; order-dept dashboard drops claim cost and credit-hold value. |
| `Controllers/DocumentsController.cs` | Voucher, journal, expense, purchase, party-statement and sales-return PDFs refused to order-dept. |
| `Controllers/DeliveryController.cs` | Settle COD: super-admin, accountant. |
| `Controllers/InventoryController.cs` | Cost zeroed for order-dept in stock levels, adjustment detail and lookups. |
| `Controllers/ProductHistoryController.cs` | One attribute line: `[OrderDeskNoMoney]`. |
| `Services/OrderDeskNoMoneyAttribute.cs` (new) | Result filter: for order-dept drops "purchasing" events/chips, supplier documents, zeroes money fields, refuses file exports. Other roles untouched. |
| `Documents/LedgerStatementPdf.cs` (new) | Statement of account on the existing PdfCanvas, same palette/letterhead/footer as DocumentPdf; items indented under their sale, height-based pagination, totals band with entry count and Ledger Limit. |
| `Documents/XlsxReader.cs` (new) | Minimal .xlsx reader (zip + XML), no NuGet package. |
| `Models/StaffCategory.cs`, `StaffMember.cs`, `LedgerEntryItem.cs`, `JournalEntryLine.Custom.cs`, `AppDbContext.Ledgers.cs` (new) | Annotation-mapped; nothing added to AppDbContext.cs / .Custom.cs. |

### Frontend (`vizo-erp/`, commit `405dc09`)

| File | What |
|---|---|
| `app/(app)/ledgers/customers/page.tsx` | Index: search, category chips, sort, server paging, inline Categories, Import, New account (quick form), backfill banner. |
| `app/(app)/ledgers/customers/[id]/page.tsx` | Statement: From–To + presets, B/F, debit/credit/closing + limit bar, rows with items, `+` row (date, side, description, optional item × qty × price, other-side account), Undo (reversal), Print / Download PDF. |
| `app/(app)/ledgers/customers/import/page.tsx` | Template → upload → row-level preview → import. |
| `app/(app)/ledgers/staff/page.tsx`, `[id]/page.tsx` | Staff index, New staff (no login), Salary run, categories; staff statement with typed `+` row and PDF. |
| `components/ledgers/*` | `category-manager`, `statement-pdf-actions` (archive then open; blob fallback), `staff-dialog`, `ledger-kit` (incl. `pkToday()`). |
| `app/(app)/packing/page.tsx` + `components/packing/recent-orders.tsx` | "This week's orders" at the top; New order button. |
| `app/(app)/packing/orders/[id]/page.tsx` | Read-only order for the desk. |
| `app/(app)/packing/new-order/page.tsx` | Desk order form: salesperson ⇄ customer cascade, any customer allowed, fixed rate + 0–10 % margin. |
| `app/(app)/sales/orders/new/page.tsx` | Sends order-dept to `/packing/new-order`. |
| `app/(app)/parties/customers/page.tsx`, `parties/[id]/page.tsx` | Money hidden for order-dept; back office gets a "Ledger" button. |
| `lib/nav-config.ts` | "Delivered" removed; Customer Ledgers + Staff Ledgers in Money (`ledger.view`). |
| `proxy.ts` | `/ledgers` → super-admin, accountant. |

### Design decisions (no questions asked, per the brief)

- **Customer ledger = the books.** Built from posted 1130 lines carrying the party + `Party.OpeningBalance` as B/F; documents only describe the lines. One source for statement, index, trial balance and credit check.
- **Staff payables = one control account 2140** with `JournalEntryLine.StaffId` as the per-person subledger (2141–2149 left free). Balance shown in the liability's sense: positive = owed to them, negative = advance.
- **Staff without a login** live in `StaffMember`, not `User`: no role, no email, no password — nothing the sign-in code can ever accept. A login can be linked later (`UserId`).
- **Manual rows** are JOURNAL entries with reference `LEDGER <code>` / `STAFF <code>`; item detail in `LedgerEntryItem`; undo = reversal, never delete. Past dates allowed (the old system's adjustments are back-dated); closed months refused.
- **Returns with a cash refund** post only the credit to the customer; paying money back is a payment voucher (not posted automatically).
- **Counter sale cash** goes to 1101 Cash on Hand (no per-shop cash mapping exists).
- **No COGS** is posted on sales/returns: Session A is introducing per-purchase-order stock lots; COGS belongs there. The 12 seeded sale entries do carry COGS — the new ones don't, by design.

## Migrations (backend/database, all "Applied to the local test copy only — NOT yet run on live")

| # | File | What |
|---|---|---|
| 30 | `30_ledger_accounts.sql` | 1113 Faysal Bank Account, 2140 Staff Payables, entry types SALES_RETURN + SALARY, assert posting accounts exist. |
| 31 | `31_staff_ledgers.sql` | `StaffCategory`, `StaffMember`, `JournalEntryLine.StaffId` (+FK, index), index on `PartyUserId`, 6 categories, a staff row for every employee except EMP-000. |
| 32 | `32_ledger_entry_items.sql` | `LedgerEntryItem`. |
| 33 | `33_order_desk_no_money.sql` | order-dept loses cost.view, reports.view (+ asserts no money perms); accountant keeps customers.manage. |
| 34 | — | Not used. |

All four ran twice on `advpos_b` with no change on the second run.

## Trial balance (advpos_b, as of 27 Sep 2026)

| | Before (untouched copy) | After backfill (`post-missing`) | After demo data |
|---|---|---|---|
| Movement Dr = Cr | 5,499,675.00 | 6,047,431.60 | 6,312,306.60 |
| 1130 AR Dr / Cr | 1,596,400.00 / 1,310,350.00 | 2,043,155.69 / 1,411,350.91 | 2,084,240.69 / 1,502,640.91 |
| 4001 Sale Cr | 1,325,894.90 | 1,712,401.70 | 1,752,866.70 |
| 4002 Sales Returns Dr | 0 | 55,085.49 | 57,805.49 (Cr 620 reversal) |
| 2110 Output tax Dr / Cr | 0 / 239,705.10 | 9,934.51 / 299,953.99 | same |
| 1101 Cash Dr | 118,950.00 | 153,730.49 | 222,300.49 |
| Invoices posted | 12 of 39 | 39 of 39 | 44 of 44 |
| Returns posted | 0 of 5 live | 5 of 5 | 6 of 6 (1 more rejected + reversed) |

Posted movement balances at every step. The opening balances' 51,256,709.00 imbalance is the known seeded-data issue (D6), unchanged. Backfill run twice: second run posted 0.

## Owner's manual steps (in order)

1. Take a Neon snapshot.
2. Run `30_ledger_accounts.sql`, `31_staff_ledgers.sql`, `32_ledger_entry_items.sql`, `33_order_desk_no_money.sql` on live.
3. Deploy the API, then the web (Vercel).
4. Everyone signs out and in (permissions ride in the 8-hour token; order-dept loses cost.view/reports.view).
5. As Super Admin open **Money → Customer Ledgers** and press **Post them now** once (it is idempotent). Check the trial balance: movement must still balance.
6. Set each staff member's monthly salary (Staff Ledgers → person → Edit), then **Salary run** per month.
7. Give Faysal Bank (1113) its real opening balance at Account List if it had one.
8. When the old-system file arrives: Customer Ledgers → Import → download template → fill → upload → import.

## Found and not changed

- **Merge overlap with session A**: `SalesController.Lookups` (costPrice/dutyPrice zeroed for order-dept), `InventoryController` stock-levels/adjustment/lookups (cost zeroed for order-dept), `ProductHistoryController` (one attribute line). If A hid cost there for the accountant too, keep both conditions.
- Order-dept still sees **order and invoice totals** (sale values, like Packing) on Orders, Sale Invoices, bills and the order-dept dashboard; paid/balance/limit are zeroed. Notifications sent to order-dept (order created, return raised/decided) still quote PKR amounts in their text.
- `AccountingController` `UpdateJournalEntry`/`DeleteJournalEntry`/`ReverseJournalEntry` can touch the system entries of invoices/returns like any other entry; nothing marks them as system-owned.
- A customer that is also a supplier (VZ-B-0001) shows its supplier-side opening balance (−145,000) on the customer ledger, because `Party.OpeningBalance` is one figure.
- `Account 1130` opening (18,400,000) is not the sum of the customers' `Party.OpeningBalance`; the customer ledgers use the latter.
- `/sales/lookups` still serves the whole catalogue with stock sums (heavy); the desk's own form uses the lighter `/packing/order-lookups`.
- `report-toolbar.tsx` opens `/api/.../pdf` with `window.open` (HANDOFF trap 14); the ledger pages do not use it.
- Real customer names/figures from the four sample PDFs are not in the repo; local demo data uses invented names.

## Test evidence

**API per role** (`advpos_b`, minted tokens; `od` = order-dept Bilal, `acc` = accountant Hassan, `sales` = Sara, `sa` = Umer):

| Endpoint | od | acc | sales | sa |
|---|---|---|---|---|
| GET accounting/vouchers | 403 | 200 | 403 | 200 |
| GET accounting/collections | 403 | 200 | 403 | 200 |
| GET accounting/ledger?accountId=10 | 403 | 200 | 403 | 200 |
| GET ledgers/customers | 403 | 200 | 403 | 200 |
| GET ledgers/staff | 403 | 200 | 403 | 200 |
| GET parties/15/statement | 403 | 200 | 200 | 200 |
| GET reports/sales-summary | 403 | 200 | 200 | 200 |
| GET reports/aging/customer | 403 | 200 | 200 | 200 |
| GET reports | 403 | 200 | 200 | 200 |
| GET documents/voucher/4/pdf | 403 | 200 | 200 | 200 |
| POST delivery/1/settle-cod | 403 | 400 (no COD) | 403 | 400 |
| GET purchases/orders | 403 | 200 | 403 | 200 |
| GET inventory/products | 403 | 200 | 403 | 200 |
| GET packing/recent | 200 | 403 | 403 | 200 |
| GET inventory/stock-levels | 200 (cost 0) | 200 | 403 | 200 |
| GET inventory/products/1/history | 200 (no purchasing, money 0) | 200 | 403 | 200 |
| GET inventory/products/1/history/export | 403 | 200 | 403 | 200 |

Also: `/parties` as od → limit and balance 0; `/sales/orders/56` as od → creditLimit, outstanding, paid, balance 0, paymentStatus null.

**Order desk order** (od): no salesperson → 400 "Pick the salesperson…"; rate 1,100 on a 980 item → 400 "highest price is 1078.00"; a non-sales user as rep → 400; valid → ORD-26-0175 with SalesPersonUserId = Sara, CreatedBy = Bilal.

**Demo data** (local only, through the API): 3 customers opened by the accountant (quick form), 4 orders (2 Sara, 1 Zara, 1 keyed by the desk for Sara), confirmed by SA, invoiced by accounts (each posted), a Faysal Bank receipt voucher and a cash voucher, seed collection COL-26-0088 confirmed (→ RV + entry), a return (posted), a second return rejected (→ mirror reversal), two manual ledger rows (one with an item), a walk-in counter sale paid cash (sale + payment in one entry), an Invoiced/Edit correction (entry rewritten to 16,950), a driver and a helper without logins, August salary run (3 people; second run posted nothing), advance from Faysal, cash payment, deduction; wrong-side row refused; removing a category in use refused ("Driver is used by 1 person…", "Retailer is used by 13 accounts…"). Import: template round-trips; a 7-row sheet → 4 ready, 3 refused (duplicate code in file, unknown category + bad number, code in use), 1 warning (no code/category); commit created 4; re-commit refused whole.

**PDFs**: customer statements (VZ-C-0018 with items, VZ-C-0004 with a reversed receipt) and staff statement ST-0001 rendered via `GET …/statement/pdf` and checked visually; archived via `POST` to the test Cloudinary folder `advpos-localtest/b-ledgers/documents/statements` (DocumentFile rows `customer-ledger 55:2026-09-01:2026-09-27`, `staff-ledger 13:2026-08-01:2026-09-27`, both deliverable).

**Browser** (headless Chromium via Playwright on `http://127.0.0.2:3002`, desktop 1366 and 375 px): accountant — Customer Ledgers, statement, import, Staff Ledgers, staff statement; order-dept — Packing (week list), read-only order, new order, customers, customer detail, `/ledgers/customers` → `/forbidden`, `/sales/orders/new` → `/packing/new-order`. **No horizontal overflow at 375 px and no console errors on any of them.** Interactive: desk new order customer-first set the salesperson to Sara, a typed 15 % margin clamped to 10, submitted ORD-26-0181 at 313.50 (= 285 × 1.10); accountant `+` row with a catalogue item: 3 × 480 → 1,440 filled and posted. (The Claude browser pane blocks cross-port API calls from the page, so Playwright was used instead.)

**Gate**: backend `dotnet build` 0 errors (6 old warnings); `npx tsc --noEmit` clean; `npx eslint src` 0 errors (59 old warnings).
