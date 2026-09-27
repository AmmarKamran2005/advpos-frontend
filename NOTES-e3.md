# Session E3 — the app shell and the lookups, from the database

27 Sep 2026. Branch `feat/e3-shell` (both repos), from `feat/d-collections`. Tested on
`advpos_e3` (local copy: live 26 Sep + migrations 26, 30–33, 35, 36, and now 41).
**Nothing ran on live.** Not pushed, not merged.

## OWNER MUST SEE

1. **The Quick Create keys are now "N then a letter", not ⌘-letter.** The old hints (⌘O ⌘I ⌘P
   ⌘V ⌘C ⌘R) never worked, and they could not be made to work as printed: Ctrl+C / Ctrl+V are copy
   and paste, Ctrl+P prints, Ctrl+R reloads, Ctrl+O opens a file. Now: press **N**, let go, then
   **O** (new order), **I** (invoice), **P** (purchase order), **V** (money received),
   **C** (customer), **R** (item). They never fire while typing in a box or with a dialog open,
   and each person only gets the ones they may open. Example: a salesman gets N O and N C only.
2. **Bank Reconciliation is on the Money menu now** (it was only reachable from a link on a
   voucher). Accountant and Super Admin.
3. **The sidebar shows "VIZO Pakistan"** (the Company row, editable at Setup → Settings) instead
   of "AdvPOS". The browser tab title still says AdvPOS: that is the software's name.
4. **Sales-return quick reasons were left as they are.** There is no return-REASON table.
   `ReturnCondition` (Resalable / Damaged / Expired / Missing) exists, but the condition is set
   by the shelf the goods go back onto, so offering it again as a "reason" would contradict it.
   If you want the reasons managed, it needs a small table — say the word.

## What was built

### 1. Top bar and command palette
- **Search box** → opens the palette (also **Ctrl+K** and **/**; a search icon on phones).
- **Live search from the database**:
  - What it searches: customers (`/parties?type=customer`), orders (`/sales/orders`), invoices (`/sales/invoices`, walk-in included) and items (`/inventory/products`).
  - How: 250 ms debounce, 5 rows per group, results grouped, stale requests cancelled.
  - Rows from an older query are never shown, so Enter cannot open the wrong record.
  - Each row opens its detail page.
- **Roles**: a list the role has no view permission for is not asked. A 403 is remembered and
  skipped. No money and no cost appear in any row: name/number, city/SKU, status and date only.
- **Speed**: the palette (cmdk) is loaded with `next/dynamic` the first time it is opened. It used to be in the shell bundle.
  - It is opened through a window event, not a context, so the shell does not re-render.
- **Notifications**:
  - "You're all caught up" shows only when nothing is unread.
  - Times are shown in Pakistan time (`formatDateTime`). The old code added a `Z`, which showed them 5 hours off.
  - The panel fits a 375 px screen.
- **Quick Create** now comes from `lib/shortcuts.ts`:
  - It uses the `N`-letter keys and respects the role rules (e.g. purchase orders are for the Super Admin only).
  - It is hidden when the person can create nothing.
- **Shortcut sheet (`?`)** lists only keys that work:
  - Anywhere: Ctrl+K, /, ?
  - Create: this person's N-keys
  - Expense sheet: Enter, Shift+Enter, ↑/↓, Ctrl+S
  - Dialogs: Esc
  - Its data moved to `lib/shortcuts.ts`.

### 2. Lookups from the database
- **Delivery channels.** The orders list and order detail now show the channel's real name, sent by the API from `DeliveryChannel`.
  - The rep's "Delivered" button keys on the channel's `ConfirmedByRole = sales`, not on the word `local`.
  - The four hard-coded channels in `lib/app-config.ts` are deleted.
  - I did not use `/dispatch/lookups` on the orders page because it is order-desk only, and the salesman and the accountant read that page too. The name comes with each order instead.
- **Dispatch default channel.** The rule is now worked out on the server (`DispatchController.SuggestChannels`):
  1. The customer's city is the city of the place the goods left from → the by-hand channel (the one the salesman confirms).
  2. Otherwise → the channel that city was **last booked on** (by-hand excluded).
  3. Otherwise → the first courier channel.
  - The old rule was `order.city === "Karachi"`. It **never matched**, because cities are stored as "Karachi - Pakistan".
  - Also fixed: the sheet printed "repeat every **undefined** hours", because lookups did not send `remindEveryHours`.
- **Voucher types and statuses** come from `/accounting/lookups` (`voucherTypes`, `postingStatuses`). They load alongside the list and never hold it up.
- **Document Store** reads `GET /documents/store-info` (new):
  - The real folder (this copy: `advpos-localtest/e3-shell/documents`).
  - 25 kinds: `DocumentBuilder.Kinds` plus every kind stored. This includes sales returns, expense sheets, purchase vouchers, and the archived reports and statements.
- **Company name** from `GET /company/brand` (new, anonymous, name only). It is used in the sidebar, the sign-in footer and the Settings subtitle.
  - It is cached in localStorage and read through `useSyncExternalStore`, so the first paint never waits for it.
  - Saving at Settings updates the sidebar at once.

### 3. Broken links and dead buttons
- Order desk dashboard "Stock" → `/inventory/stock-levels`.
- GRN page breadcrumbs / back button → `/purchases/orders`.
- Parties **Import** → `/ledgers/customers/import`, shown to the Super Admin and the accountant only.

### 4. Bank reconciliation can be started and loaded
New `BankReconciliationController` (`api/accounting/reconciliation`, Accountant policy + `ledger.manage`):

| Endpoint | What |
|---|---|
| `GET bank-accounts` | Active postable **Cash & Bank** accounts from the chart, with last statement end / closing (prefills the form) |
| `POST` / `PUT {id}` / `DELETE {id}` | Start, correct, throw away a draft |
| `POST {id}/lines`, `DELETE {id}/lines/{lineId}` | One line by hand; remove an unmatched line |
| `GET import/template` | Date, Description, Reference, Deposit, Withdrawal |
| `POST {id}/import/preview` | .xlsx (`XlsxReader`) or .csv (new `Documents/CsvReader`) |
| `POST {id}/import/commit` | All or nothing, rechecked on the server |

- **What the import accepts:**
  - It finds the header row under a bank's preamble.
  - Columns are matched by name: Date / Txn Date / Value Date, Description / Particulars / Narration, Cheque No / Ref, and either Deposit + Withdrawal (Credit + Debit) or one Amount.
  - Amounts: `(1,000)`, `DR` / `CR` and `PKR`.
  - Dates: day first, or Excel serials.
  - Blank rows and totals rows are skipped.
- **What it refuses:**
  - A non-Cash & Bank account.
  - An end date in the future, or a period over 400 days.
  - A period that overlaps another statement of the same account.
  - Lines outside the period, and zero amounts.
- **Warnings** (such rows start unticked in the preview): a row already on the statement, or twice in the file.
- **Warning on start:** when the opening balance is not the last statement's closing balance.
- **Migration 41** `41_bank_statement_import.sql` adds `BankReconciliation.PeriodFrom` and `BankStatementLine.Reference`. Both are nullable and additive, safe before or after the deploy, and safe to run twice.
  - The detail endpoint now matches over the period ±7 days. The old rows keep the ±1 month window.
- **Screen:**
  - New, Import statement, Add line, Correct (pencil) and Delete draft.
  - An × on each unmatched line.
  - The period is shown in the picker and the header.
  - The dialogs load on first use.

### 5. Dead code deleted
- **Deleted files:**
  - `components/widgets/reminder-list.tsx`, `order-payment-card.tsx` and `order-delivery-card.tsx`.
  - `components/dialogs/record-payment-dialog.tsx` and `record-collection-dialog.tsx`, with `dialogs/index.ts` updated.
  - `data/` entirely: `accounting`, `admin`, `claims`, `collections`, `delivery`, `parties`, `products`, `purchases`, `reminders`, `sales`, `mock` and `settings`.
  - Nothing live imported any of them; only comments name them.
- `getChannel` / `deliveryChannels` / `activeChannels` removed from `lib/app-config.ts`, which keeps only `RoleKey`.
- The four `ConfirmDialog` imports went through the dialogs barrel. They now import the file directly (AGENTS rule 5).
- `ConfirmDialog` renders its description as a `<div>`. A paragraph inside Radix's `<p>` was a hydration error on the reconciliation screen.

## Files

**Backend** (`030297f`):
- New: `Controllers/BankReconciliationController.cs`, `CompanyBrandController.cs`, `DocumentStoreInfoController.cs`, `Documents/CsvReader.cs`, `Models/BankReconciliation.Custom.cs`, `Models/BankStatementLine.Custom.cs` and `database/41_bank_statement_import.sql`.
- Changed: `AccountingController.cs` (period and reference on reconciliation), `DispatchController.cs` and `SalesController.cs`.
- None of Talha's five files was touched.

**Frontend:**
- New: `lib/shortcuts.ts`, `lib/company.ts`, `components/layout/global-shortcuts.tsx` and `components/accounting/reconciliation-dialogs.tsx`.
- Changed: top-bar, command-palette, shortcut-sheet, app-shell, sidebar, `ui/command`, confirm-dialog, nav-config, app-config, and the pages for orders, order detail, dispatch, vouchers, admin/documents, admin/settings, login (one line), parties, GRN, reconciliation, and the order-desk dashboard.

## Owner steps
1. Run `41_bank_statement_import.sql` on live with the other pending migrations (any time; additive).
2. Deploy API + web together (the web reads `channelName`, `suggestedChannelId`, `/company/brand`, `/documents/store-info`).

## Found and not changed
- **Login page (E1's area):**
  - Privacy / Terms / Help are `href="#"`.
  - The four role cards hard-code names and e-mails (`PANELS`).
- **Dispatch sheet** shows order totals and COD to the order desk, which "sees no money" (E2's operations area). The COD is arguably needed to book a courier.
- **Dispatch page:** its `error` state is set but never rendered, so a failed load shows an empty queue.
- **Reconciliation matching** only offers ledger lines that are already posted. A bank charge on the statement needs an expense voucher posted before it can be matched. This is how it always worked.
- **Unused `eslint-disable` directives** in other files (warnings only, 39 total, 0 errors).

## Test evidence (`advpos_e3`, Playwright headless on 127.0.0.4:3008; the Browser pane blocks the API host)
- **Palette (Super Admin):**
  - "haf" gives Customers / Orders / Invoices.
  - "ORD-26-01" gives Orders only, and Enter opened `/sales/orders/54`.
  - "vizo" gives Products, and clicking one opened `/inventory/products/11`.
  - "zzqqxx" shows "Nothing found".
  - `/` opens the palette.
  - `N` `O` opened `/sales/orders/new`.
  - Typing "no" into the parties search box did not navigate.
- **Palette by role:**
  - Order desk: no products request is sent at all (pre-gated). Before the pre-gate it got one 403, which was then skipped.
  - Salesman: Quick Create shows O and C only, and `N P` does nothing.
- **Parties Import:** the salesman does not see it. The accountant does, and it goes to `/ledgers/customers/import`.
- **Bell:** with 20 unread, no "caught up". After read-all (salesman), it shows "caught up".
- **Vouchers:** the tabs are the 7 DB types and the statuses are the 6 DB statuses.
- **Document Store:** it shows the real folder and 25 kinds, including sales-return, expense-sheet and purchase-vouchers.
- **Orders list:** shows "Karachi - own team" and "Online courier". Order 4's detail shows its channel name.
- **Dispatch (desk):**
  - Lahore, Faisalabad and Rawalpindi from Karachi → Online courier.
  - Karachi customer from Karachi Order Dept → Karachi - own team.
  - No "undefined hours".
- **Reconciliation API:**
  - Refused as expected: a future end date, account 1130 (not Cash & Bank), and an overlap with HBL's statement ending 30 Apr.
  - The continuity warning fired on the wrong opening balance, and was corrected with PUT.
  - CSV with preamble and totals row, dd/MM and dd-MMM dates, and Withdrawal/Deposit columns: 6 lines valid, 2 errors (outside the period, bad date).
  - Committed 6. Previewing again warned "Already on this statement" on all 6.
  - xlsx with Excel date cells and a `87,200.00 CR` / `(12,500.00)` Amount column: 3 lines, which add up.
  - The template reads back correctly, and a .txt file is refused.
- **Reconciliation UI (accountant, 1366 and 375 px):**
  - New UBL reconciliation: the form was prefilled from 1 May at 640,000.
  - Imported meezan.xlsx: 3 lines, "It adds up".
  - Added and then removed a line.
  - Deleted the draft.
  - HBL Aug–Sep: auto-match matched 5; removed the bank-charge line; corrected the closing to 2,062,200; **finalised**. In the DB it is RECONCILED with 5 matched.
- **375 px:** no sideways scroll on dashboard, palette, vouchers, documents, orders, dispatch (sheet), reconciliation and its dialogs. Bell panel is 351 px wide.
- **Gates:**
  - Backend `dotnet build`: 0 errors, 0 warnings.
  - `tsc --noEmit`: clean.
  - `eslint src`: 0 errors (39 old warnings; 49 before).
  - `next build`: passes after all the deletions.
