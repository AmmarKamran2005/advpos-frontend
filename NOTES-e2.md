# NOTES — session E2 (operations & reports), 27 Sep 2026

Branch `feat/e2-ops` in both repos, built on `feat/d-collections`. **Not pushed, not merged.**
Tested on the local copy `advpos_e2` only (live 26 Sep + 26, 30–33, 35, 36, then 39). Nothing ran on Neon.

## OWNER MUST SEE

1. **Karachi hand-deliveries can only be confirmed by the Super Admin.** The "Karachi – own team"
   channel names the **sales rep** as its confirmer (`DeliveryChannel.ConfirmedByRoleId`). But reps
   have no Delivery screen, and the API refuses them on `/delivery` (BackOffice).
   - Example: DLV-26-0221 (Eden Mobile Hyderabad, Own Rider) shows "Mark delivered" to nobody except the Super Admin.
   - Decide one of these:
     - (a) give reps a "delivered" button on their own orders, which is a small endpoint; or
     - (b) make the order desk the confirmer of that channel (one row at /admin/couriers).
2. **The order desk no longer types the COD when it books a courier.** This follows the no-money rule.
   - The server charges the order's unpaid balance, or nothing when the order is on credit. The desk only sees "Collect cash" or "Nothing to collect".
   - Example: ORD-26-0170 was booked by the desk as DLV-26-0223, and COD 5,097.60 was set by the server.
   - If a rider must be told the amount, it comes from accounts, or is printed on the bill.
3. **DLV-26-0220 carries a COD of 58,648 against an invoice of 2,183.05** (ORD-26-0162). Settling it is
   refused, because it would credit the customer 56k more than he owes. There is no screen to edit a
   booked delivery's COD. Correct it in the database, or cancel and re-book it.
4. **Sales by Salesperson shows the D5 problem plainly.** Customers are still assigned to Bilal Ahmed
   (Order Department, 5 customers, 1.25M owed) and Hassan Raza (Accountant, 4 customers). The row shows
   the role so these can be found.
   - "Send Reminders" sends each customer's reminder to whoever is assigned to him. Today some of those people are not salespeople.
   - Fix the assignments at People → Customers.
5. **Run `39_visits_and_delivery_confirmation.sql` before the new API.** The API reads its columns, and
   Delivery and Visits answer 500 without them. Everyone signs in again afterwards, because Sales gains
   `visits.view`.

## What was asked, and what was built

### 1. Delivery (`/delivery`)

**Book Delivery** opens the same booking form `/dispatch` uses, over a picker of dispatched orders that
have no courier yet.
- **Why this and not a redirect:**
  - Booking already existed (`POST /dispatch/{id}/dispatch`). Sending people to another screen loses their place.
  - A second form would drift from the first. So the form moved to `components/delivery/dispatch-sheet.tsx` and both screens use it.
- `/dispatch?order=<id>` also opens straight onto that order.
- Shown to the Super Admin and the order desk only. The accountant is refused on `/dispatch` by the API.

**The banner** "Draft screen — needs your confirmation" is gone.

**The cards** are counted by the API:
- On the way.
- COD not yet settled. For the desk this card becomes "To confirm".
- **Delivered in <this month>**, by `DeliveredDate`. It used to count the rows the browser had loaded.
- Need attention.

**Mark delivered** (`POST /delivery/{id}/confirm`):
- Asks for the date and who received the parcel. Both are required.
- The date cannot be in the future or before the booking date.
- The button only shows to the role that owns the channel (`canConfirm`), and the API enforces the same rule.
- The order moves from Dispatched to Delivered, with the same history line the order screen writes.
- The salesperson is notified.
- `ConfirmedByUserId` is now written as an Employee id. It threw for anyone without one (trap 2).

**Settle COD** (`POST /delivery/{id}/settle-cod`), for the Super Admin and the accountant only:
- **It used to flip a flag and post nothing.** Now, in one transaction:
  - a CONFIRMED collection (COL series), allocated to the order;
  - `LedgerPosting.PostCollectionAsync` posts it as a receipt voucher: **Dr** the bank or cash account of the method, **Cr 1130** for the customer, with the full COD, allocated to the invoice;
  - the courier's fee, if any: **Dr 5114 Delivery & Courier / Cr** the same bank.
- Both entries are balanced, and each is checked by `WriteEntryAsync`.
- Refused if:
  - the parcel is not delivered yet;
  - the order is already paid, or owes less than the COD;
  - the fee is at or above the COD;
  - a bank method has no reference;
  - the date is in the future or before delivery;
  - the caller has no staff record.
- The dialog shows both entries, and what the bank ends up holding, before the button is pressed.

**Detail sheet** per delivery shows the route, tracking link, arrival and who received it, and the COD
state with its receipt and voucher numbers.
- `/delivery/<id>` redirects to it. Every delivery notification pointed there and it was a 404.

**No money for the order desk:**
- COD, booking charge and pending COD are zero on `/delivery` and on `/dispatch`. The desk is sent `collectsCash` only.
- When the desk books, the COD is worked out on the server.

**Phones** get cards instead of the table.

### 2. AR Aging "Send Reminders"

- A dialog lists every customer who owes anything. Everyone past due is ticked to start with.
- **Send** calls `POST /reports/aging/customer/reminders`:
  - **each salesperson** gets one in-app + push message listing his customers, the amounts and the days late;
  - the **Super Admin and the accountant** get the summary (not the person who pressed the button);
  - **every customer is written to the activity log** (`PAYMENT_REMINDER_SENT`: amount, days, oldest invoice, who was told);
  - customers with no rep are named back.
- **WhatsApp** per row: a `wa.me` link built with `lib/whatsapp.ts`, the same approach as the bill share, in **English or Urdu** (the toggle is in the column header).
  - Opening it is logged (`WHATSAPP_REMINDER_OPENED`). The tab opens inside the click (trap 15).
- New `NotificationKinds.PaymentReminder`. It appears in everyone's notification settings.
- Ageing rows now carry the phone, the salesperson, the overdue part and how many days late it is.
- `asOf` defaults to the local date (trap 19).

### 3. Dead Stock "Plan Clearance": built, not removed

**Why a sheet:**
- A clearance is negotiated line by line with a few buyers.
- The price parts of an item (cost, duty, FS, M1, M2) are the Super Admin's to change.
- A sheet he can print, mark up and hand to a buyer is the useful tool. Re-pricing thirty items silently is not.

**What it does.** `POST /reports/dead-stock/clearance` returns an .xlsx. For every item with stock and
nothing sold in the window it gives:
- the sale price;
- the discount;
- a suggested clearance price in whole rupees;
- the value now and the value at clearance;
- a "Buyer / Note" column to fill in.

For the Super Admin only, the sheet adds:
- the cost and cost value;
- an "Against Cost" flag;
- an option to hold any line at cost.

Afterwards:
- The Super Admin is notified (`CLEARANCE_PLANNED`).
- The plan is logged.
- Catalogue prices are untouched.
- Open to the Super Admin and the accountant. The order desk does not see the button.

**Found alongside it:** Dead Stock and Slow Moving listed **every item's cost** to the accountant and
the order desk. They now value stock at cost for the Super Admin, at sale price for the accountant, and
not at all for the desk (`valuedAt`), the way Stock in Hand already does. The PDF follows the same rule.

### 4. The four "Not built" reports

All four have an endpoint, a page, Print, PDF, **Excel** and Save to store. They are on the menu, and
`proxy.ts` has rules for them.

**Sales by Salesperson** (`/reports/sales-by-rep`). Super Admin and accountant; a rep sees only his own row.
- Per rep:
  - orders taken and their value;
  - invoiced;
  - approved and posted returns;
  - net sales;
  - confirmed collections on his orders;
  - what his assigned customers owe at the end of the range, from the ledger;
  - visits.
- A "No salesperson" row holds counter sales, direct invoices and unassigned customers, so the totals add up to the business.

**Sales by Product** (`/reports/sales-by-product`):
- Per product and per category: units, returned units, sales, returns, net sales and average price.
- Filters: category and a search box.
- A rep sees only his own invoices.
- **Cost, profit and margin % are in the answer for the Super Admin only.** For everyone else they are absent, not zeroed; the PDF and the Excel file follow the same rule.

**Purchase Summary** (`/reports/purchase-summary`), **Super Admin only**:
- Covers POs in the range: by supplier, by item, and PO by PO.
- Each view shows units, goods at cost, discount, supplier total, **duty, FS, Margin 1, Margin 2** (from migration 26 on `PurchaseOrderItem`), and selling value.

**Supplier Ledger** (`/reports/supplier-ledger`), Super Admin and accountant:
- For one supplier: brought forward, bills (purchase invoices), payment vouchers (with the bills they pay), refunds, and any other posted **2101 line carrying the supplier as `PartyUserId`** (hand-written adjustments). A running balance in the payable sense (+ means we owe).
- It is read from the documents, not only from 2101, because 6 of the 8 older bills never posted. A ledger from the books alone would lose them.
- Bill lines (item × quantity × unit cost) go to the Super Admin only. The accountant gets totals, in the answer, the PDF and the Excel file.
- The supplier picker shows what is owed to each.

**Reports landing:** no "Not built" badges. Cards a role cannot open are left off.

**Report toolbar:** Print and PDF used `window.open` on an authorised API URL, which opened a 401 page
(trap 14). They now go through `printPdf` and `downloadPdf`. The fix applies to every report screen.

**Also found in the reports:**
- **Sales Summary, Top Customers and the /reports headline** showed cost, margin and stock at cost to the accountant and to sales.
- For anyone but the Super Admin these figures are now zero with `showsCost: false`. The pages and PDFs leave them out, and stock is valued at sale price.

### 5. Customer visits

`Controllers/VisitsController.cs` (new) serves:
- `GET /visits`: paged and filtered, with summary cards counted on the server.
- `GET /visits/lookups`: the outcomes from the `VisitOutcome` table, the caller's customers, and the reps (for the Super Admin).
- `POST /visits`.

**Who sees and logs what:**
- A rep logs and sees only **his own customers' visits**: the customers he opened or was assigned, plus any visit he made himself.
- The Super Admin sees all visits, and can log one for a rep.
- The accountant and the desk can read visits but not log them.
- The old `GET /parties/visits` is rep-scoped too now.

**Logging a visit:**
- Time: up to 7 days back for a rep. It accepts a local time, or a UTC time which it converts.
- Outcome.
- Notes (up to 300 characters).
- Next follow-up: required when the outcome is Followup, and not before the visit.
- Optional GPS with the phone's accuracy. A rough fix is marked as such.
- `LoggedAt` is stored, so a visit logged late can be flagged.

**The form** (`components/parties/log-visit-sheet.tsx`) is built for a phone:
- big outcome buttons;
- one tap to add location;
- a customer search.

It opens from the Visits page and from a customer's Visits tab. The list pages on the server, and each
row has a map link and a call link.

## Files

**Backend** (`backend/`):
- `database/39_visits_and_delivery_confirmation.sql` (new)
- `Models/Delivery.Custom.cs` (new)
- `Models/CustomerVisit.Custom.cs` (new)
- `Controllers/VisitsController.cs` (new)
- `Controllers/SalesReportsController.cs` (new): sales-by-rep, sales-by-product, reminders, WhatsApp log, clearance
- `Controllers/PurchaseReportsController.cs` (new): purchase-summary, supplier-ledger
- `Services/ReportKit.cs` (new)
- Changed:
  - `Controllers/DeliveryController.cs`
  - `Controllers/DispatchController.cs`
  - `Controllers/PartiesController.cs` (visits scope)
  - `Controllers/ReportsController.cs` (ageing fields; cost rule on dead stock, slow moving, sales summary, top customers and the index)
  - `Services/NotificationKinds.cs`
- None of Talha's five files was touched. No DbSet was needed.

**Frontend** (`vizo-erp/`):
- New:
  - `components/delivery/*`: dispatch-sheet, book-delivery, confirm-delivery-dialog, settle-cod-dialog, delivery-types
  - `app/(app)/delivery/[id]/page.tsx`
  - `components/parties/log-visit-sheet.tsx`
  - `components/widgets/send-reminders-dialog.tsx`
  - `components/widgets/clearance-dialog.tsx`
  - `components/widgets/report-bits.tsx`
  - `app/(app)/reports/{sales-by-rep,sales-by-product,purchase-summary,supplier-ledger}/page.tsx`
- Changed:
  - the delivery, dispatch, visits and party-detail pages
  - the aging customer, dead stock, slow moving, sales summary, top customers and reports landing pages
  - `components/widgets/report-toolbar.tsx`
  - `lib/whatsapp.ts` (`overdueMessage`)
  - `lib/nav-config.ts` (4 menu items)
  - `proxy.ts` (4 rules)

## Migrations

`39_visits_and_delivery_confirmation.sql`: applied to `advpos_e2` twice. The second run changed nothing.
It adds:
- `CustomerVisit`: `NextFollowUpDate`, `LoggedAt`, `GpsAccuracyM` (with a check) and two indexes.
- `RolePermission`: Sales gains `visits.view`.
- `Delivery`: `ReceivedBy` and `ConfirmedAt`.
- `Delivery`: `CodCollectionId` (FK to Collection, SET NULL), `CodSettledOn`, `CodFeeAmount` (with a check) and `CodFeeEntryId` (FK to JournalEntry, SET NULL).

Migration 40 was not needed.

## Owner steps

1. Run 39 before deploying the API (changa.txt §G, after 36).
2. Everyone signs out and back in (Sales gains `visits.view`).
3. See OWNER MUST SEE, points 1 to 4.

## Found and not changed

**Deliveries:**
- No screen moves a delivery to IN_TRANSIT, OUT_FOR_DELIVERY, FAILED or RETURNED. Only Booked → Delivered is real.
- Marking an order Delivered on the order screen does not confirm its Delivery row. The reverse now works.
- DLV-26-0212 (24,600) was seeded as COD-settled with no collection or voucher behind it. It was left as it was.

**Reports and cost:**
- `GET /reports/aging/customer` and `/reports/recovery-priority` are open to the sales role for **all** customers, not only his own. The menu hides them from reps (`reports.full`); the API does not.
- The AI endpoints (`margin-watch`, `dead-stock/advice`, `month-end-summary`, `sales-drop`) still give margins to the accountant and sales. They belong to the AI feature, and were left for a decision.

**Supplier data:**
- 6 of the 8 older purchase invoices have no journal entry, so 2101 in the books understates what is owed.
- Purchase returns are not in the supplier ledger. The screen was removed on 23 Sep, and there are no rows.

**Browser downloads:**
- The browser cannot read `Content-Disposition`, because CORS does not expose it and `Program.cs` is Talha's. So Excel downloads use the fallback name, for example "Sales by Salesperson.xlsx".
- The report toolbar's date presets still use `toISOString` (UTC dates).

## Test evidence (advpos_e2, API on 7187/5287, web on http://127.0.0.3:3007)

**API by role** (a token minted per role; codes are admin / accountant / order-dept / sales):

| Endpoint | Admin | Accountant | Order desk | Sales |
|---|---|---|---|---|
| `/delivery` | 200 | 200 | 200 | 403 |
| `/delivery/settle-methods` | 200 | 200 | 403 | 403 |
| `/dispatch` | 200 | 403 | 200 | 403 |
| `/visits` and `/visits/lookups` | 200 | 200 | 200 | 200 |
| `/reports/sales-by-rep` and `sales-by-product` | 200 | 200 | 403 | 200 |
| `/reports/purchase-summary` | 200 | 403 | 403 | 403 |
| `/reports/supplier-ledger` | 200 | 200 | 403 | 403 |
| POST settle-cod, reminders, clearance | allowed | allowed | 403 | 403 |

**Books:**
- Settling DLV-26-0216 (COD 84,500, fee 1,690) gave COL-26-0092, RV-26-0518 (Dr 1110 84,500 / Cr 1130 party 13) and JV-26-0227 (Dr 5114 1,690 / Cr 1110).
- Posted totals went from 6,333,231.60 to 6,419,421.60 on both sides, still balanced.
- ORD-26-0089 was then paid in full. A second settle was refused.
- Also refused, as expected: settling before delivery; a fee of 90,000; a missing bank reference; the desk (403); DLV-26-0220 (COD larger than the invoice).

**Confirm:**
- DLV-26-0216 was confirmed by the desk, received by "Rashid (shop manager)". ORD-26-0089 became DELIVERED, with the history line.
- Also refused, as expected: no receiver; a future date; the accountant on a cargo route (403).
- In the browser, the desk marked DLV-26-0220 delivered and the accountant settled DLV-26-0222 in cash, giving COL-26-0093 and RV-26-0519.

**Book Delivery:** at 375 px, the desk booked ORD-26-0170 through the Delivery screen's picker as DLV-26-0223. The COD of 5,097.60 was set by the server; the desk saw no PKR anywhere.

**Visits:**
- Refused, as expected: another rep's customer (403); a follow-up with no date; more than 7 days back; half a GPS pair; a future time; the accountant (403).
- Sara logged a visit from a 375 px phone with GPS (±25 m).
- The Super Admin logged one for Sara from Mobilink Connect's page.
- Zara sees 0 of Sara's visits.

**Reports:**
- Figures checked against SQL:
  - Purchase Summary for a test PO of 20 × (500 + 50 + 25 + 75 + 10) showed duty 1,000, FS 500, M1 1,500, M2 200 and selling value exactly as posted.
  - The supplier ledger for Pak Accessories: B/F 320,000, payment 320,000, bills 320,000 + 10,000, closing 330,000.
- Cost and profit are absent from the accountant's and the rep's answers, PDFs and Excel files (checked in the extracted PDF text).
- The Super Admin gets cost, profit and bill lines.

**Reminders and clearance:**
- Send Reminders: 6 customers, PKR 304,431 overdue, 5 notifications, 6 `PAYMENT_REMINDER_SENT` rows.
- The Urdu WhatsApp link opened `wa.me/923211234567` with the message, and was logged.
- The clearance sheet for the Super Admin has Cost, Cost Value and Against Cost columns. The accountant's has none. The Super Admin was notified.

**Browser** (Playwright with Asia/Karachi time, desktop 1366 and 375 px):
- Delivery, Dispatch, Visits, the party Visits tab, AR Aging, Dead Stock, the Reports landing and all four new reports have **no horizontal scroll at 375 px**, and there were no console errors.
- The proxy sends the desk to `/forbidden` on sales reports, the accountant on Purchase Summary, and a rep on the Supplier Ledger.

**Gate:**
- Backend `dotnet build`: 0 errors, 0 warnings.
- `npx tsc --noEmit`: clean.
- `npx eslint src`: 0 errors, 46 warnings (all older; none new).
