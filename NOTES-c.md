# Session C — daily expense sheets (26 Sep 2026)

## OWNER MUST SEE

1. **EXP-26-0029 (SSGC, PKR 7,800, 2 Sep) is counted in the expense reports but not in the ledger.** Its entry JV-26-0188 was reversed from the Journal Entries screen on 15 Sep (JV-26-0189), and the expense itself was left reading POSTED. So the expense report and the P&L disagree by 7,800 for September. After migration 35 it is day sheet **EXS-26-0009** (approved). Fix, 10 seconds: open that sheet, press **Reverse** — no new entry is written (the ledger is already right), the sheet and the expense just become Reversed. That route is now the only one: reversing a sheet's entry from Journal Entries is refused.
2. **EXP-26-0026 (K-Electric, PKR 4,500, 30 Aug, draft) is booked to Owner Capital (3001), not an expense head.** Approving it would have debited your equity and called it an expense. Its sheet (**EXS-26-0007**) now refuses approval until a real head is picked in the grid. (Its twin EXP-26-0027 was also booked to Owner Capital; it was reversed, so it does nothing.)

## What was built

**Owner's request:** one expense invoice per day instead of one per expense; open a date, type as many expenses as the day had in Excel-like boxes, Print at the top.

| | |
|---|---|
| **One sheet per date per location** | `ExpenseSheet` table (migration 35). Number from a new `EXS` series (EXS-26-0001). Status DRAFT → POSTED (shown as *Approved*) → REVERSED. Every line is still an `Expense` row (all reports read those) with a new `SheetId`; a line's status always follows its sheet. One standing sheet per day+location (partial unique index; a reversed sheet does not block the day). |
| **Entering** | `perm:expenses.manage` (Accountant, Super Admin today). Location defaults to the user's primary place; the picker offers the places they work at (`UserLocation` + primary; Super Admin: all). Claim Stock excluded (no cash drawer). Past dates allowed (yesterday's petty cash), future dates refused, closed months refused. |
| **Approving / reversing** | `Accountant` policy — the same one the old per-expense approve/reverse used. One click posts **one journal entry**: a debit per line to its head, one credit per paid-from account (JV, type EXPENSE, reference = sheet no). Every line gets `EntryId` + POSTED, so the expense report, month-on-month report, nightly insights, AI summary and the P&L all agree. Reverse: one mirror entry over every still-standing entry behind the day, originals keep POSTED + `ReversedByEntryId` (same rule as every other reversal here), sheet and lines REVERSED. Dated on the sheet's own day if that month is open, else today. **Re-enter day** copies a reversed day into a fresh draft. |
| **Grid** | Head · Description · Vendor (suggests vendors on file) · Paid from · Method (auto from the account, changeable — the column is NOT NULL) · Amount. Tab/Enter move cell to cell and on to the next row, Shift+Enter back, ↑/↓ between rows, a spare row always waits at the bottom, any row deletable, row checked when the cursor leaves it, server errors land under the row and cell, Ctrl+S saves the whole sheet in one PUT. Same DOM reflows into stacked cards below `md`; total pinned to the bottom on a phone. No horizontal scroll at 375 px. |
| **The day's invoice** | New document kind `expense-sheet`, archived like every other (on save, approve, reverse). Own renderer in the sales-invoice palette: date (with weekday), location, sheet no and status in the heading; three figure tiles; draft / reversed ribbon; the lines (head + code, description, vendor, paid from + method, amount; a pre-sheet line reversed on its own is struck through and left out); totals by paid-from account with share bars; grand total in words; "where the money went" by head when it fits; Prepared by / Approved by / Received signature lines; Page X of Y. Print + Download at the top of the sheet page save unsaved typing first, then open the stored file. |
| **Pages** | `/accounting/expenses` = list of day sheets (date, location, lines, total, status) with status/location/date-range/search filters, totals over the whole filter, *Open a date*, *Export lines* (old xlsx). `/new` opens today's sheet (or the one already open). `/sheets/[id]` = the grid. Old `/accounting/expenses/[id]` = read-only history + "Open the day sheet" (notifications link there). |

### Files

Backend (`feat/c-expenses`):
- `database/35_expense_sheets.sql` — new
- `Controllers/ExpenseSheetsController.cs` — new: list, lookups, open, get, save (PUT), approve, reverse, reenter, delete
- `Documents/ExpenseSheetPdf.cs` — new: reader + renderer
- `Models/ExpenseSheet.cs`, `Models/Expense.Custom.cs`, `Models/AppDbContext.Expenses.cs` — new, annotations only
- `Documents/DocumentBuilder.cs` — one kind + one `case` (append)
- `Documents/DocumentPdf.cs` — optional last parameter `Renderer` on `Data`; `Render` calls it when set (so archive, Print/Download, share link and Document Store needed no change)
- `Controllers/AccountingController.cs` — expense section only: `CreateExpense` retired (400 pointing to the sheet — an expense with no sheet would appear on no invoice); edit/delete/approve/reverse of a sheet line refused; list/detail return `sheetId`/`sheetNo`; `ReverseJournalEntry` refuses an entry a sheet posted (that is how EXP-26-0029 went wrong)

Frontend (`feat/c-expenses`), all under `vizo-erp/src/app/(app)/accounting/expenses/`:
- `page.tsx` (rewritten), `new/page.tsx` (rewritten), `[id]/page.tsx` (read-only), `sheets/[id]/page.tsx` (new), `_components/expense-grid.tsx` (new)
- `nav-config.ts`, `proxy.ts`, `document-actions.tsx` untouched.

## Migrations

**35_expense_sheets.sql** — applied to `advpos_c` only, **NOT run on live**. Idempotent (ran twice here, second run no-op). Creates `ExpenseSheet`, `Expense.SheetId` (+FK, index), series `expense.sheet`/`EXS`, then files every expense into a sheet by date+location in date order, winds the counter past what it used, and refuses to commit if any expense is left without a sheet. Existing journal entries untouched. On the 26 Sep copy: 10 expenses → 9 sheets (EXS-26-0001…0009), 7 approved, 2 draft (30 Apr Karachi Order Dept; 30 Aug Karachi Warehouse). Rollback SQL is at the foot of the file.

## Owner's manual steps (live)

1. **Run `35_expense_sheets.sql` on Neon first**, then deploy the API, then the frontend. The new API reads `Expense.SheetId` in every expense query, so the new API against the old database fails; the old API against the new database is fine.
2. **Run 35 once more after the API deploy.** Anything the old API created in between gets filed; everything already filed is left alone.
3. Do the two items under OWNER MUST SEE.
4. Tell the accountant: Expenses opens a list of days; *New — today* opens today's sheet; *Approve day* posts the whole day.
5. Nobody needs to sign out — no permission changed.

## Found, not changed

- `proxy.ts` lets only super-admin/accountant into `/accounting`. Granting `expenses.manage` to another role at Setup would pass the API but not the page. Left as is (shared file, and the owner has not asked for it).
- The accountant dashboard's "draft expenses" count (`ReportsController`) counts lines, not days. Its "Review" link lands on the day list filtered to drafts, which is right.
- Nadia Hussain works only at Karachi Order Department, so she can open sheets only there (she can still view and approve every sheet). If she should enter Shop 2's day, add Shop 2 to her places at Setup › Users.
- Future dates are refused on sheets; past dates are allowed. This deliberately differs from the no-past-dates rule on the other entry forms (D2): a day sheet is usually typed after the day.
- `NextNumber` is still not atomic (existing D6); two sheets opened in the same instant for the same day are resolved by the unique index (the loser is handed the winner's sheet, one EXS number is skipped).
- An opened-but-never-typed day stays as an empty draft (0 lines) until deleted from its page.
- Test PDFs from this session went to the real Cloudinary PDFs account, folders `advpos/test-c-expenses/` (first hour) and `advpos-localtest/c-expenses/`. Safe to delete both.
- Early browser tests ran on `localhost:3003` and set the `advpos_*` cookies on `localhost` and briefly on `127.0.0.1` before the per-host rule arrived; later runs used a headless Playwright browser with its own cookie jar.

## Test evidence (local `advpos_c`, API :7183, Next :3003)

All through the real API with minted tokens (accountant Hassan Raza; order-dept Bilal Ahmed for refusals). The API was confirmed to be on the local DB by the migration-35 sheets it returned, which exist nowhere else.

- **Create:** opened today (27 Sep, Pakistan) for Karachi Warehouse → EXS-26-0010. Saved 6 lines, then edited one amount, deleted one line and added two → 7 lines over **Cash on Hand (4 lines, 7,200.50)** and **HBL Bank (3 lines, 25,300.00)** = **32,500.50**. New line numbers carried on (-07, -08; the deleted -06 was not reused). Opening the same day again returned the same sheet. Refused: a future date, Claim Stock, a row with no vendor and 0 amount, a row with the head and paid-from swapped — each answered with row + field.
- **Approve:** order-dept → 403. Accountant → **JV-26-0190**, 9 lines (7 debits, 2 credits). Trial balance movement **5,532,175.50 = 5,532,175.50** (was 5,499,675.00 both sides; +32,500.50). Per account: 1101 credit +7,200.50, 1110 credit +25,300.00, seven expense heads debited by exactly their lines. Cash on Hand ledger for the day: one line, JV-26-0190, credit 7,200.50. P&L Sept expense 0 → 32,500.50, heads match the lines. Expense list (POSTED, Sept) = 40,300.50 = 32,500.50 + the 7,800 of EXP-26-0029 (item 1 above). Approving twice, saving after approval → refused.
- **Reverse:** JE reversal of JV-26-0190 from Journal Entries → refused, pointing at the sheet; single-expense reverse/create → refused. Sheet reverse without a reason → refused; order-dept → 403; accountant → **JV-26-0191**. Every trial-balance account back to its pre-approval balance (diff list empty), movement still balanced (5,564,676.00 both sides), P&L Sept expense back to 0, all 7 lines REVERSED.
- **Re-enter:** refused while a standing sheet existed for the day; after deleting that empty draft → EXS-26-0012 with the 7 lines copied, petrol corrected, approved as JV-26-0192 (32,250.50).
- **Legacy:** EXS-26-0007 approve refused (Owner Capital line). EXS-26-0009 reversed with no mirror written (its entry was already reversed) — the pattern for OWNER MUST SEE item 1.
- **PDF:** `GET /documents/expense-sheet/{id}/pdf` for an approved 7-line day (1 page), a reversed day (reversed ribbon, 2 pages), a draft legacy day with a struck-through line (1 page), and a 34-line Shop 2 day (3 pages, continuation heads, Page X of Y). All archived to the document store (`/documents/expense-sheet/10/file` → stored, deliverable).
- **Browser, desktop 1400×900:** list page; EXS-26-0007 grid: typed a new row with Enter moving description → vendor → paid from → method → amount → next row's head, "1,250.755" cleaned to 1250.75, a spare row appeared, head picked by typing its code; unfinished row showed "Pick an expense head" under it; the Owner Capital line showed "— change this" and was corrected; Ctrl+S saved; *Approve day* → JV-26-0193 and the page switched to read-only; Print resolved the stored Cloudinary file (the pane blocks popups, so it was not displayed).
- **Browser, 375 px:** list and sheet pages (34-line draft and approved) — `document.scrollWidth` = 375 on every page, cards stacked, total pinned to the bottom. Confirmed again headless (Playwright) at 375 and 1440 after the last changes.
- **Gate:** backend build 0 errors (6 old warnings); `tsc --noEmit` clean; `eslint src` 0 errors, 58 warnings (all pre-existing).
