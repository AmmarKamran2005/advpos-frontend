# AdvPOS — Handoff

**Written 2026-08-29.** Newest first. Each dated section is what actually
changed that day and what it cost, so you can stop reading once you reach
something you already know.

For the project itself — architecture, credentials, how to run — jump to
[§ Standing facts](#standing-facts) at the bottom. That part does not change
day to day.

---

## Where things stand right now

| | |
|---|---|
| **Frontend** | `AmmarKamran2005/advpos-frontend` @ `main` |
| **Backend** | `muhammadtalhabinsuhail/vizo-backend` @ `master`. Talha's last was `aa510f1` (2026-08-27). |
| **Database** | Neon PostgreSQL 18, Singapore. PascalCase columns. Real data, shared with Talha. Migrations **08**, **09** and **10** are applied. |
| **API** | 27 controllers. Every printable document in the system renders to PDF and uploads to Cloudinary. Every action wrapped in try/catch. |
| **Screens** | 99 pages. **91 on live data, 8 still on mock** — all eight are accounting forms. |
| **Gate** | `tsc` clean · eslint **0 errors, 67 warnings** (was 83) · `next build` **84 routes** |

### ⚠️ Read before touching ANY repo

**Talha pushes to BOTH repos, not just the backend.** Between 2026-08-26 and
2026-08-27 he pushed nine commits to the frontend and one to the backend.

**Always `git fetch` before staging — on the frontend as well as the backend.**
A `--force` here would delete a day of his work. Both remotes were unchanged
when this session pushed (`32fd4a2` / `aa510f1`).

---

## 2026-08-30 — every PDF in the system, and where they actually go

**The reported worry was that PDFs were being written into the backend folder.
They were not.** `GET /api/sales/invoices/16/pdf` is not a file path — it is the
API rendering the bill in memory and streaming it. Checked rather than asserted:

```bash
grep -rn "File.Write\|FileStream\|StreamWriter\|wwwroot\|Path.Combine" --include=*.cs backend/
find . -iname "*.pdf" -not -path "*/node_modules/*"
```

The first returns nothing. The second returns one file — the design document
that was already in the repo. Nothing in this project has ever written a PDF to
disk, and the six bills that existed were all in Cloudinary.

**The real gap was the opposite one: most documents were not PDFs at all.**

### What was actually there

| Screen | Its Print button |
|---|---|
| `purchases/orders/[id]`, `purchases/invoices/[id]`, `purchases/grns/[id]`, `purchases/returns/[id]` | `window.print()` |
| `inventory/adjustments/[id]`, `inventory/transfers/[id]` | `window.print()` |
| `parties/[id]/statement` | `window.print()` |
| `accounting/vouchers/[id]`, `accounting/journal-entries/[id]` | **no `onClick` at all** |
| `accounting/expenses/[id]` | `toast.info("Printing receipt…")` |
| All 13 screens using `report-toolbar` | Export → PDF / Excel / CSV, all three `toast.success("Exporting…")` and nothing else |

`window.print()` prints the *web page* — sidebar, buttons, filter chips, at
whatever width the window happens to be — and stores nothing anywhere. So of the
sixteen printable things in the admin panel, exactly one produced a real
document, and that was the sale invoice built the day before.

### What there is now

**Every one of them renders a real A4 PDF from the database and uploads to the
`CloudinaryPdfs` account.**

Ten business documents, six reports and five financial statements — twenty-one
document types, all through one renderer:

```
GET  /api/documents/{kind}/{id}/pdf     render + stream   (Print, Download)
POST /api/documents/{kind}/{id}/pdf     render + upload   (Save to store)
GET/POST /api/reports/{key}/pdf         the six reports
GET/POST /api/accounting/{key}/pdf      the five statements
GET  /api/documents                     the store, with every Cloudinary link
GET  /api/documents/open/{kind}/{key}?k=  anonymous share link
```

`Documents/DocumentPdf.cs` is the renderer. Column widths are **weights**, not
points — the caller says "description is worth 5 of these, qty 1" and the
renderer divides the page — so a three-column statement and an eight-column
ageing report both fill the page without either being hand-measured. The sale
invoice keeps its own renderer: it is the document a customer sees and the
client cares about its exact shape.

**Reports and statements cannot drift from their screens.** Each PDF endpoint
calls the *same action the browser calls* and reads its result, rather than
re-running a copy of the query. If the ageing buckets change, both change
together. A statement that quietly differs from the screen it was printed from
is the worst thing an accounting system can produce.

### Where the files go, and how to check

`10_document_files.sql` adds **`DocumentFile`** — one row per generated PDF,
keyed on `(DocKind, DocKey)`, so re-generating replaces the row instead of
piling up copies. Reports have no row to key off, so their key is a fingerprint
of the parameters they were run with.

New screen at **`/admin/documents`** (Setup → Document Store) lists every
generated PDF with its real Cloudinary URL, its size, who made it, and whether
that URL will actually serve the file. It exists so nobody has to take "the PDFs
go to Cloudinary" on trust.

### 🟢 Cloudinary now serves PDFs

Yesterday both accounts refused: the upload succeeded and every request to the
link answered `401 deny or ACL failure`. **That has been changed in the console
and PDF delivery is on.** Verified with no credentials:

```
GET https://res.cloudinary.com/dve3ucdo/raw/upload/.../PO-26-0042_omlulp.pdf
200  application/pdf  6846 bytes
```

The bills uploaded *before* the change now serve too, and the app switched over
on its own — `PdfStore` HEADs each URL after uploading and records the answer, so
the moment delivery worked it started handing out Cloudinary links instead of the
API fallback. **No code changed for that.** The fallback stays in place for the
next time an account is provisioned fresh.

`isDeliverable` is on every `DocumentFile` row, and `/admin/documents` shows the
count of anything not being served, so a regression here is visible rather than
silent.

### Verified end to end

All 21 archived to Cloudinary and re-fetched anonymously:

```
purchase-order PO-26-0042      purchase-invoice PI-26-0042
goods-receipt  GRN-26-0089     purchase-return  PR-26-0008
stock-adjustment ADJ-26-0034   stock-transfer   TRF-26-0014
voucher        VCH-26-0089     journal-entry    JE-26-1042
expense        EXP-26-0024     party-statement  VZ-C-0001
reports: sales-summary · aging-customer · aging-supplier ·
         dead-stock · slow-moving · top-customers
statements: trial-balance · balance-sheet · profit-loss ·
            cash-flow · ledger
```

Every one `deliverable=True`. Driven from the UI as well as curl: Save to store
on the Sales Summary screen, and the purchase-order screen correctly showing
**Saved** for a document already in the store.

### How to check the whole pipeline in two minutes

Three questions, three commands. None of them need the app open.

**1. Is anything being written to disk?** Both should come back empty (the one
`find` hit is the design document that was already in the repo).

```bash
grep -rn "File.Write\|FileStream\|StreamWriter\|wwwroot\|Path.Combine" --include=*.cs backend/
find . -iname "*.pdf" -not -path "*/node_modules/*"
```

**2. Where did the last documents actually go?** Open **Setup → Document Store**
in the app, or ask the database directly:

```bash
psql "$NEON_URL" -c 'SELECT "DocKind", "DocNo", "IsDeliverable", "PdfUrl"
                       FROM "DocumentFile" ORDER BY "GeneratedAt" DESC LIMIT 10;'
```

Every `PdfUrl` must start `https://res.cloudinary.com/dve3ucdo/raw/upload/advpos/documents/`.
Sale invoices are the exception — those keep their link on `SalesInvoice.PdfUrl`,
because there it is part of the invoice's identity rather than a stored artefact.

**3. Will Cloudinary actually serve them?** Take any `PdfUrl` from above and
fetch it with no credentials at all:

```bash
curl -sL -o /dev/null -w "%{http_code} %{content_type} %{size_download}\n" "<PdfUrl>"
```

`200 application/pdf <bytes>` is right. **`401` means PDF delivery has been
turned off again** on the Cloudinary account — Settings → Security → Restricted
media types. The app keeps working when that happens (it falls back to serving
its own signed link) but `/admin/documents` will show a non-zero "Not being
served" count, which is the signal to go and look.

### Also fixed while in there

- **Page numbering was wrong on any document that overflowed.** A two-page
  balance sheet printed "Page 1 of 1" on its first page, because the footer was
  drawn while the page was being laid out and nobody yet knew a second page was
  coming. `PdfCanvas.SelectPage` lets the renderer go back and stamp the footers
  once the count is real.
- **The Excel and CSV export options are gone from the report toolbar.** Neither
  ever did anything, and there is no endpoint behind them. Leaving two dead
  options beside a working PDF makes the working one look dead too. `/sales/invoices`
  has a real CSV export if that pattern is wanted elsewhere.
- Two screens still use `window.print()` — `admin/audit-log` and
  `inventory/movements`. They are list screens rather than statements and have no
  PDF endpoint; the toolbar hides the PDF actions when it is not given a `doc`
  prop rather than offering an export that would produce nothing.

---

## 2026-08-29 (later) — the sales module, end to end

Ten screens, twelve new endpoints, two migrations, and a bill that is a real
PDF rather than a toast.

### What was actually wrong

Every one of these screens *looked* finished. That was the problem: the buttons
were there, they produced a toast, and nothing reached the database.

| Screen | What it did before |
|---|---|
| `sales/orders/new` | Read `@/data/parties` and `@/data/products`. Submit slept 800 ms and toasted **"Order ORD-26-0143 created"** — a number typed into the source. "Save as Draft" toasted and did nothing. |
| `sales/orders/[id]` | Rendered three hard-coded line items and a seven-entry activity feed claiming *"System emailed PO to supplier"* on every order in the system. Confirm / Pack / Dispatch / Cancel were toasts. |
| `sales/direct` | Frozen catalogue, **sales tax hard-coded at 18%**, "Take payment" toasted `INV-26-8869` and cleared the basket. Print and Send toasted. |
| `sales/invoices/new` | Frozen catalogue. Submit toasted `INV-26-0143`. |
| `sales/invoices/[id]` | Live, but the letterhead was a constant — **NTN 0123456-7, STRN 32-77-8901-234-56, phone 0300 7287607**. None of those are the company's real numbers. Under it sat 200 lines of the old mock version, commented out. |
| `sales/returns/new` | Whatever invoice you picked, you were offered the same three products from `SAMPLE_INVOICE_LINES`. |
| `sales/returns/[id]` | Two hard-coded lines. **Approve and Reject were toasts** — the reported "rejecting does not reject". |
| `sales/credit-holds` | The list was live; Override and Cancel did nothing at all. |
| Sidebar | "Limit Alerts" carried a **typed `3`**. The queue held one. |

### Two bugs underneath, both pre-existing

**1. Orders could not be created at all.** `CreateOrder` called
`NextNumber("SO")`. There is no `SO` series — the sales-order prefix is `ORD`.
`NextNumber` does not throw on a miss, it falls back to a timestamp, so orders
would have numbered `SO-20260829174238`.

**2. And once that was fixed, the insert threw `23505 duplicate key`.**
`DocumentSeries.NextNumber` for `ORD` said 143 while `SalesOrder` already held
`ORD-26-0144`. Same class of bug as the identity sequences in
`07_neon_sequence_reset.sql`, one layer up, and nobody had hit it because
nobody had ever successfully created an order. `GRN` (90 vs 90), `PR` (9 vs 10)
and `ADJ` (27 vs 35) were in the same state and would have failed the same way
on the first document created from those screens.

Fixed by **`09_document_series_catchup.sql`** — idempotent. **Re-run it after
any import that carries explicit document numbers**, for the same reason 07 has
to be re-run.

### The bill

`Documents/PdfCanvas.cs` + `Documents/InvoicePdf.cs` render a real A4 sales tax
invoice: navy and yellow letterhead, seller and buyer blocks, a line table,
totals, amount in words in lakh/crore, and a footer. Around 7 KB per bill,
paginating when the lines run over.

**There is no PDF library, on purpose.** Every printable-PDF package on NuGet
costs something this project should not pay — QuestPDF pulls SkiaSharp native
binaries and a revenue-tested licence, PDFsharp wants a font resolver per
platform, the HTML ones shell out to a headless browser. A bill is text, rules
and filled rectangles: about 200 lines of the PDF spec, written once, using the
two standard Helvetica faces so nothing is embedded and nothing needs keeping
current.

Every invoice raised anywhere — order, direct invoice, counter sale, credit
override — is rendered, pushed to the documents Cloudinary account and the link
stored on the row. If Cloudinary is unreachable the sale still completes: a
re-buildable PDF is not worth failing a sale where the cash is already in the
drawer and the stock has left the building.

### 🔴 Cloudinary will not serve a PDF, and the fix is one checkbox

Both configured accounts **refuse to deliver PDFs**. The upload succeeds, a
perfectly ordinary `secure_url` comes back, and every request to it answers
`401` with `x-cld-error: deny or ACL failure`.

Proved rather than guessed: the same bytes uploaded as `.txt` deliver `200`; as
`.pdf`, `401` — in both `raw` and `image` resource types, on **both** accounts
(`dve3ucdo` and `dzzuoem1w`). It is the default for Cloudinary accounts created
since 2023.

**The fix is in the Cloudinary console, not in this code:**

> Settings → Security → Restricted media types → allow **PDF and ZIP** delivery.

Until somebody ticks it the app does not hand a customer a broken link.
`PdfStore` HEADs the URL after uploading, and when it is not deliverable the API
gives out its own link instead:

```
GET /api/sales/bill/INV-26-8872?k=<hmac>        (anonymous)
```

`k` is an HMAC of the invoice number under the JWT signing secret, compared in
constant time. Unguessable, needs no new column, and rotating that secret
revokes every link at once — which is on the list anyway, because the secret is
committed to a public repo.

**The moment the checkbox is ticked, Cloudinary takes over automatically.**
Nothing in the code needs changing.

### WhatsApp

`lib/whatsapp.ts` is the one place that turns `0300 4567890`,
`+92 300 4567890`, `0092-300-4567890` and `3004567890` into the `923004567890`
that wa.me actually accepts.

`WhatsAppShareDialog` now opens the chat with the message already in it. It does
**not** send — the operator presses Send inside WhatsApp. Anything that goes to
a customer under the shop's name gets a person's eyes on it first.

Reachable from the counter receipt strip, the invoice screen, the invoice list,
the order screen, the walk-in list, and as **Remind** on Limit Alerts, which
composes a payment reminder carrying the outstanding balance, the limit, and the
order stuck behind it.

### Walk-in versus shop account

`SalesInvoice` gained `IsWalkIn` / `WalkInName` / `WalkInPhone`, plus a shared
`VZ-C-WALKIN` party — `CustomerUserId` is NOT NULL, so a cash sale still needs
one to hang off. Migration **`08_sales_documents.sql`**, applied.

- **Walk-in** → `/sales/direct/walkin`, server-paged and searchable, every row
  printable and shareable.
- **Existing shop** → an ordinary invoice in the Sale Invoices ledger.

Walk-ins are excluded from `/sales/invoices` by default (`?walkIn=true|all`
changes that). They never age and nobody chases them; mixing them in buries the
shop invoices that do need chasing.

### Sales tax is asked for now

The counter screen has a **Sales tax rate** field. It seeds from the catalogue
(`defaultTaxPercent` — the rate most items actually carry, currently 18) and the
operator can change it for the sale, with a one-click reset. It used to be the
literal `18` written into the markup, which made a change of rate a code change
and a redeploy.

Per-line tax on the order, invoice and return forms was already editable and
still is.

### Also fixed while in there

- **Money is rounded to the paisa on the way in.** A 5% discount on 390 came out
  `1626.885`; the database stored `1626.89` while the JSON already said
  `1626.885`, so the receipt on screen and the row in the ledger disagreed.
- **`/sales/direct` defaulted to "Claim Stock"** — damaged goods — because the
  location list was alphabetical. Locations now come back sellable-first, and
  the counter prefers the operator's own `primaryLocationId`.
- **The Export button on `/sales/invoices` did nothing.** It writes a CSV of
  what is on screen, filters and all.
- **Two more invented badges** removed from the sidebar: "Stock Received" `2`
  and "Confirm Collections" `2`. No endpoint backs either, and an invented count
  beside a real one makes the real one look invented too. The mechanism is
  generic now — `liveBadge: "creditHolds"` in `nav-config.ts`.
- `sales/invoices/[id]` and `sales/invoices/page.tsx` each carried the whole
  previous mock version commented out above the live one. Deleted.

### Test rows this session left in the live database

Real transactions through the app, kept because they demonstrate the features.
Safe to delete for a clean demo — but the counter sales moved stock, so correct
`StockBalance` if you delete those two.

| Doc | What |
|---|---|
| `ORD-26-0145` / `INV-26-8868` | Walk-in counter sale, "Ammar Kamran", 03123670670 |
| `ORD-26-0150` / `INV-26-8872` | Walk-in counter sale, "Ahmed Raza", tax overridden to 16% |
| `ORD-26-0146` / `INV-26-8869` | Counter sale to a shop account |
| `ORD-26-0148` / `INV-26-8870` | Order with the invoice raised alongside it |
| `ORD-26-0149` / `INV-26-8871` | Credit hold, then released by override |
| `ORD-26-0147` | Draft, then cancelled |
| `SR-26-0041` | Return, **rejected** — proves the stock reversal (928 → 926) |
| `SR-26-0042` | Return, approved |

---

## 2026-08-29 (earlier) — pulled Talha's work, counted the real state

No code written beyond pulling Talha's `aa510f1` into the local working copy.
Counted the real state rather than trusting the previous handoff.

---

## 2026-08-27 — Talha: client-fit reshape, and four screens

Frontend `69afbe6` (9 commits) · Backend `aa510f1`

**Not my work.** Recorded here because it moved both remotes and changes what
is left to do.

The substantial one is `c7cdefb feat(client-fit): reshape app around one
branch, three locations, four roles` — it touches `lib/nav-config.ts`, so the
navigation surface is his shape now, not the one I audited against. It is still
**50 destinations**; the entries moved rather than multiplied.

He also carried four screens forward:

| Screen | State |
|---|---|
| `sales/invoices` | live |
| `accounting/vouchers` | live |
| `purchases/grns` | live — kept the loading state I added |
| `sales/invoices/[id]` | **half-done: axios wired, but 2 `@/data/*` imports left** |

That last one is the only page in the tree in a mixed state. Finish it or
revert it; do not leave it, because a page that fetches *and* reads a frozen
array is the hardest kind to reason about.

**My 2026-08-26 work survived his merge intact** — spot-checked
`report-toolbar`, `inventory/adjustments/new`, `purchases/orders/new` and
`parties/[id]`: all still fetch live, no mock imports back.

---

## 2026-08-26 — the stale-dropdown bug, and 32 more screens

Frontend `a327296` · Backend `f6dcbc5`

### The reported bug, and what it actually was

> "A product created on the New Product screen does not appear in the product
> dropdowns on other pages."

**It was not caching.** Not App Router route caching, not a stale server query.
Those screens **were never connected**. They imported a hardcoded array that is
compiled into the JavaScript bundle:

```ts
import { products } from "@/data/products";
import { activeLocations } from "@/data/settings";
```

No amount of refetching could ever have helped, because there was no fetch.
`GET /purchases/lookups` had been returning the full live catalogue the whole
time; the pages ignored it.

**Proof.** Product 35, SKU `VZ-123-ER`, name "muhammadtalhabinsuhail" — Talha
created it through the app between sessions. Absent from every picker before
the change, present in all of them after, with no restart. Then re-proved by
creating a product live and finding it in all four item pickers seconds later.

**The one with the widest blast radius was not on the brief's list.**
`components/widgets/report-toolbar.tsx` holds the location filter and is shared
by **all seven report screens**, so a location added at `/admin/locations` never
appeared on any report.

### How to re-test it in two minutes

1. Create a product at `/inventory/products/new`.
2. Without restarting anything, open the item picker on each of
   `/inventory/adjustments/new`, `/inventory/transfers/new`,
   `/purchases/orders/new`, `/purchases/invoices/new`.
   The new product must be listed.
3. Set it inactive and repeat — it must now be **absent**. That proves the
   filter, not just the fetch.

### Screens converted

| Area | Files |
|---|---|
| Purchases | all 12 — the four `[id]` pages rendered hardcoded items and an invented activity feed ("System emailed PO to supplier"); the four `new` forms wrote nothing |
| Parties | `[id]`, `[id]/statement`, `visits` |
| Inventory | `adjustments/[id]`, `adjustments/new`, `transfers/[id]`, `transfers/new` |

The purchase **invoice and return forms collected a typed subtotal** where the
API stores *lines* — so nothing typed on them ever reached the database. Both
now build real line items.

### API added

- `GET /inventory/lookups` → `products[]` (active only) — the adjustment and
  transfer pickers had no live product source at all
- `GET /purchases/orders/{id}` → `lines[].received` off **POSTED receipts only**,
  plus `receipts[]` detail. The *list* endpoint already returned a received
  percentage; the *detail* endpoint did not, so an order read "0% received"
  once you opened it
- `GET /sales/invoices` → `customerId` filter, matching the one `GetOrders`
  already had
- `GET /parties/{id}/statement` → `company{}` letterhead from the `Company`
  table (`/admin/company` is SuperAdmin-only, but statements get printed by
  sales and accounts too)

### Found while verifying, not on the brief

- **14 list screens** declared `loading` and imported `Skeleton` but rendered
  neither — an empty table during the first request. All fixed.
- `/sales/invoices` rows linked to **`/sales/rows/{id}`**, which is not a route.

---

## 2026-08-26 (earlier) — products, profile, claims, dispatch, accounting

Frontend `5003410` + `0000706` · Backend `70f0e93`

17 screens onto live data. New `ProfileController` (6 endpoints) — deliberately
**separate from `AuthController`**, which is Talha's, so pulling his changes
never conflicts.

**Two app-wide bugs fixed in `0000706`:**

1. **Every date-time displayed five hours early.** The API writes
   `DateTime.SpecifyKind(DateTime.UtcNow, Unspecified)` into
   `timestamp without time zone`, so JSON carries `2026-08-25T17:21:45` with
   nothing saying it is UTC. `new Date()` reads a bare date-**time** form as
   *local*, and this machine is UTC+5. `parseApiDate()` in `lib/format.ts` now
   appends the marker only when the string has a time and no zone — date-**only**
   strings are left alone, because the spec already parses those as UTC.
2. Collections printed **"Cash · null"** — the guard tested for an em-dash
   placeholder the API never sends, and `null` in a template literal
   stringifies to the word.

**Controls switched off rather than faked.** The 2FA toggle flipped a
`useState` and toasted *"Your account is now less secure"* while changing
nothing; "Sign out all" toasted success and signed nobody out. Both now read
"Not available yet" — a stateless JWT cannot be revoked. Schema they would
need is in `db_code_changes.txt` §6.

---

## 2026-08-25 — Super Admin panel, and the bug that blocked everything

Frontend `3329b46`, `c671156` · Backend `03f7a0e`, `128bc35`

**The one that stopped the whole application.** The seed loaded every table
with explicit primary keys, so 77 of 78 identity sequences were still parked at
1 while tables held rows up to 106. The first insert anywhere collided with
seeded row 1 and threw `23505 duplicate key`. **No record of any kind could be
created, in any module.** Fixed by `database/07_neon_sequence_reset.sql`,
idempotent — **re-run it any time data is imported with explicit keys.**

Ten of eleven accounts also could not sign in: rows 2–11 carried a literal
`$2b$12$PLACEHOLDER…` string instead of a hash.

---

## What is left

### 8 screens still on mock data

All eight are accounting forms. All have working endpoints — this is frontend
wiring, not API work.

| Area | Files |
|---|---|
| `accounting/*` | `expenses/[id]`, `expenses/new`, `journal-entries/[id]`, `journal-entries/new`, `vouchers/[id]`, `vouchers/new` |
| `sales/orders` | list is live; one channel-label helper still reads `@/data/sales` |
| `login` | pulls one presentational constant from `@/data/settings` |

The sales screens finished on 2026-08-29 are the closest worked examples for
the accounting ones — `sales/returns/new` in particular, which loads a parent
document and builds its lines from that document rather than a fixed array.

### Needs a decision, not code

1. **🔴 Credentials are public and still not rotated.**
   `vizo-backend/appsettings.json` is committed to the **public** repo with the
   live Neon password, the JWT signing key, two Cloudinary secrets and a Gmail
   app password — and they are in git history, so deleting the file does not
   undo it. Rotate all four.
   **Note:** the JWT key now also signs BOTH families of anonymous share link --
   `/sales/bill/{invoiceNo}?k=` and `/documents/open/{kind}/{key}?k=`. Rotating
   it invalidates every one already sent to a customer or supplier. That is the
   correct behaviour and it is the point of signing them that way, but do it
   knowing the WhatsApp links people are holding will stop opening.
2. **🟢 Cloudinary PDF delivery — DONE.** It was off; it has been turned on in
   the console and every stored link now serves. Nothing in the code changed:
   `PdfStore` HEADs each URL after uploading, so the app switched from its own
   fallback link to the Cloudinary one on its own. Left here as a note because a
   NEW Cloudinary account will arrive in the same blocked state, and
   `/admin/documents` is where that would show up.
3. **`CLM` document series is not in the database.** Claims created through the
   app number `CLM-20260825174238` instead of `CLM-26-0143`. One `INSERT`,
   written out in `db_code_changes.txt` §5. **Not applied.** Note that even once
   it is, `09_document_series_catchup.sql` should be re-run so the counter
   starts past whatever is already there.
4. **Trial balance does not balance — and that is the data.** Posted movement
   ties to the cent; the seeded *opening balances* are 51,256,709 out. The
   endpoint reports the two separately so nobody hunts through journal entries
   that were never at fault.
5. **Document numbers can still collide under concurrency.** `NextNumber()`
   reads and increments `DocumentSeries.NextNumber` non-atomically. Migration 09
   fixed the counters being *behind the data*; it does not fix two requests in
   the same instant taking the same number. The proper fix is one Postgres
   sequence per series — `db_code_changes.txt` §3.1, not applied.
6. **`UpdateCategory` still writes `ParentCategoryId = 0`.** Talha fixed the
   create path (`InventoryController.cs`) but not the update path, so editing a
   category to "Top level" throws the same FK error. Left as he has it rather
   than changing code he is actively working in — worth a word with him.
7. **`system@advpos.pk` (user 11) is a super-admin service account** sharing a
   working password with five other accounts. Consider `IsActive = false`.

### Test rows in the live database

Products:

| id | SKU | State |
|---|---|---|
| 34 | `ZZ-WIRING-TEST-01` | inactive — safe to delete |
| 36 | `ZZ-DROPDOWN-TEST` | inactive — safe to delete |
| **35** | `VZ-123-ER` | **Talha's. Leave alone.** |

Removal SQL is in `db_code_changes.txt` §12. Both of the deletable ones are
`IsActive = false`, so they cannot reach an order, invoice or packing screen.

Sales documents from the 2026-08-29 session are listed in that day's entry above.

---

## Standing facts

### How to run

```bash
cd backend/vizo-backend && dotnet run --launch-profile https   # :7177 + /swagger
cd vizo-erp && npm run dev                                     # :3000
```

`dotnet dev-certs https --trust` once, or every browser request fails as a bare
network error with nothing in the console.

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@advpos.pk` | `Admin@1234` |
| Accountant | `accounts@advpos.pk` | `Accounts@1234` |
| Order Dept | `order@advpos.pk` | `Order@1234` |
| Sales | `sales@advpos.pk` | `Sales@1234` |

Others (`nadia@`, `junaid@`, `ahmed@`, `imran@`, `sara@`, `asad@`,
`system@advpos.pk`) use `Vizo@1234`. `asad@` is inactive on purpose.

### ⚠️ The .NET SDK will fail on a fresh machine

`global.json` pins **SDK 9.0.317**. If it is not installed, `dotnet` does not
warn — it fails to load at all inside `backend/` with *"The command could not
be loaded"*, which does not look like an SDK problem.

Check with `dotnet --list-sdks`. If 9.x is missing, build behind a **temporary**
override and restore before committing:

```bash
cd backend && cp global.json global.json.bak
printf '{\n  "sdk": { "version": "8.0.0", "rollForward": "latestFeature" }\n}\n' > global.json
# build / run / verify
mv global.json.bak global.json          # ALWAYS restore
```

### Talha owns five files — do not overwrite

```
global.json
vizo-backend/vizo-backend.csproj
vizo-backend/Program.cs
vizo-backend/Models/AppDbContext.cs
vizo-backend/Controllers/AuthController.cs
```

**The push recipe that works:** clone his repo fresh, copy in *only* your own
files, then assert those five show no diff before committing. A blind `cp -r`
of the whole folder reverts his work. Two further traps that recipe avoids:

- Upstream is **CRLF**, the working copy is **LF**. A raw `diff -rq` says every
  file changed; it is line endings. `.gitattributes` has `* text=auto`, so git
  normalises — but do not "fix" it by hand.
- Editing `.cs` files with a script that writes `utf-8-sig` **adds a BOM**
  upstream does not have, which shows up as a phantom deleted `using` line.
  Check with `head -c3 file.cs | xxd -p` — it should be `757369`, not `efbbbf`.

### Architecture decisions — settled, do not re-litigate

| Decision | Why |
|---|---|
| axios + `useState`/`useEffect` **inside each page**, no `api.ts` | Explicit client brief, stated in every round |
| `react-hooks/set-state-in-effect` disabled per-site | The rule rejects *any* setState reachable from an effect, so the requested pattern can never satisfy it. Disabled with the reason inline, never globally. **This contradicts `AGENTS.md`, which wants server-side fetching — a client decision, not a code one.** |
| No DTOs, services, interfaces, repositories | Explicit brief. `ApiControllerBase` is plain inheritance, nothing in DI |
| Request records at the foot of each controller | Brief. Causes duplicate names, which is why `CustomSchemaIds` is required in `Program.cs` |
| Secrets **redacted** in the `Program.cs` comment block | The repo is public; pasting live values would publish a database password |
| Backend not tracked by the frontend repo | It lives in Talha's repo. `db_code_changes.txt` is committed to both — **his copy wins** |

### Traps that cost real time

1. **Lookup keys are not the words you would guess.** `AccountGroup` is
   `Assets / Liabilities / Capital / Revenue / Expenses` — plural, no "Income",
   no "Equity". `ClaimStage` has no `WITH_SUPPLIER` or `SETTLED`; it is
   `RECEIVED / SENT / REPLACED / CREDITED / REJECTED / WRITTEN_OFF`.
   `OrderStatus` has no `NEW`; a fresh order is `SUBMITTED`.
   **Guessing does not error — it silently matches nothing and the screen reads
   empty.** Ask the database:
   ```bash
   psql "$NEON_URL" -c 'SELECT "StatusKey" FROM "OrderStatus" ORDER BY "SortOrder";'
   ```
2. **`CreatedByUser` is not always a `User`.** On the purchase side, and on
   `Claim` / `Collection` / `Delivery` / `CustomerVisit`, it is an **`Employee`**
   — so the name is `.CreatedByUser.User.FullName`. Sales side is a real `User`.
3. **`OpeningBalance` is stored in the account's natural sign.** A Sale account
   opens at +21,800,000 even though a sale is a credit. Ledger maths runs on a
   debit basis — flip credit-normal openings first (`ToDebitBasis()`), or the
   trial balance is nonsense.
4. **`User` has two location collections.** `User.Locations` = locations this
   person is *in charge of*. `User.LocationsNavigation` = the junction, where
   they may *work*. Access control wants the second.
5. **`Claim` and `Account` collide with framework types.** Hence
   `using SecurityClaim = System.Security.Claims.Claim;`.
6. **Npgsql rejects `DateTime` with `Kind = Utc`** for `timestamp without time
   zone`. Everything writes through `Now()`.
7. **Middleware order:** `UseCors` → `UseAuthentication` → `UseAuthorization`.
   Wrong order and pre-flight `OPTIONS` gets a 401 before CORS headers are
   written, which looks exactly like a CORS bug and is not one.
8. **`DataTable` requires an `id` field** on every row type.
9. **A document series prefix is not the table name.** Sales orders are
   `ORD`, not `SO`. `NextNumber()` does not throw when the prefix does not
   exist — it silently falls back to `PREFIX-yyyyMMddHHmmss`, so the only
   symptom is document numbers that look wrong days later. The real prefixes:
   ```bash
   psql "$NEON_URL" -c 'SELECT "Prefix", "NextNumber" FROM "DocumentSeries" ORDER BY "Prefix";'
   ```
10. **A series counter parked behind the data throws `23505` on the FIRST
    insert.** Exactly like the identity sequences. Run
    `09_document_series_catchup.sql` after importing anything with explicit
    document numbers.
11. **Cloudinary refuses to DELIVER a PDF by default** on accounts created
    since 2023. The upload succeeds and the URL 401s. It is an account setting,
    not a code bug — see the 2026-08-29 entry.
12. **Npgsql maps a bare `DateTime` property to `timestamp WITH time zone`**
    and then refuses to write one whose `Kind` is `Unspecified` — which is
    what `Now()` produces, deliberately, for every other timestamp in this
    schema. Any new timestamp column needs
    `.HasColumnType("timestamp without time zone")` declaring, the way the
    scaffolder does for `LoggedAt` and `VisitedAt`.
13. **A footer cannot say "Page 1 of 3" while page 1 is being drawn.** A table
    that overflows makes its own pages as it goes, so the count is not known
    until the body is finished. Draw the body first, then stamp the footers --
    `PdfCanvas.SelectPage` exists for exactly this.
14. **Never run `next build` while `next dev` is up** — they share `.next` and
   the cache corrupts into a blanket HTTP 500.

### Reference

| File | What it holds |
|---|---|
| `backend/database/08_sales_documents.sql` | Invoice PDF columns, walk-in identity, return decision. **Applied.** |
| `backend/database/09_document_series_catchup.sql` | Winds `DocumentSeries.NextNumber` past the data. **Applied. Re-run after any import with explicit document numbers.** |
| `backend/database/10_document_files.sql` | `DocumentFile` — one row per generated PDF and its Cloudinary link. **Applied.** |
| `backend/vizo-backend/Documents/` | `PdfCanvas` (a small PDF writer, no dependency), `InvoicePdf` (the bill), `DocumentPdf` (every other document and report), `PdfStore` (Cloudinary + delivery check), `DocumentArchive` (render, upload, record) |
| **`/admin/documents`** (Setup → Document Store) | **Every PDF the system has generated and its real Cloudinary link.** Open this first when somebody asks where the documents go. |
| `vizo-erp/src/components/widgets/document-actions.tsx` | Print / Download / Save-to-store for one document. Used by all ten document screens |
| `vizo-erp/src/components/widgets/report-toolbar.tsx` | Shared by 13 report and statement screens. Give it a `doc` prop and it renders the real PDF; without one it falls back to the browser print dialog |
| `backend/database/db_code_changes.txt` | **Every DB change, applied or not, with rollbacks.** §9–12 are the newest |
| `backend/SETUP.md` | NuGet packages, configuration, how to run |
| `backend/API_CONTRACT.md` | endpoint request/response shapes |
| `backend/database/ERD.txt` | text ERD |
| `vizo-erp/AGENTS.md` | rendering-speed rules — currently at odds with the per-page fetch brief |
