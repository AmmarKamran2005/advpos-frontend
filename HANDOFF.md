# AdvPOS (VIZO) — Handoff

**Updated 2026-09-22.** Newest first. Read **§0** and **§1** before anything
else; they are enough to carry on in a new chat. Everything below them is the
dated history, then [What is left](#what-is-left) and
[Standing facts](#standing-facts) at the bottom.

This file is the single entry point. The other notes, and what each is for:

| File | Role |
|---|---|
| **`HANDOFF.md`** (this file) | State, history, decisions, how to work here |
| `backend/database/changa.txt` | What the owner must do **by hand** (deploy order, env vars, one-off SQL). The owner asked for this file by name |
| `backend/database/convey.txt` | What was **found but not changed**, and why every judgement call went the way it did. Longest and most detailed |
| `backend/database/session_summary.md` | One-page summary of every session since 31 Aug |
| `backend/database/NN_*.sql` | Migrations; header of each says whether it has been run |
| `vizo-erp/AGENTS.md` | Rendering-speed rules for the frontend (a standing requirement) |
| `CONTINUE-HERE.md`, `vizo-erp/handoff.md` | **Superseded.** Kept for history only |

---

## §0. Start a new chat here

Paste something like this into the new chat:

> Read `D:\Main\Sales Softwaer\HANDOFF.md` (§0, §1, then the newest dated
> section), then `backend/database/changa.txt` and the top of
> `backend/database/convey.txt`. Then `git fetch` both repos before touching
> anything — Talha pushes to both. Then: <your request>.

What the next session needs to know about **working** here:

1. **Two repos, two remotes, two branches.**
   - Frontend = the outer folder `D:\Main\Sales Softwaer`, remote **`new`** →
     `https://github.com/AmmarKamran2005/advpos-frontend`, branch **`main`**.
     (`origin` there is an old repo — never push to it.)
   - Backend = `D:\Main\Sales Softwaer\backend`, its own git repo, remote
     **`origin`** → `https://github.com/muhammadtalhabinsuhail/vizo-backend`,
     branch **`master`** (not `main` — `git pull origin main` fails).
   - The outer repo does **not** track `backend/` (it shows as untracked; leave it).
2. **Push with the `AmmarKamran2005` GitHub account.** This machine has two
   accounts in `gh`; the active one is `medocsai`, which has **no push rights on
   either repo** (403). Push without changing the saved login:
   ```bash
   TOKEN=$(gh auth token --user AmmarKamran2005)
   git -c credential.helper= \
       -c "credential.helper=!f() { echo username=AmmarKamran2005; echo password=$TOKEN; }; f" \
       push new main            # frontend;  in backend/: push origin master
   ```
3. **Talha (Muhammad Talha Bin Suhail) also pushes to BOTH repos.** Always
   `git fetch` first and rebase onto his work; never force-push. His last:
   frontend `aa7e7b5` (16 Sep), backend `4dc6508` (17 Sep).
4. **Building the backend on this machine:** `backend/global.json` pins SDK
   9.0.317, which is not installed (8.0.419 and a 10 preview are). Move it
   aside for the build and ALWAYS put it back — it is committed:
   ```bash
   cd backend && mv global.json global.json.bak
   (cd vizo-backend && dotnet build -v q --nologo)
   mv global.json.bak global.json
   ```
5. **The live database is reachable** with Python `psycopg2` (installed). The
   connection string is in `backend/vizo-backend/appsettings.json`. The Neon
   MCP tool in Claude sessions is a **different Neon account** ("Hazir") and
   cannot see this database. Columns are **PascalCase and quoted**
   (`"RoleId"`); city names carry the country (`'Karachi - Pakistan'`).
   Read-only by default; **ask the owner before any DDL or data change**.
6. **Credentials stay in `appsettings.json` and `.env.local`.** Owner's decision.
   Do not "secure" them into user-secrets or env vars.
7. **Found-but-not-changed goes in `convey.txt`; anything the owner must do by
   hand goes in `changa.txt`.** Both in `backend/database/`.
8. **Style:** long explanatory comments saying *why*, matching the surrounding
   code. Commit messages explain the fault, not just the change, and end with
   `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
9. **The owner** (Ammar Kamran, `kamran.ammar2005@gmail.com`) writes in English
   and Roman Urdu. Requests arrive as one long message with many linked items —
   read the whole thing before starting; items depend on each other.

---

## §1. Where things stand right now

| | |
|---|---|
| **Frontend** | `AmmarKamran2005/advpos-frontend` @ `main` = **`6053504`** (pushed 2026-09-22, rebased onto Talha's `4cdb2a4`) |
| **Backend** | `muhammadtalhabinsuhail/vizo-backend` @ `master` = **`29972d1`** (pushed 2026-09-22) |
| **Database** | Neon PostgreSQL, Singapore. Migrations **15–18, 20, 21, 22** applied. **19 section 1 applied; 19 section 2 (drop `OpeningCost`) NOT run** — waits for the new API to be deployed (changa.txt §A1) |
| **Stack** | Next.js 16 / React 19 / TypeScript / Tailwind 4 (Vercel) · ASP.NET Core 8 Web API + EF Core 8 + Npgsql · JWT with permission policies · SignalR · WebPush · Cloudinary · MailKit · Gemini Flash. Full list in `README.md` |
| **Gate** | `npx tsc --noEmit` clean · `npx eslint src` **0 errors**, 64 warnings (old unused-vars) · `next build` **86 pages** (packing removed) · backend **0 errors**, 6 old warnings (4 `AuthController`, 2 `ProductHistoryController`) |
| **Live site** | `https://advpos-frontend.vercel.app` |

### What the owner must still do (full text in `changa.txt`)

**Two urgent ones first:**

- 🔴 **Set `Gemini:ApiKey`** (changa.txt §C1) or the new customer screen only takes
  pictures and every box is typed by hand. Free key, two minutes. It also
  switches on the AI reports, which have been dark since September.
- 🔴 **Assign customers to the right salesman** (changa.txt §B1). Every dropdown
   now shows a rep only his own accounts, and **Imran Iqbal and Ammar Kamran
   have none**, so they cannot raise an order at all. Sara has 7, Zara 1; nine
   accounts are assigned to an order-desk clerk or the accountant, two to
   nobody. Five minutes at People → Customers, no deploy.
1. Deploy the new API, **then** run section 2 of `19_product_pricing.sql`
   (drops `OpeningCost`). Not before — the old build selects that column.
2. `npm install` in `vizo-erp` (new: `@zxing/browser`, `@zxing/library`).
3. Set `App__WebBaseUrl=https://advpos-frontend.vercel.app` on the API host.
4. Check `Cors:AllowedOrigins` includes the Vercel origin on the host.
5. Everyone signs out and back in (permissions ride in the JWT; tokens last 8 h).
   **Doubly true after migration 20** — a rep's old token still carries the
   invoicing and returns rights it took away.
6. Try the barcode camera on a real phone (could not be tested — see 2026-09-20).
7. Tell the accountant that billing is theirs now (changa.txt §B4).
8. Tell the order desk that **Dispatched now takes the stock off the shelf**, asks
   which place it left from, and that the packing screen is gone (changa.txt §C3).
9. Decide on the **correction script for the 26 past orders** that were dispatched
   or delivered without moving any stock (changa.txt §C4, D1).

### Decisions waiting on the owner

| # | Question | What happens on each answer |
|---|---|---|
| **D1** | ✅ **Answered and done for new orders (22 Sep):** Dispatched takes the stock off, from the place the screen asks for. **What is left is the past** — 26 orders dispatched or delivered before that date still moved nothing, so Stock in Hand is overstated by everything on them | One correction script. It changes real shelf counts, so it waits for a word; the list is shown before anything runs |
| **D2** | **No-past-dates rule scope.** Applied to 19 entry forms, NOT to list/report From–To filters (a report must look back). Also applied to **cheque date** and **supplier bill date**, which are often legitimately in the past. Not enforced by the API | Say which of those to loosen, or whether to add it to report filters / the API |
| **D8** | **Nothing has ever read a CNIC here** — no `Gemini:ApiKey` is set, so the new customer screen files the photographs and the salesperson types the details. And no camera has taken one: the test browser has none | Set the key (changa.txt §C1) and put one real shop through the screen. The prompt is one file and is meant to be corrected |
| **D3** | **Six more exports silently stop at 50 rows** (list action caps `pageSize`, export asks for 5000): orders (46 rows today), invoices, walk-in, parties, journal entries (44), vouchers, expenses. Fixed for products only | One-line change per list action; say the word |
| **D4** | Ahmed Riaz (order-dept) points at **Karachi Warehouse**; should be a department | Fix at `/admin/users` (form now only offers departments) |
| **D5** | 🔴 **Now blocking.** Customer pickers are rep-scoped since 21 Sep, so a rep with no accounts cannot raise an order: Imran and Ammar have **0**, Zara 1, Sara 7. Nine accounts belong to an order-desk clerk or the accountant, two to nobody | Assign reps on those parties |
| **D6** | Old items still open: public credentials never rotated; `UpdateCategory` writes `ParentCategoryId = 0` (FK error when editing a category to top level — Talha's area); `NextNumber` is not atomic; VAPID key in `.env.example` does not match the server; warehouse panel missing on the login screen; trial balance opening balances 51,256,709 out | See [What is left](#what-is-left) |
| **D7** | **Sale invoices never reach the ledger** — 39 invoices, 12 journal entries, and all 12 are seeded. Sales returns are consistent with that (they post nothing either). Aged receivables and the credit-limit check under-state by everything billed through the app; the customer statement is built from documents and is right | Decide the accounts and post both sides — a session of its own. convey.txt §R7.1 |

---

## 2026-09-22 — Seven steps, stock that leaves when it is dispatched, and a customer opened from their papers

Commits: backend **`1667625`** (chain, dispatch, rights) and **`29972d1`** (customer documents) ·
frontend **`3e36a26`** (order screen, dispatch dialog) and **`6053504`** (the customer's papers).
Talha pushed twice to the frontend while this was in flight (`6eac03b`, `4cdb2a4` — a stray space
and the new-product tax default moved from 18 to 0); this work is rebased on top of his, not merged
over it.
Migrations **21** and **22** run on the live Neon database, on the owner's instruction.

### What the owner asked for (paraphrased faithfully)

1. `/sales/orders/new`: **remove "Sales rep"** — the database records whoever is signed in, and
   accounts and the owner can still see which salesperson wrote which customer's order.
2. **Delete order ORD-26-0171 and invoice INV-26-8893** from the database.
3. `/sales/orders/new`: **remove "Selling from"**. Instead, before an order can be **Dispatched**,
   ask in a popup where it is selling from — **all warehouses, all order departments and Shop 2**,
   never Claim Stock. Give that step to **accountant, order department and super admin**.
4. **A new customer in two pages**: CNIC front/back, business card front/back, affidavit page 1/2,
   each by camera or upload, each skippable, with clear errors when a picture cannot be read;
   then the form, filled from what was read (legal name from the CNIC without the father's name;
   display name = *cnic name - shop name - shop location*; industry = shop with location; phones
   from the CNIC; email and **address from the business card**; city from the CNIC matched to the
   Pakistani list; Retailer by default; English only). Pictures to Cloudinary, one
   **legal_documents.pdf** for anybody who may see the customer, and **no re-reading on an edit**.
5. **Display Name throughout the project**, not the legal name.
6. **Category options**: a rep and the accountant get Retailer / Wholesaler / Agent; the owner
   gets all.
7. **Receiving payments**: Cash, Credit, Meezan, Faisal only.
8. `/sales/orders/new` simpler and quicker: full display name in the picker, **big product
   pictures**, and per line **Qty · RATE · Margin · Margin %** with discount and tax gone.
9. **Remove the statuses** *Seen by Warehouse*, *On way to Order Dept* and *Packaging*; rename
   *Received at Order Dept* to **Processing in Order Dept**.
10. **Remove "Ask for permission"** from the rep's order screen.
11. **Remove "Record payment"** from the sales panel — accountant and owner only.

### The four decisions the owner was asked for, and the answers

| | Answer |
|---|---|
| What should read a CNIC photograph | **Gemini**, with a key the owner supplies — free, and the code already had a client |
| What a typed margin does to the RATE | **Margin sets the rate**: rate = landed cost + margin, either box drives the other |
| What happens to sales tax with the tax box gone | **Applied automatically** from the product's own rate; the bill is unchanged |
| Should dispatch take the stock off the shelf | **Yes** — and it names the place it came off |

### What was built

**Backend**

| Piece | Where |
|---|---|
| Seven-step chain, `MayDispatch`, re-aimed announcements | `Services/OrderWorkflow.cs` |
| Dispatch asks for a place, checks every line, deducts, writes a SALE movement, sets the order's location | `SalesController.SetOrderStatus` |
| Order form's two removed questions: `LocationId` optional (defaults), `SalesPersonUserId` ignored (always the signed-in person) | `SalesController`, `OrderRequest` |
| Product pictures and duty on the sales lookups; `receivingMethods` on the sales and accounting lookups | `SalesController`, `AccountingController` |
| Display name in 128 projections | thirteen files |
| Category list cut by role | `PartiesController.Lookups` |
| `PaymentMethod.IsForReceiving`; Meezan and Faysal | `Models/PaymentMethod.Custom.cs`, migration 21 |
| Six document columns and the bound PDF's link | `Models/Party.Custom.cs`, migration 22 |
| Reading a CNIC / business card, and the prompt that governs it | `Controllers/PartyDocumentsController.cs` |
| Sending pictures to Gemini at all | `Services/GeminiClient.ReadImagesAsync` |
| The customer's document set as one PDF | `Documents/LegalDocsPdf.cs` |
| **JPEG embedding in the PDF writer** (`/DCTDecode` XObjects, SOF parsing, per-page resources) | `Documents/PdfCanvas.cs` |
| /packing retired; /dispatch repointed behind the chain | `PackingController`, `DispatchController` |

**Frontend**

| Piece | Where |
|---|---|
| The one-page order screen: display-name picker, product photographs, Qty/RATE/Margin/Margin %, sticky mobile bar | `app/(app)/sales/orders/new/page.tsx` |
| "Where is this going out of?" dialog, with the shortage list the API sends back | `components/sales/order-workflow.tsx` |
| Page one of a new customer: three sections, camera or upload, skip, read | `components/parties/customer-documents-step.tsx` |
| One photograph: in-page camera (getUserMedia) or the phone's gallery, uploaded as taken | `components/parties/document-capture.tsx` |
| The two pages together, prefill, PDF build after save, Pakistan-only cities | `app/(app)/parties/new/page.tsx` |
| Record Payment gated and pointed at the receipt voucher (which prefills from `?type=receipt&partyId=`) | `sales/invoices/[id]`, `accounting/vouchers/new` |
| Seven steps in the labels and the order filters; no Packing; the warehouse screen is a list | `lib/labels.ts`, `lib/nav-config.ts`, `proxy.ts`, `warehouse-queue.tsx` |

### Live data touched

- **Migration 21**: the chain shortened (7 orders moved, each logged), `IsForReceiving` + Meezan +
  Faysal, **ORD-26-0171 and INV-26-8893 deleted** after checking nothing hung off them.
- **Migration 22**: eight nullable columns on `Party`.
- **One test order** (ORD-26-0174) raised through the new form, dispatched out of Karachi
  Warehouse to prove the stock comes off (270 → 269), then deleted with the unit put back and the
  order number wound back.
- **One test customer** (VZ-C-0018) created to prove the documents PDF — which came back a real
  5-page, 693 KB PDF with four embedded JPEGs, served by Cloudinary — then deleted. 26 parties
  before and after.
- 🔴 **One mistake**: a check meant to be refused ("dispatch from a short shelf") was not refused,
  and **ORD-26-0163** really went out: three units off Shop 2 and a notification. Put back within
  the minute — stock, movements, status, location, notifications — with an `ORDER_STATUS_RESTORED`
  row in its history saying so.

### How it was verified

- The order form driven as a rep: no Sales rep, no Selling from, four payment methods, the
  customer picker showing one display name, a product added from the picture list, **50 % typed
  into Margin % giving margin 360 and rate 1,080 over a landed cost of 720**, and the order saved
  with tax carried from the product (18 %) and the rep recorded as the signed-in user.
- The dispatch dialog driven as the owner: three places offered, no Claim Stock, and the stock
  movement, balance and activity row checked in the database afterwards.
- Every dispatch refusal: no place (400 `needsLocation`), Claim Stock, a closed place, and a rep
  (403).
- The documents step at desktop and 375 px: three sections, camera dialog refusal handled
  ("The camera was refused…", button disabled), skip-all reaching the form, Pakistan-only cities.
- The reader endpoint answering "not configured" and the screen saying so.
- The documents PDF: structure, page count, four `/DCTDecode` image streams, and each embedded
  JPEG intact with dimensions matching what the PDF declares.
- Gate: `tsc` clean, `eslint` 0 errors / 64 warnings, `next build` 86 pages (packing gone),
  backend 0 errors.

### Not proven, and the owner needs to know

- **No CNIC has been read by the reader**, because no key is set. The screen behaves correctly
  without one; the prompt is in one file and is meant to be argued with once a real card has been
  through it (`convey.txt` §S8.1).
- **No camera has taken a picture** — the test browser has none. Only the refusal path ran.

---

## 2026-09-21 — In Transit deleted, rep-scoped customers, Invoiced/Edit, and a sales return built around the customer

Commits: backend **`5ceecb1`** · frontend **`aa9ce49`**. The work was done in a
local session and pushed to both repos at the end of it, once the owner asked
for it; neither remote had moved in the meantime, so both were fast-forwards.
Migration **20** was run on the live Neon database, on the owner's explicit
answer to a question that laid out what it would do.

### What the owner asked for (paraphrased faithfully)

1. **Delete the "In Transit" location** throughout the system — there should be
   no such place.
2. In the sales panel, **every customer dropdown must show a rep only his own
   customers**, the way his Customers screen already does.
3. Rename the **Invoiced** step to **Invoiced/Edit**, take the right to press it
   off the salesman and give it to the **accountant and super admin** (both are
   notified). Once it is pressed the invoice must save itself — nobody should
   have to go to `/sales/invoices/new` to make it separately.
4. **Rebuild the sales return** so it is easy and reliable: a salesman cannot
   raise one at all (remove the pages and the sidebar entry from his panel);
   only admin and accountant can. A return can cover **several orders**:
   salesperson (optional) → customer (required) → his **last 5 orders** with
   dates, items and quantities on the right, and under them **every item he has
   ever bought with total quantities** → **Add product** offering only what he
   bought → a quantity that **can never exceed what he bought** → on save the
   date is today, the credit note is generated, and the goods are **added to a
   location the screen asks for**. Fast, automated, and good on a phone.

### The four decisions the owner was asked for, and the answers

| | Answer |
|---|---|
| Where ORD-26-0158 / INV-26-8878 go when In Transit is deleted | **Karachi Order Department** |
| What price a returned piece is credited at | **The average that customer actually paid** (LineTotal ÷ qty — discount off, tax on) |
| Does "Invoiced/Edit" also let the accountant edit the order | **Yes**, while it is confirmed or invoiced and the warehouse has not picked it |
| Run migration 20 on live, and one test return | **Yes to both** — the test return was created and then removed |

### What was built

**Backend** (`backend/vizo-backend`)

| Piece | Where |
|---|---|
| Who may bill (`MayInvoice`) and who may edit (`MayEditOrder`); Confirmed → Invoiced is the accountant's; Confirmed and Invoiced announcements re-aimed | `Services/OrderWorkflow.cs` |
| Rep-scoped customer picker; `ValidateOrderRequest` refuses somebody else's customer | `SalesController.Lookups`, `ValidateOrderRequest` |
| `InvoiceOrder` and the "raise the invoice too" tick both ask `MayInvoice`; `my-permissions` gained `canInvoice` and a real `canEdit` | `SalesController` |
| `GET /sales/returns/lookups` — salespeople, customers (with their rep and last purchase), locations, refund methods, today | `SalesController` |
| `GET /sales/returns/customer/{id}` — last 5 invoices with their lines, every item ever bought with bought / returned / returnable / average price, and the totals | `SalesController` |
| `POST /sales/returns` — rewritten: customer not invoice, ceiling recomputed inside the transaction under `pg_advisory_xact_lock(4242002, customerId)`, price from history, date = today, one location for every line, condition from the shelf, POSTED on save, credit note archived | `SalesController` |
| Return endpoints carry **both** `perm:returns.sales` and the `Accountant` role policy | `SalesController` |
| Rejection now reverses every line that has a restock location (not only "resalable") | `SalesController.SetReturnStatus` |
| `SalesReturn.InvoiceId` is `int?`; every projection that read `Invoice.*` is null-safe | `Models/SalesReturn.cs`, `DocumentBuilder`, `ProductHistoryController`, `AdminDashboardController` |
| Migration | `database/20_places_rights_and_returns.sql` |
| Seed no longer creates In Transit or its 240 phantom units | `database/02_seed.sql` |

**Frontend** (`vizo-erp/src`)

| Piece | Where |
|---|---|
| The new return screen — salesperson filter, customer search, tap-to-add from the last five orders and from everything ever bought, steppers capped at what is left, location chips, quick reasons, sticky save bar on a phone | `app/(app)/sales/returns/new/page.tsx` |
| Return detail and list read with or without one invoice ("Several orders"); status shows the API's own word | `app/(app)/sales/returns/[id]/page.tsx`, `app/(app)/sales/returns/page.tsx` |
| "Raise invoice" drawn only when the server says so; Edit label right for the accountant | `app/(app)/sales/orders/[id]/page.tsx`, `components/sales/order-workflow.tsx` |
| `/sales/returns` is super-admin + accountant, by role, with no permission escape hatch | `proxy.ts` |
| `INVOICED` reads "Invoiced/Edit"; no transit icon | `lib/labels.ts`, `app/(app)/admin/locations/page.tsx` |

### 🔴 The consequence the owner has to act on

Scoping the picker exposed who the customers actually belong to:

| Rep | Customers they can now sell to |
|---|---|
| Sara Khan | 7 |
| Zara Malik | 1 |
| **Imran Iqbal** | **0 — cannot raise an order** |
| **Muhammad AMMAR KAMRAN** | **0 — cannot raise an order** |

Of 18 shop accounts, 5 are assigned to an order-desk clerk, 4 to the accountant
and 2 to nobody. Fixing it is five minutes at People → Customers and needs no
deploy — `changa.txt` §B1.

### Live data touched

- **Migration 20**, in full (see the file's header for each step).
- **In Transit**: ORD-26-0158 and INV-26-8878 moved to Karachi Order Department;
  240 duplicate units and their two seeded movements deleted; the location and
  its kind dropped. Those 240 were already on the Shop 2 shelf — TRF-26-0014
  was received there on 25 August — so Stock in Hand is 240 units closer to the
  truth, not 240 short.
- **One test return** (SR-26-0043, PKR 3,118, 3 units) raised through the new
  endpoint and then **removed**: stock taken back off, movements, activity row,
  notifications and document record deleted, and the SR counter wound back to
  43. 7 returns before, 7 after; both products back at their exact quantities.
  The credit-note PDF is still in Cloudinary, unreferenced — deleting it needs
  that account's own API.

### How it was verified

- Refusals against the live database through a local API with minted tokens:
  33 of 32 refused, an item never bought refused, zero / negative quantity
  refused, no items refused, a closed location refused, a rep's token refused
  (403) on every returns endpoint, a rep posting an order for somebody else's
  customer refused.
- `/orders/41/workflow` and `/my-permissions` as all three roles: the rep gets
  no moves and no edit; the accountant gets exactly "Invoiced/Edit" plus edit;
  the admin gets the whole chain. The chain label reads **Invoiced/Edit**.
- Browser at desktop and 375 px: the whole return flow (customer → tap-to-add →
  clamp at the ceiling → Claim Stock chip → totals), the return detail page with
  no invoice behind it, the returns list, Locations with no In Transit, Stock in
  Hand with four columns, the rep's sidebar without Sales Returns, `/sales/returns`
  giving a rep the 403 page, and the rep's order form offering exactly one
  customer.
- Gate: `tsc` clean, `eslint` 0 errors / 69 warnings, `next build` 87 pages,
  backend 0 errors with the same 6 old warnings.

### Found and not changed (details in convey.txt R7)

- **A sale invoice still does not reach the ledger** — 39 invoices, 12 journal
  entries, all seeded. The new return posts nothing either, to stay consistent.
  Aged receivables and the credit-limit check under-state (**D7**).
- **Per-invoice "returned" counts stop growing**, because new returns name no
  invoice. The returnable figure that matters is on the return screen.
- **D1 (orders never move stock)** and **D3 (six exports capped at 50)** are
  exactly where they were.

---

## 2026-09-20 — Products: auto SKU, duty/margin pricing, barcode camera, cards, movements, history, no past dates

*(Work spanned midnight Pakistan time; commits are stamped 2026-09-19.)*
Commits: backend **`23610e4`**, **`db0fe3a`** · frontend **`716681a`** (README), **`b3c850e`**.

### What the owner asked for (paraphrased faithfully)

1. `/inventory/products/new`: **SKU auto-generated**. Brand is always VIZO, so
   `VZ-` + model or a three-letter word from the name + first three letters of
   the category + the colour written in the name after "-" + a serial. Example:
   "VIZO TITAN T9 WIRELESS EARBUDS" in EARBUDS, black → `VZ-TIT-T9-EAR`. Use
   judgement for what is the model and the colour. Label it **"SKU*
   (Auto-generate)"** so nobody types it. Must be **unique every time**.
2. Before saving, **refuse a product whose name is exactly the same** as one in
   the database; if anything differs (e.g. colour) it is a new product with its
   own unique SKU.
3. **Brand defaults to VIZO**, changeable.
4. **Remove "opening cost"** from the whole project and **drop the column**;
   keep only cost price and sale price.
5. **Pricing:** Cost → **Duty** → **Margin price** → **Margin %** → Sale.
   Margin % applies on cost + duty. Typing the margin price computes the % and
   sale; typing the % computes the margin price and sale.
6. **Barcode:** a **Scan barcode** button opens the camera in a small popup
   that looks only for barcodes; after **3 minutes** it closes with a toast
   "barcode was not found"; if the device has **no camera**, a toast "camera was
   not found in this device". The scanned number goes into an editable text box;
   **multiple barcodes** per product. If a barcode contains a **SKU**, that SKU
   replaces the generated one.
7. `/inventory/products` as **cards** with a big image and the important
   information; clicking a card opens the detail page (like `/inventory/products/28`).
8. Detail page **Movements** section as **cards** (date, from → to, quantity).
   Clicking one opens a detailed page for that movement (who, reference, all
   detail, only about this product) with a **"See Complete transfer"** button
   opening the whole transfer.
9. After Movements, a **History** section: everything about the product —
   purchased, order received, dispatched from order department, delivered,
   transfers — with accounting (e.g. ledger), **exportable to Excel**, nested
   pages, very readable on **mobile** and PC.
10. **Throughout the project, the calendar must not allow dates before today.**

### What was built

**Backend** (`backend/vizo-backend`)

| Piece | Where |
|---|---|
| SKU rules | `Services/SkuGenerator.cs` — `VZ-WORD-MODEL-CAT-COLOUR-NN` |
| SKU decided at save, in the insert's transaction, under `pg_advisory_xact_lock(4242001)` | `InventoryController.ResolveSku` |
| Live preview + duplicate check | `POST /api/inventory/products/sku-preview` `{name, categoryId, brandId, barcodes[]}` → `{sku, source: generated|barcode|incomplete, barcodeSkuTaken, parts{word,model,category,color}, duplicate{id,name,sku}}` |
| Barcode owner lookup | `GET /api/inventory/barcodes/lookup?code=&excludeProductId=` → `{code, taken, owner, sku}` |
| Duplicate name refused | `ValidateProduct` — normalised name (trim, collapse spaces, upper-case) |
| Duplicate barcode refused by name | `ValidateProduct` (was a 500 on the unique index) |
| `ProductRequest` | `Sku` now optional; `OpeningCost` gone; `DutyPrice` added; margin computed server-side |
| Pricing columns | `Models/Product.Custom.cs` (`DutyPrice`, `MarginPrice`, ignored `LandedCost`); mapped in `AppDbContext.Custom.cs` |
| Margin on reads | Derived as `SalePrice − CostPrice − DutyPrice` (so rows written by the old build are right) |
| Default brand | `GET /api/inventory/lookups` → `defaultBrandId` (brand named "VIZO", looked up by name) |
| Product list | server-side `status` filter before paging; `stats` over the whole catalogue; `marginPercent` on each row; pageSize cap raised so the export gets everything; export has Duty / Margin / Margin % columns |
| Movements as cards | `GET /api/inventory/products/{id}/movements?kind=&page=&pageSize=` — a transfer is ONE card (`ProductHistoryController`) |
| One movement | `GET /api/inventory/products/{id}/movements/{movementId}` — both legs, the document (transfer / GRN / invoice / sales return / purchase return / adjustment) with facts, this product's line, the other lines, `completeLabel` + `url` |
| History | `GET /api/inventory/products/{id}/history?group=&page=&pageSize=` — timeline from POs, GRNs, supplier bills, purchase returns, customer orders, the order's journey (activity log), invoices, deliveries, sales returns, transfers, adjustments, claims, catalogue edits; plus `summary` and `groups` |
| Stock ledger | `GET /api/inventory/products/{id}/ledger` — opening + in − out = on hand, running total per row |
| Export | `GET /api/inventory/products/{id}/history/export` — 7 sheets: Summary, Timeline, Stock ledger, Purchases, Sales, Journey & delivery, Transfers |
| Multi-sheet workbooks | `Documents/XlsxWriter.FromSheets` |
| Migration | `database/19_product_pricing.sql` (section 1 run; section 2 = drop, pending) |

**Frontend** (`vizo-erp/src`)

| Piece | Where |
|---|---|
| New product form (read-only SKU preview labelled *Auto-generated*, *From barcode* tag, duplicate warning + Save disabled, VIZO pre-selected) | `app/(app)/inventory/products/new/page.tsx` |
| Five linked price boxes | `components/inventory/pricing-fields.tsx` + `lib/pricing.ts` |
| Barcode rows, per-code lookup, SKU hand-off | `components/inventory/barcode-fields.tsx` |
| Camera popup (native `BarcodeDetector`, `@zxing` fallback loaded on demand, 3-min limit, error toasts) | `components/inventory/barcode-scanner-dialog.tsx` |
| Product cards (table view one click away, remembered per device) | `app/(app)/inventory/products/page.tsx` |
| Product detail: opening cost removed; Edit uses the new pricing and barcode components; SKU read-only; tabs Stock / **Movements** / **History** / Pricing / Barcodes / Images; `?tab=` deep link | `app/(app)/inventory/products/[id]/page.tsx` |
| Movement cards | `components/inventory/product-movements.tsx` |
| One movement page | `app/(app)/inventory/products/[id]/movements/[movementId]/page.tsx` |
| History page (timeline + ledger + Export Excel) | `app/(app)/inventory/products/[id]/history/page.tsx`, `components/inventory/product-history.tsx` |
| No past dates | `lib/dates.ts` (`todayISO`, `addDaysISO`, `notPast`, `isPastDate`, `PAST_DATE_MESSAGE`), `components/ui/date-input.tsx` (`<DateInput keep=…>`) |
| Time display fix | `lib/format.ts` — API timestamps are **Pakistan time**; `formatDate` / `formatDateTime` / `formatTime` print in Asia/Karachi on every device |

**The 19 forms with the no-past-date rule:** sales orders new (order + delivery
date), sales order edit (delivery), sales invoices new (invoice + due), sales
returns new, purchase orders new (PO + expected), GRN new (receipt + batch
expiry), purchase invoices new (invoice + due), purchase returns new,
transfers new, adjustments new, expenses new + edit, journal entries new +
edit, vouchers new + edit, record-payment dialog, record-collection dialog
(collected-on + cheque date), dispatch "should reach by". Schema check + picker
`min`; edit screens keep the record's own date. Report/list filters untouched.

### SKU examples (run over all 38 live names)

```
VIZO Titan T9 Wireless Earbuds - Black     VZ-TIT-T9-EAR-BLK-01
VIZO Titan T9 Wireless Earbuds - Sky Blue  VZ-TIT-T9-EAR-SBLU-01
VIZO PowerX 10000mAh Power Bank - Black    VZ-POW-10K-POW-BLK-01
VIZO VOLT 65W GaN Type-C Charger (PD)      VZ-VOL-65W-CHA-01
VIZO Blaze Pro V65 Handfree                VZ-BLA-V65-HAN-01
VIZO LED Bulb 9W (Cool White)              VZ-LED-9W-LED-CWHT-01
VIZO G530 Samsung Battery                  VZ-SAM-G530-BAT-01
```
Existing products keep their old SKUs (`05050781` …); editing never re-derives
a SKU. Rules: brand word skipped; generic words (Wireless, Bluetooth, Smart,
Type…) and the category's own words are never the WORD; MODEL = first
letters+digits token that is not a capacity; no model → rating (10000mAh → 10K,
65W); COLOUR from after the dash or any colour word, two-word shades keep the
first letter (Sky Blue → SBLU, Rose Gold → RGLD, Cool White → CWHT).

### Pricing, as verified in the browser

```
cost 200, duty 50, margin % 20     -> margin 50,  sale 300
then margin price 75               -> 30 %,       sale 325
then cost -> 300 (price leads)     -> 75 stays,   21.43 %, sale 425
then sale typed 499                -> margin 149, 42.57 %
```
Margin % is on cost + duty. Whichever of margin price / % / sale was typed last
is held when cost or duty changes. Selling below cost is allowed with a red
warning. `MarginPrice` is stored; the % is never stored.

### How it was verified

- Backend endpoints against the live DB through a local API with minted
  super-admin tokens (see [Standing facts → Testing](#testing-against-live-data-without-a-password)).
  Refusals, lookups and previews only — **no product was created** (count
  38 before and after).
- Browser pane at desktop and 375 px: product cards, movement cards, the
  movement page (both legs, See complete transfer), history timeline + ledger
  (`0 + 584 − 121 = 463`, balances), new-product preview, case-insensitive
  duplicate warning with Save disabled, pricing arithmetic, SKU taken from a
  typed `VZ-…` barcode, transfer form refusing a hand-typed past date.
- **Not tested: an actual camera scan** — the test browser has no camera. Only
  the "permission refused" path ran, and it behaved as written.

### Live data touched

- Migration 19 section 1: added `DutyPrice`, `MarginPrice`; every product's
  `MarginPrice` back-filled to `SalePrice − CostPrice` (duty 0). 38/38 consistent.
- Nothing else written.

### Found and not changed (details in convey.txt P0–P11)

- **D1** orders never move stock (26 of 31).
- **D3** six exports capped at 50 rows.
- Timestamps written before 3 Sep were UTC and now display 5 h early (the fix
  follows the system's clock since 3 Sep).
- Leftover test data in live DB: products `ZZ-WIRING-TEST-01` (34, inactive),
  `ZZ-DROPDOWN-TEST` (36, inactive), `VZ-123-ER` (35, **Talha's — leave**),
  `CHR` "Charger" (39); empty categories `abc`, `xyz`, `powerbank`,
  `magnus 30000mah`, `Parent Example Catagory`.

---

## 2026-09-19 — "Is the backend a .NET Web API?" → README stack

Yes: ASP.NET Core 8 Web API. The root `README.md` "Backend (planned)" section
listed Redis, Hangfire and MinIO, none of which exist. Rewritten to the real
stack from the `.csproj` and `package.json` (commit `716681a`). The README's
roadmap line "Backend scaffolding" pending is still stale — not touched.

---

## 2026-09-17 — Invoices that exist, sales returns that work, reps see their own, places, stock by city, notifications

Commits: backend **`86f8af1`** · frontend **`de0c76b`**.

### What the owner asked for

1. Sales panel: after a salesman creates an order he **cannot see or print the
   invoice**; Super Admin, Warehouse and Order Dept also **cannot see the
   invoice PDF**. When Super Admin or the salesperson presses **Invoiced**, that
   order's invoice PDF must be generated and **stored on Cloudinary**.
2. Sales return fails with **"Could not load invoices and refund methods."**
   An invoiced order must **not get a second invoice**, but a **sales-return
   document** is generated.
3. When a salesperson creates a return, **Super Admin is notified**; returns
   shown in a **separate column** on the Super Admin panel, **count in red**,
   **a link** → list of orders with returns → click one → **all return
   information with its invoice** (which items, how many).
4. Each salesperson sees **only his own**: his created customers (but can still
   pick any customer when taking an order), his orders, his returns.
5. **Warehouse and Order-Dept accounts linked to a specific place**
   (e.g. Lahore-Warehouse, Karachi-Warehouse), chosen from a dropdown of places
   the admin created.
6. `/inventory/stock-levels`: dropdown for stock **by city** and the **whole
   system combined**.
7. Notifications must say **who they are for** (full name + role) and carry
   the **real domain** `https://advpos-frontend.vercel.app/`, **from env** so it
   can change.
8. Push both repos; put any env changes in `backend/database/changa.txt`.

### The three real faults behind the four symptoms

| Symptom | Actual cause |
|---|---|
| Pressing **Invoiced** gave no invoice | `PATCH /sales/orders/{id}/status` wrote a status id and nothing else. The real work lived in `POST /orders/{id}/invoice`, which the chain strip never called. **Six live orders had moved past Invoiced with no invoice** (3 delivered) |
| "Could not load invoices and refund methods" | Sales role lacked **`invoices.view`** → `GET /sales/invoices` 403 → the whole `Promise.all` failed. Also why reps could not print bills |
| Nobody could open the invoice PDF | Partly the six missing invoices; partly `PdfUrl` handed out with no check Cloudinary would serve it (delivery was blocked on the account for a period; now serving) |

### What was built

- **Invoiced now invoices** (same method both routes), idempotent (never a
  second invoice), refuses cancelled / credit-held orders, and the status only
  moves **forward** to Invoiced.
- `SalesInvoice.PdfDeliverable` + `BillViewUrl` / `EnsureBill`: every Print
  button gets the link that works; a false flag is re-checked once.
- **Sales-return credit note** = document kind `sales-return`
  (`DocumentBuilder.SalesReturn`), archived to Cloudinary on creation; return
  list/detail carry `viewUrl`, order, invoice, units returned of units sold,
  and the original bill link.
- **Super Admin dashboard**: red **Sales returns** tile — count, waiting,
  units, value credited, five most recent by order — linking to `/sales/returns`.
- Return notification to super-admin, accountant, order-dept.
- **Rep scoping:** new `Party.CreatedByUserId` (back-filled from assigned rep);
  Customers list = created by me OR assigned to me; order-form picker unfiltered.
  Orders/invoices/returns were already scoped.
- **One place per keeper / order clerk:** `AdminUsersController.ValidatePlace`
  (exactly one active location of kind `warehouse` / `department`);
  `/admin/users/new` shows a radio list of those places; staff roles only.
  Warehouse queue filtered to the keeper's own warehouse.
- **Stock by city:** `GET /inventory/stock-levels?cityId=` + `byCity`;
  `lookups.stockCities`; city picker + city chips on the page.
- **Notifications:** body ends "For <Full Name> (<Role>)."; URL absolute from
  `App:WebBaseUrl` (env `App__WebBaseUrl`, default the Vercel URL)
  (`Services/AppLinks.cs`); the bell turns same-origin links back into paths
  (`lib/app-url.ts`).
- `appsettings.json`: `App:WebBaseUrl`, and the Vercel origin added to CORS.

### Live data touched (with the owner's explicit OK)

- **Migration 18** run in full: Sales role granted `invoices.view`,
  `invoices.create`, `returns.sales`; `SalesInvoice.PdfDeliverable`;
  `Party.CreatedByUserId` (+FK, back-fill, index); LOC-01/02 renamed to
  **Karachi Warehouse / Karachi Order Department**; **Lahore Warehouse (LOC-06)**
  and **Lahore Order Department (LOC-07)** added; primary location filled for
  keepers/clerks with exactly one location.
- **The six stranded orders invoiced** through the real endpoint:
  ORD-26-0140→INV-26-8888, 0141→8889, 0143→8890, 0168→8891, 0170→8892,
  0171→8893 (dated from their orders; PDFs on Cloudinary).
- **Mistake, corrected:** raising them rewound five order statuses to
  Invoiced (the old method forced it). Restored by SQL to Dispatched ×3,
  To Order Dept, Delivered, each with an `ORDER_STATUS_RESTORED` activity-log
  row; no notifications sent. The method was fixed to move forward only.

### Owner decisions recorded

- "Run migration 18 now, all of it" — done.
- "Just invoice all six now" — done.

---

## 2026-09-03 → 2026-09-06 — earlier sessions (summary)

From `backend/database/session_summary.md`; full detail in that file and in git.

- **3 Sep — order workflow:** the 10-step chain (Draft → Submitted → Confirmed
  → Invoiced → Seen by Warehouse → On way to Order Dept → Received at Order
  Dept → Packaging → Dispatched → Delivered); Super Admin can set any status;
  reps apply for edit/delete permission; new role **warehouse-keeper**
  (`/warehouse`); reps see only their own orders/invoices/returns; permission
  policies (`perm:xxx`) replaced role lists; one Pakistan clock
  (`Services/BusinessClock.cs`); invoice PDF layout changes; SignalR live bell.
  Migrations 15 and 16. `api 596fe27, a7626b9` · `web 889323b, b98f8de`.
- **3 Sep — notifications:** every notification stores a link; every non-admin
  action notifies the admin by name; who hears each chain step is in
  `OrderWorkflow.Announcement`.
- **6 Sep — Chinese parties:** Pakistani/Chinese choice for suppliers; USCC /
  VAT No. / ID Card labels; country from `Province.Country` (migration 17);
  `/parties/[id]/edit` built. All labels in `vizo-erp/src/lib/party-tax.ts`.
  `api 30db380, 0c76373, 4ed116b` · `web 3205b15, ae4f165, 55c0204`.

---
## 2026-09-02 — The completion order: dashboards, notifications, AI

Everything in the order shipped, plus one thing that was not in it and stopped
the whole application dead.

### Configuration lives in `appsettings.json` — by decision

Earlier in this session the five credentials in `vizo-backend/appsettings.json`
(the Neon connection string, the JWT signing key, both Cloudinary API secrets
and the Gmail app password) were moved out to User Secrets / environment
variables. **The project owner reversed that.** They are back in
`appsettings.json`, which is committed, and that file is now the single source
of truth again:

- `Program.cs` no longer checks for missing secrets at startup, and its header
  describes the arrangement as it actually is.
- `UserSecretsId` is off the csproj and the local User Secrets store is empty,
  so nothing silently overrides the file.
- `SETUP.md` §6 documents `appsettings.json` as the place to look.
- Frontend variables stay in `vizo-erp/.env.local`, which is not committed.
  Copy `.env.example` and fill it in.

**`NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local` must be the exact pair of
`VapidSettings:PrivateKey` in `appsettings.json`.** They match right now. If they
ever drift, browsers subscribe successfully and every push to them is then
rejected, which looks like push simply not working.

What this means in practice: this repository is public, so the database
password, the JWT signing key, both Cloudinary secrets and the Gmail app
password are readable by anyone who opens it. That is the owner's call. If it is
ever revisited, the values have to be rotated at Neon, Cloudinary and Google —
taking them out of the file does not take them out of the history.

### 🔴 The ledger was frozen

The fiscal calendar ended 31 Aug 2026. On 1 September every posting in the
application began failing:

```
No fiscal period covers 2026-09-02, so EXP-26-0029 cannot be posted.
```

Expense approval, voucher posting, journal entries — all of it. The guard was
right; nobody had opened the next month. `database/14_fiscal_periods_forward.sql`
opens them through 2027.

**This will happen again when those run out.** The proper fix is for the
period-close screen to open the next month when it closes one.

### Admin email

`admin@advpos.pk` → `vizo.com.pk@gmail.com`, in the live database and in
`02_seed.sql`, `05_auth.sql`, `06_neon_auth.sql`, `API_CONTRACT.md` and
`SETUP.md`. **The password hash was not touched** — it is still `Admin@1234`.

### The three mock dashboards

Accountant, order-dept and sales were built entirely from `@/data` files. They
are the first screen each role sees, and every figure belonged to nobody. One
endpoint each now (`/reports/dashboard/*`), and the sales one is scoped to the
signed-in rep by the API rather than filtered in the page.

"My customers" there means assigned to this rep **or** sold to by them. The
assignment alone was too narrow — in this database plenty of orders are taken by
somebody the customer is not assigned to.

### Figures that were typed into the markup

| Page | Said | Actually |
|---|---|---|
| `/parties/suppliers` | Open POs 8, Pending GRNs 2 | 3 and 3 |
| `/purchases/grns` | 5 this week, 1,000 units | 1 and 3,945 |

Both pages were otherwise entirely live, which is the worst place for an
invented number — nobody checks a page that looks trustworthy.

### Notifications, and Web Push

The `Notification` table has existed since the first schema with a controller
that could read it and **not one line anywhere that wrote to it**.
`Services/PushNotificationService.cs` closes that: it writes the bell row, then
tries the person's browsers. A failure never fails the request that caused it.

**Every title reads `VIZO — <what happened>`** — "VIZO — Order created by
Zara". The icon is the VIZO mark, generated from `public/vizo-logo.png` onto a
square so the wordmark is not stretched; the badge is a separate
white-on-transparent file because Android draws it as a silhouette.

All **40** mapped trigger points are wired. Three could not be done as written,
and say so instead of pretending:

- **A4** "transfer sent" is not separable from "transfer created" — one action
  does both. Needs a status column on `StockTransfer`.
- **F3** nothing here finishes a backup; it creates the row. The notification
  says "started".
- **F4** there is no failed-attempt counter and no automatic lock. Failures are
  counted in memory and the administrator is told, so they can lock the account
  by hand. A real lockout wants a column on `Employee`.

Per-user, per-kind on/off ships **with** it, not after — 42 kinds at
`/profile/notifications`. Without it people mute everything inside a fortnight
and the credit-limit alert goes quiet too.

### AI — the model never calculates

Every number is computed in SQL and handed over as finished JSON. The model only
puts it in order and into a sentence. Ask a model "why did sales drop" without
the numbers and it writes a fluent, convincing, invented answer that somebody
then acts on.

```
GET /reports/sales-drop            100% SQL, no AI at all
GET /reports/sales-drop/explain    the same numbers, explained
GET /reports/recovery-priority     who to ring, by who will actually pay
GET /reports/customers/at-risk     who is drifting away
GET /reports/demand-forecast       moving average; AI only comments
GET /reports/dead-stock/advice     what to do with what will not sell
GET /reports/margin-watch          thin and negative margins
GET /reports/month-end-summary     the month in one page
POST /reports/ask                  a question, in Urdu or English
```

`/reports/ask` is the one to be careful with. The model is shown a **fixed menu**
of reports (`Services/ReportCatalogue.cs`) and picks one. It never writes SQL and
never sees a connection — a model that can write a query will eventually write a
`DELETE` while sounding entirely reasonable.

`NightlyInsightsService` runs once a night: the low-stock digest as one bundled
message, and an anomaly check whose deviation maths is mean-and-standard-
deviation over 90 days. AI only words the survivors. Asking a model "is anything
wrong today" every night produces something wrong every night.

**No Gemini key is set.** Every AI surface was verified with no key and with a
bad one: the figures always arrive, `explanation` is null, and the panel says so.
Set `Gemini:ApiKey` in user-secrets to switch it on.

### Also

- `AuthController` answered a failed sign-in with
  `save C:/Program Files/Git/api/auth/login` — a Git-Bash path expansion that
  got committed, and that users could see.
- The `Filters` button in `FilterBar` is gone. It had no `onClick` on any of the
  twelve pages that rendered it.
- `lib/app-config.ts` holds the config client components need; importing from
  `@/data/settings` was shipping 767 lines of seed data to the browser.
- `.env.example` is no longer gitignored — it was the only record of which
  variables exist, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is invisible until push
  silently fails.

### Left undone, on purpose

- **Push was never received on a real device.** The sandboxed preview browser
  blocks notification permission, so the subscribe → receive round trip is
  unproven. Everything either side of it is: the bell row is written on real
  events, `/push/config` serves the key, preferences persist. Open
  `/profile/notifications` in Chrome and press **Send a test notification**.
- **iPhone needs the app on the Home Screen.** Safari has supported push since
  16.4 but not from a plain tab. The page says so rather than offering a switch
  that cannot work.
- **`ReminderList` is still mock** (`@/data/reminders`). No dashboard renders it
  any more, but the widget is still there.
- **Test rows in the live database** — orders ORD-26-0154/0155, expenses
  EXP-26-0027 to 0029, and the reversed/cancelled documents from proving the
  endpoints. Correctly modelled, but not real business records.

---

## 2026-08-31 — Accounting on live data, and four bugs in the ledger

Nine accounting pages were asked for. Building them turned up four faults in the
posting layer that the mock pages had been hiding, and those cost more than the
pages did.

### 🔴 An approved expense never reached the ledger

`SetExpenseStatus` flipped the status to POSTED and stopped there. `EntryId`
stayed null. Every statement in the app filters on posted **journal entries**, so
an approved expense was invisible to the trial balance, the P&L and the cash
flow — the money left the drawer and no report in the system ever showed it.

`PostVoucher` had the same hole. Both now write the double entry inside the same
transaction as the status change:

| | |
|---|---|
| expense | DR expense account, CR the cash/bank account it was paid from |
| receipt voucher | DR cash/bank, CR Accounts Receivable **against the party** |
| payment voucher | DR Accounts Payable against the party, CR cash/bank |

The party goes on the control-account line as `PartyUserId`, the way the seeded
vouchers already did it, so aged receivables can still tell whose money it was.

### 🔴 Reversing an entry left the ledger holding the negative of it

The reversal marked the original REVERSED and posted a mirror. But every
statement filters `StatusKey == "POSTED"`, so the original dropped out while the
mirror stayed in. A reversed 5,200 expense came out as **−5,200**, not nothing.

Marking both sides REVERSED would balance, but it rewrites history: an expense
posted in July and reversed in August would vanish from July's P&L, and July was
already reported.

So the original **stays POSTED** and a new column records what undid it —
`JournalEntry.ReversedByEntryId`, added by `database/12_journal_reversal_link.sql`,
which also repairs the pairs already written the old way. Both entries count,
they cancel where they should, each period keeps the figures it actually had, and
the screen can still say "reversed by JV-26-0181".

The column lives in `Models/JournalEntry.Custom.cs`, not the scaffolded file —
same reason as `AppDbContext.Custom.cs`. **Delete both if you re-scaffold.**

### 🔴 Every hand-written journal entry was typed "Sale"

`CreateJournalEntry` looked up `TypeKey == "MANUAL"`. There is no MANUAL row in
`JournalEntryType` — the key is `JOURNAL`. `FirstOrDefaultAsync` does not
complain about a miss, so the `?? FirstAsync()` fallback handed every manual
entry the **first type in the table, which is SALE**. Two entries in the database
were already mistyped.

### 🔴 Expenses and claims were numbered by timestamp

`EXP` and `CLM` were never added to `DocumentSeries`. `NextNumber` does not throw
on a missing series — it falls back to `PREFIX-yyyyMMddHHmmss` and carries on —
so rows came out as `EXP-20260831165938` instead of `EXP-26-0026`. Nobody can read
that and no report can sort it.

This is the third time this trap has bitten (`SO` vs `ORD`, then the counters
behind their data in migration 09). `database/11_series_expense_claim.sql` adds
both series, winds them past the existing rows, renames the two timestamp rows
and fixes their `DocumentFile.DocNo`. Safe to run twice.

**If you add a `NextNumber("XYZ")` call, add the XYZ series in the same commit.**

### What the accounting API gained

```
PUT    /accounting/expenses/{id}            DELETE /accounting/expenses/{id}
PATCH  /accounting/expenses/{id}/status     POST   /accounting/expenses/{id}/reverse
PUT    /accounting/journal-entries/{id}     DELETE /accounting/journal-entries/{id}
POST   /accounting/journal-entries/{id}/reverse
PUT    /accounting/vouchers/{id}            DELETE /accounting/vouchers/{id}
POST   /accounting/vouchers/{id}/cancel
GET    /accounting/open-invoices?kind=sales|purchase&partyId=
GET    /accounting/{expenses|journal-entries|vouchers}/export
```

One rule governs all of it: **a draft is scratch, a posted document is history.**
`WhyLocked()` is the single place that decides, so all three modules refuse an
edit with the same sentence.

Cancelling a posted voucher reverses its entry **and releases its allocations**,
so the invoices it cleared go back to owing. Without that, cancelling a bounced
cheque left the customer credited for money that came back.

All three lists now page, filter and search on the server and return their
summary figures over the **whole filter, not the page** — a card that changes
when you turn to page two is not a total.

`ValidateExpense` also got stricter: the expense account must be in the Expenses
group and the paid-from account must be Cash & Bank. Nothing stopped an expense
being booked against Owner Capital before, and the entry balanced perfectly while
saying something untrue.

### The nine pages

| Page | What it does now |
|---|---|
| `expenses/`, `journal-entries/`, `vouchers/` | Server search, status and date filters, type tabs (vouchers), server paging, real summary cards, clickable rows, `.xlsx` export |
| `*/new` | Every dropdown from `/accounting/lookups`. Journal entries and vouchers can Save as Draft **or** Save & Post. The voucher form pulls the party's real open invoices and allocates against them |
| `*/[id]` | View, inline edit (drafts only), delete, post/approve, reject, reverse/cancel — each wired to its endpoint, each with the API's own error wording |

Three things were **removed** rather than left dead: the receipt-upload dropzone
(no upload endpoint exists), the per-voucher Reconcile button (reconciliation
happens on its own screen, which the page now links to), and the entry-type
dropdown on the journal form (the API always writes JOURNAL).

### Also

- **`components/ui/pager.tsx`** is new. `DataTable` pages the array it was handed,
  which is wrong when page 2 is a request nobody has made yet.
- **The `Filters` button in `FilterBar` opened nothing on every page in the app.**
  It now renders only when a page supplies no filter controls of its own. Pages
  that hand in real filters no longer show a dead button next to the working ones.
- **Accounting screens use the API's `statusName`, not `statusLabel()`.** The
  shared helper speaks shopkeeper on purpose — POSTED reads "Confirmed",
  REVERSED reads "Undone". Right for sales, wrong for an accountant reading a
  ledger.
- **`backend/database/db_ans.pdf`** — the three answers that were asked for, in
  Roman Urdu: what is still static, where AI is worth adding and which free
  provider to use, and a 40-point map of where Web Push notifications belong.
  Q3 is planning only, no code, as requested.

### Left undone, on purpose

- **Nothing writes a `Notification` row.** The table and the three read endpoints
  exist; not one controller inserts. The bell shows six seed rows and always will.
  The 40 insertion points are mapped in `db_ans.pdf` §Q3 — that map is the work
  order for both the notification rows and Web Push.
- **Test rows are in the live database.** `EXP-26-0027` (reversed), `EXP-26-0028`
  (Nayatel, posted), `JV-26-0182`/`0183`, `RV-26-0512`/`0513` (both cancelled) were
  created while proving the endpoints. They are correctly modelled, not junk, but
  they are not real business records — delete them if you want the books clean.

---

## 2026-08-30 (later) — Cloudinary-first documents, and a real .xlsx export

Two things asked for, and a bug found on the way to the first.

### 🔴 The Print and Download buttons shipped yesterday were broken

Every one of them did `window.open(".../api/.../pdf")`. **A browser navigation
sends cookies and NOT the `Authorization: Bearer` header**, which every `/api`
route requires — so every Print and Download button opened a 401 page.

It was not caught because they were verified with curl and a bearer token, not
by clicking them. Proof of the failure:

```bash
curl -sk -o /dev/null -w "%{http_code}\n" \
  "https://localhost:7177/api/documents/purchase-order/1/download"     # 401
```

The fix is also the thing that was asked for: **open the Cloudinary URL, which
needs no header at all.**

### Documents are archived when they are created, not when a button is pressed

Nine create actions now push their PDF to Cloudinary before returning —
purchase orders, goods receipts, purchase invoices and returns, stock
adjustments and transfers, journal entries, expenses and vouchers. Sale
invoices already did.

So by the time anybody can press Print, the file exists and the screen already
holds its link. Print and Download open **that document's own file**:

| | |
|---|---|
| link already in hand | opens straight away, no round trip |
| never archived | archived first, then opened |

The failure is logged and swallowed on purpose. By the time it runs the order is
taken, the stock has moved and the money is in the drawer. Failing the request
because a document store was briefly unreachable would tell the operator the sale
did not happen, and they would ring it up twice. The PDF can be rebuilt from the
row; the sale cannot.

Proved, on a purchase order created through the API:

```
POST /api/purchases/orders   ->  PO-26-0065
DocumentFile, one second later:  purchase-order | PO-26-0065 | deliverable | 5131 bytes
```

Nobody pressed anything.

### One document, not three

Before this there were three ways to get the same bill — render it fresh,
download the stored copy, or share the link — and only the last touched
Cloudinary. Three paths to one document is three things that can disagree.

Now the bytes on screen are the bytes in the store are the bytes the customer was
sent over WhatsApp.

`GET /documents/{kind}/{id}/download` and `GET /sales/invoices/{id}/download`
still exist and 302 to the stored file, archiving on the way if needed. They are
for API callers that can send the header. **Do not wire a `window.open` to them**
— that is the bug above.

`attachment=true` inserts Cloudinary's `fl_attachment` so Download saves the file
and Print previews it. `CloudinaryUrl.AsAttachment` on the API and `asAttachment`
in `lib/documents.ts` are deliberate mirrors of each other.

`openDocumentWhenReady` opens the tab **synchronously inside the click** and
points it at the file once the URL arrives. Opening it after the `await` instead
is what every popup blocker on earth is built to stop.

### Export produces a real .xlsx

Four Export buttons existed. One showed a toast; three had no `onClick` at all.
All of them now download a workbook, and two more lists gained the button:

```
/sales/orders          /sales/invoices        /sales/returns
/sales/direct/walkin   /purchases/orders      /parties        /inventory/products
```

Each endpoint runs the **same list action the screen runs** and writes its
result, so the file is what was on the page, filters and all. Money, dates and
counts are typed cells — a date column sorts by date and a total column sums —
rather than text that merely looks like numbers. Frozen header and auto-filter,
because an export nobody can sort is a screenshot with extra steps.

`Documents/XlsxWriter.cs`, no NuGet package. EPPlus went commercial at v5 and
wants a licence key at startup; ClosedXML drags in the whole OpenXML object model
for one sheet of one table. An `.xlsx` is a zip of six small XML parts and
`System.IO.Compression` is in the framework — same reasoning as the PDF writer.

The `/sales/invoices` CSV built in the browser last session is gone; one export
format across the app beats two that behave differently.

### Also

- **`DocumentBuilder` was extracted out of `DocumentsController`.** It had to be:
  a document is archived from Purchases, Inventory and Accounting now, and a
  controller cannot reach another controller's private methods.
- **A class called `Cloudinary` silently shadowed the SDK's own type** — same
  namespace as `PdfStore`, which uses it. Renamed `CloudinaryUrl`. The codebase
  already documents this trap for `Claim` and `Account`.
- **`.next` was serving 404s for every route.** A production `next build` ran
  earlier in the session, and `next dev` then read that directory. Trap 14 in
  Standing facts covers it; `rm -rf .next` fixes it.

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

*Rewritten 2026-09-21. The owner's open decisions are **D1–D7** in §1; this
is the full list.*

### Owner decisions (see §1 for the options)

- **D5 — assign customers to the right salesman. Now blocking**: two reps have
  none, and the picker is their own list since 21 Sep, so they cannot raise an
  order. `changa.txt` §B1.
- **D1 — the 26 past orders.** Answered for new orders on 22 September: stock
  comes off at Dispatched, from the place the screen asks for. The orders
  dispatched before that still need a one-off correction.
- **D8 — no reader key**, so a CNIC has never actually been read here.
- **D7 — nothing posts a sale invoice or a return to the ledger.** 39 invoices,
  12 journal entries, all seeded.
- **D2 — scope of the no-past-dates rule** (report filters, cheque date,
  supplier bill date, API enforcement).
- **D3 — the six exports capped at 50 rows.**
- **D4 — Ahmed Riaz's place.**

### Deploy steps (changa.txt)

- Assign customers to reps (§B1) — no deploy needed, and two reps are stuck
  until it is done.
- Deploy the API (`5ceecb1`), **then** drop `OpeningCost` (19 §2).
- `npm install` (zxing). `App__WebBaseUrl` on the host. CORS origin check.
- Everyone signs out/in — a rep's old token still carries the rights migration
  20 took away. Camera test on a real phone.

### Older items still open (re-checked 2026-09-20)

1. **🔴 Credentials are public and not rotated.** `appsettings.json` is in a
   public repo with the Neon password, JWT key, two Cloudinary secrets and a
   Gmail app password. Owner's decision is to keep them in the file; rotating
   is still worth doing. Rotating the JWT key also kills every shared
   `/sales/bill/…?k=` and `/documents/open/…?k=` link.
2. **`UpdateCategory` writes `ParentCategoryId = body.ParentId`** — 0 for "top
   level", which breaks the FK. Create path is fixed; update path is not
   (`InventoryController.cs` ~line 623). Talha's area — ask him.
3. **`NextNumber` is not atomic** — two documents in the same instant can take
   one number. Fix = one Postgres sequence per series (`db_code_changes.txt` §3.1).
4. **Trial balance**: posted movement ties; the seeded opening balances are
   51,256,709 out. It is the data.
5. **VAPID public key in `vizo-erp/.env.example` ≠ server's.** `.env.local` is
   right. Copy `VapidSettings:PublicKey` into `.env.example`.
6. **Login screen has no warehouse panel** (panels only pre-fill an email;
   typing it works). Owner said not to touch that file.
7. `system@advpos.pk` (user 11) is a super-admin service account — consider
   deactivating.
8. **Ten of ~39 invoices have no archived PDF.** Nothing breaks (rendered on
   demand, archived on first open).
9. **Timestamps written before 3 Sep** were UTC and now display 5 h early.
10. **INV-26-8888…8893** were issued on 17 Sep for orders from Aug/Sep, so
    invoice numbers are not in date order there.
11. Debug `console.log` left in `login/page.tsx` (~114) and
    `super-admin-dashboard.tsx` (~119).
12. Old statuses `PROCESSING` (90) and `PACKED` (91) still in `OrderStatus`;
    old orders point at them; hidden from dropdowns.
13. README roadmap still lists "Backend scaffolding" as pending.

### Mock data still imported by the frontend

The accounting forms listed here on 2 Sep are **live now**. What still imports
`@/data/*` (presentational, not business figures):

| File | Imports |
|---|---|
| `components/layout/top-bar.tsx` | `quickCreate` from `@/data/mock` |
| `components/layout/shortcut-sheet.tsx` | `shortcuts` from `@/data/settings` |
| `components/widgets/reminder-list.tsx` | `remindersFor` from `@/data/reminders` |
| `components/widgets/order-delivery-card.tsx` | `DELIVERY_STATE_VARIANT` (`@/data/sales`), `getChannel` (`@/data/settings`) |
| `components/widgets/order-payment-card.tsx` | `collectionsFor` etc. from `@/data/collections` |
| `components/dialogs/record-collection-dialog.tsx` | the `CollectionMethod` type only |

`reminder-list` and `order-payment-card` still compute from mock arrays — worth
wiring to the API when next in that area.

### Test rows in the live database

| What | State |
|---|---|
| Product 34 `ZZ-WIRING-TEST-01` | inactive — safe to delete |
| Product 36 `ZZ-DROPDOWN-TEST` | inactive — safe to delete |
| Product 35 `VZ-123-ER` | **Talha's — leave alone** |
| Product 39 `CHR` "Charger" | active, real-looking — ask before touching |
| Categories `abc`, `xyz`, `powerbank`, `magnus 30000mah`, `Parent Example Catagory` | no products — ask before deleting |

Removal SQL for the ZZ products is in `db_code_changes.txt` §12.

---

## Standing facts

### How to run (this machine)

```bash
# backend -- https on 7177, which is what vizo-erp/.env.local points at
cd backend && mv global.json global.json.bak
cd vizo-backend && ASPNETCORE_ENVIRONMENT=Development \
  ASPNETCORE_URLS="https://localhost:7177;http://localhost:5275" dotnet run --no-launch-profile
# ...and when done:  cd .. && mv global.json.bak global.json

# frontend
cd vizo-erp && npm install && npm run dev        # :3000
```

`dotnet dev-certs https --trust` once. In Claude sessions, start the frontend
with the preview tool, configuration **`advpos-dev`** in `vizo-erp/.claude/launch.json`.
The API starts two hosted services (confirmation reminders after 1 minute,
nightly insights at 20:30) that can write notifications — keep local runs short.

### Staff accounts (live DB, 2026-09-20)

| Role | Name | Email | Primary place |
|---|---|---|---|
| super-admin | Umer Memon | `vizo.com.pk@gmail.com` | Karachi Warehouse |
| super-admin | AdvPOS System | `system@advpos.pk` | Karachi Order Dept |
| accountant | Hassan Raza | `accounts@advpos.pk` | Karachi Warehouse |
| accountant | Nadia Hussain | `nadia@vizo.com.pk` | Karachi Order Dept |
| order-dept | Bilal Ahmed | `order@advpos.pk` | Karachi Order Dept |
| order-dept | Junaid Akhtar | `junaid@vizo.com.pk` | Karachi Order Dept |
| order-dept | Ahmed Riaz | `ahmed@vizo.com.pk` | **Karachi Warehouse (wrong — D4)** |
| sales | Zara Malik | `sales@advpos.pk` | Shop 2 |
| sales | Imran Iqbal | `imran@vizo.com.pk` | Shop 2 |
| sales | Sara Khan | `sara@vizo.com.pk` | Karachi Order Dept |
| sales | Muhammad AMMAR KAMRAN | `ammarkamran2005@gmail.com` | Claim Stock |
| sales | Asad Ali | `asad@vizo.com.pk` | Karachi Order Dept — **inactive** |
| warehouse-keeper | Talha | `muhammadtalhabinsuhail@gmail.com` | Karachi Warehouse |

Passwords as recorded in August (**not re-verified since**): the super admin's
password was left unchanged when its email moved to `vizo.com.pk@gmail.com`;
the four seed accounts used `Admin@1234` / `Accounts@1234` / `Order@1234` /
`Sales@1234`; the rest `Vizo@1234`.

### Testing against live data without a password

Every endpoint check in the 17 and 20 September sessions used a local API and a
super-admin token minted with the signing key from `appsettings.json` — the same
thing `/auth/login` does. Claim names are the long URIs; `perm` is an array of
the role's permission keys (read them from `RolePermission`).

```python
import base64, hmac, hashlib, json, time
KEY = "<Jwt:Key from appsettings.json>"
NS = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/"
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
now = int(time.time())
payload = {NS+"nameidentifier": "1", NS+"name": "Umer Memon", NS+"emailaddress": "vizo.com.pk@gmail.com",
           "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "super-admin",
           "roleId": "1", "locationId": "1", "perm": [...],   # from RolePermission
           "iss": "AdvPOS.Api", "aud": "AdvPOS.Web", "nbf": now, "iat": now, "exp": now + 1800}
head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()) + "." + b64(json.dumps(payload).encode())
token = head + "." + b64(hmac.new(KEY.encode(), head.encode(), hashlib.sha256).digest())
```

For the browser, set cookies `advpos_token=<token>` and `advpos_role=super-admin`
on `localhost:3000`. Keep checks read-only unless the owner has agreed to a write.

### ⚠️ The .NET SDK will fail on a fresh machine

`global.json` pins **SDK 9.0.317**. If it is not installed, `dotnet` does not
warn — it fails to load at all inside `backend/` with *"The command could not
be loaded"*. On this machine: move `global.json` aside for the build and put it
back (§0 point 4). Alternatively, a temporary override:

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

**Edits made to them, and why** (so nothing is a surprise on his side):
`Models/AppDbContext.cs` lost exactly one line on 2026-09-20 — the
`OpeningCost` precision mapping, because the property no longer exists.
`Models/Product.cs` (scaffolded, not on the list) lost the `OpeningCost`
property. New columns go in `*.Custom.cs` partials and `AppDbContext.Custom.cs`,
never in the scaffolded files. `global.json` is only ever moved aside and put
back. `appsettings.json` gained `App:WebBaseUrl` and a CORS origin on 17 Sep.

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
14. **`window.open` carries no `Authorization` header.** It is a plain browser
    navigation: cookies go, the bearer token does not. Pointing any button at an
    `[Authorize]` API route therefore opens a 401 page, and curl with a token
    will not reproduce it. Open the Cloudinary URL instead -- see
    `vizo-erp/src/lib/documents.ts`.
15. **A popup opened after an `await` is blocked.** Open the tab synchronously
    inside the click and set its `location` when the URL arrives.
16. **A class named after an SDK type shadows it inside the same namespace.**
    `Documents/Cloudinary.cs` silently hid `CloudinaryDotNet.Cloudinary` from
    `PdfStore`, which sits in that namespace. Same trap as `Claim` and
    `Account`. It is `CloudinaryUrl` now.
17. **Never run `next build` while `next dev` is up** -- and if a production
    build ran earlier in the session, `rm -rf .next` before starting `next dev`.
    A stale production `.next` makes **every route 404**, including `/dashboard`,
    which looks exactly like a routing bug and is not one.

18. **API timestamps are PAKISTAN time, with no zone marker.** Since 3 Sep
    `BusinessClock` writes Asia/Karachi into `timestamp without time zone`.
    The browser must read them as `+05:00` (`lib/format.ts → parseApiDate`)
    and print them in Asia/Karachi. A bare `YYYY-MM-DD` is a calendar day —
    format it in UTC or a US-timezone browser shows the day before.
19. **Default a date field with the LOCAL date** (`lib/dates.ts → todayISO`),
    never `new Date().toISOString().slice(0,10)` — that is UTC, which is
    yesterday before 5 am in Pakistan, and the no-past-dates rule then refuses
    the form's own default.
20. **List actions cap `pageSize` (200/500, fallback 50) and the `.xlsx`
    exports call them with 5000** — so an export silently stops at 50 rows.
    Fixed for products; six others still capped (D3).
21. **The order chain does not move stock** (D1). Stock only leaves through
    `/packing` and counter sales. Do not assume a delivered order reduced
    `StockBalance`.
22. **City names carry the country** (`'Lahore - Pakistan'`). An `=` match in
    SQL silently matches nothing; use `ILIKE 'Lahore%'`.
23. **Two GitHub accounts on this machine**; git uses `medocsai` by default and
    gets 403 on both repos. Push as `AmmarKamran2005` (§0 point 2).
24. **Every foreign key into `Location` is `ON DELETE CASCADE`.** Deleting a
    location does not fail when an order points at it — it deletes the order,
    and its invoice, and the movements, without a word. Move the documents
    first and assert nothing is left pointing at the row (migration 20 does
    both, and refuses to run if a transfer still names it). The same is true of
    most parent tables in this schema; check `information_schema` before any
    `DELETE FROM` a lookup table.
25. **Making an EF navigation nullable changes the SQL join.** A required FK
    projects through an INNER JOIN; the moment the property becomes `int?` it
    is a LEFT JOIN, and every projection that reads a non-nullable column off
    that navigation (`x.Invoice.InvoiceDate`) throws *"Nullable object must
    have a value"* on the first row where it is null. Cast them —
    `(DateOnly?)x.Invoice.InvoiceDate` — and guard with `x.Invoice != null`.
    Done for `SalesReturn.InvoiceId` in migration 20; four files had to change.
26. **A PDF can carry a JPEG almost unchanged, and nothing else easily.**
    `PdfCanvas.Jpeg` writes the file's own bytes as a `/DCTDecode` image
    XObject -- no decoding, no library. The declared `/Width`, `/Height` and
    `/ColorSpace` must match the JPEG's SOF marker exactly or the file will not
    open at all, so they are parsed from the marker rather than assumed, and
    CMYK and arithmetic-coded JPEGs are refused. Fetch pictures from Cloudinary
    with `f_jpg` and whatever the phone took arrives as a baseline JPEG.
27. **A method call inside an EF `Where` is a run-time failure, not a build
    one.** `.Where(c => CurrentRole() == "…")` compiles and then throws "could
    not be translated" the first time the screen is opened. Read it into a
    local first -- EF treats a local as a constant.
28. **`int.ToString()` inside an EF query** — avoided on purpose (e.g. matching
    `DocumentFile.DocKey`). Build the string list in C# and use `Contains`.

### Reference

| File | What it holds |
|---|---|
| `backend/database/08_sales_documents.sql` | Invoice PDF columns, walk-in identity, return decision. **Applied.** |
| `backend/database/09_document_series_catchup.sql` | Winds `DocumentSeries.NextNumber` past the data. **Applied. Re-run after any import with explicit document numbers.** |
| `backend/database/10_document_files.sql` | `DocumentFile` — one row per generated PDF and its Cloudinary link. **Applied.** |
| `backend/vizo-backend/Documents/` | `PdfCanvas` (a small PDF writer, no dependency), `InvoicePdf` (the bill), `DocumentPdf` (every other document and report), `DocumentBuilder` (reads one document out of the database), `PdfStore` (Cloudinary + delivery check), `DocumentArchive` (render, upload, record; **archive-on-create**), `XlsxWriter` (spreadsheet export, no dependency), `CloudinaryUrl` |
| **`/admin/documents`** (Setup → Document Store) | **Every PDF the system has generated and its real Cloudinary link.** Open this first when somebody asks where the documents go. |
| `vizo-erp/src/components/widgets/document-actions.tsx` | Print / Download / Save-to-store for one document. Used by all ten document screens |
| `vizo-erp/src/lib/documents.ts` | Opens a stored document. **Read the comment before pointing any button at an API route** |
| `vizo-erp/src/lib/export.ts` | Fetches an `.xlsx` with the auth header and hands it to the browser |
| `vizo-erp/src/components/widgets/report-toolbar.tsx` | Shared by 13 report and statement screens. Give it a `doc` prop and it renders the real PDF; without one it falls back to the browser print dialog |
| `backend/database/db_code_changes.txt` | **Every DB change, applied or not, with rollbacks.** §9–12 are the newest |
| `backend/SETUP.md` | NuGet packages, configuration, how to run |
| `backend/API_CONTRACT.md` | endpoint request/response shapes |
| `backend/database/ERD.txt` | text ERD |
| `vizo-erp/AGENTS.md` | rendering-speed rules — currently at odds with the per-page fetch brief |
| `backend/database/18_sales_scope_returns_and_places.sql` | Sales permissions, `PdfDeliverable`, `Party.CreatedByUserId`, Lahore pair. **Applied** |
| `backend/database/19_product_pricing.sql` | `DutyPrice`, `MarginPrice` (**§1 applied**); drop `OpeningCost` (**§2 not run — after deploy**) |
| `backend/database/20_places_rights_and_returns.sql` | In Transit deleted (documents moved first, 240 duplicate units dropped), billing and returns rights narrowed, `SalesReturn.InvoiceId` nullable, INVOICED renamed *Invoiced/Edit*. **Applied** |
| `backend/database/21_order_chain_and_receiving.sql` | Chain cut to seven steps (7 live orders moved), `PaymentMethod.IsForReceiving` + Meezan/Faysal, ORD-26-0171 and INV-26-8893 deleted. **Applied** |
| `backend/database/22_customer_documents.sql` | Eight columns on `Party`: the six document pictures and the bound PDF. **Applied** |
| `backend/vizo-backend/Controllers/PartyDocumentsController.cs` | Reads a CNIC and a shop card, and binds a customer's documents into one PDF. **The prompt that decides every field is in this file** |
| `backend/vizo-backend/Documents/LegalDocsPdf.cs` · `PdfCanvas.Jpeg` | The customer's document set, and the JPEG embedding written for it |
| `vizo-erp/src/app/(app)/sales/returns/new/page.tsx` | The customer-first sales return: what may come back, how much of it, and onto which shelf |
| `backend/database/changa.txt` / `convey.txt` | Owner's manual steps / found-not-changed. **Read both** |
| `backend/vizo-backend/Services/SkuGenerator.cs` | SKU rules |
| `backend/vizo-backend/Controllers/ProductHistoryController.cs` | Product movements, one movement, history, ledger, export |
| `backend/vizo-backend/Services/AppLinks.cs` | Absolute links from `App:WebBaseUrl` for notifications |
| `backend/vizo-backend/Documents/DocumentLinks.cs` | Signed account-free document links |
| `backend/vizo-backend/Services/OrderWorkflow.cs` | The 10-step chain and who may move each step |
| `vizo-erp/src/lib/pricing.ts`, `lib/dates.ts`, `lib/app-url.ts`, `lib/format.ts` | Price arithmetic; today + no-past-date rule; bell links; Pakistan-time formatting |
| `vizo-erp/src/components/inventory/*` | Barcode scanner, barcode fields, pricing fields, movement cards, history timeline |
| `vizo-erp/src/components/ui/date-input.tsx` | Date field whose calendar starts today |
