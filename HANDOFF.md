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
| **Frontend** | `AmmarKamran2005/advpos-frontend` @ `main` = **`69afbe6`** (2026-08-27, **Talha's**) + this handoff on top. |
| **Backend** | `muhammadtalhabinsuhail/vizo-backend` @ `master` = **`aa510f1`** (2026-08-27, **Talha's**). My last was `f6dcbc5`. |
| **Database** | Neon PostgreSQL 18, Singapore. PascalCase columns. Real data, shared with Talha. |
| **API** | 176 actions across 26 controllers. **176 try / 177 catch** — every action wrapped. |
| **Screens** | 97 pages. **82 on live data, 15 still on mock** (one of those 15 is half-done — see 2026-08-27). All are sales + accounting forms. |
| **Gate** | `tsc` clean · eslint **0 errors**, 83 warnings · `next build` 82 routes |

### ⚠️ Read before touching ANY repo

**Talha now pushes to BOTH repos, not just the backend.** Between 2026-08-26
and 2026-08-27 he pushed **nine commits to the frontend** and one to the
backend, and both landed after my last push. Local was behind on both.

**Always `git fetch` before staging — on the frontend as well as the backend.**
A `--force` here would delete a day of his work.

His backend change was a real fix: `POST /inventory/categories` was writing
`ParentCategoryId = 0` when "Top level" was chosen, which fails the foreign
key. He made it `body.ParentId == 0 ? null : body.ParentId`. Pulled into the
local copy on 2026-08-29.

His change was a real fix: `POST /inventory/categories` was writing
`ParentCategoryId = 0` when "Top level" was chosen, which fails the foreign
key. He made it `body.ParentId == 0 ? null : body.ParentId`.

**He fixed the create path but not the update path.** `UpdateCategory` still
reads:

```csharp
c.ParentCategoryId = body.ParentId;      // InventoryController.cs:346
```

so editing a category to "Top level" still throws the same FK error. Left as
he has it rather than changing code he is actively working in — worth a word
with him.

---

## 2026-08-29 — this handoff

No code written beyond pulling Talha's `aa510f1` into the local working copy.
Counted the real state (above) rather than trusting the previous handoff.

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

### 15 screens still on mock data

All have working endpoints. This is frontend wiring, not API work.

| Area | Files |
|---|---|
| `sales/*` | `orders/[id]`, `orders/new`, `orders` (channel helper only), **`invoices/[id]` — half-done, see 2026-08-27**, `invoices/new`, `returns/[id]`, `returns/new`, `direct` |
| `accounting/*` | `expenses/[id]`, `expenses/new`, `journal-entries/[id]`, `journal-entries/new`, `vouchers/[id]`, `vouchers/new` |
| `login` | pulls one presentational constant from `@/data/settings` |

`sales/direct` is the biggest of them. The four purchases create forms
(`purchases/*/new`) are the closest worked examples — copy their shape.

### Needs a decision, not code

1. **🔴 Credentials are public and still not rotated.**
   `vizo-backend/appsettings.json` is committed to the **public** repo with the
   live Neon password, the JWT signing key, two Cloudinary secrets and a Gmail
   app password — and they are in git history, so deleting the file does not
   undo it. Rotate all four.
2. **`CLM` document series is not in the database.** Claims created through the
   app number `CLM-20260825174238` instead of `CLM-26-0143`. One `INSERT`,
   written out in `db_code_changes.txt` §5. **Not applied.**
3. **Trial balance does not balance — and that is the data.** Posted movement
   ties to the cent; the seeded *opening balances* are 51,256,709 out. The
   endpoint reports the two separately so nobody hunts through journal entries
   that were never at fault.
4. **Document numbers can collide.** `NextNumber()` reads and increments
   `DocumentSeries.NextNumber` non-atomically. Fix is one Postgres sequence per
   series — `db_code_changes.txt` §3.1, not applied.
5. **`system@advpos.pk` (user 11) is a super-admin service account** sharing a
   working password with five other accounts. Consider `IsActive = false`.

### Test rows in the live database

| id | SKU | State |
|---|---|---|
| 34 | `ZZ-WIRING-TEST-01` | inactive — mine, safe to delete |
| 36 | `ZZ-DROPDOWN-TEST` | inactive — mine, safe to delete |
| **35** | `VZ-123-ER` | **Talha's. Leave alone.** |

Removal SQL is in `db_code_changes.txt` §12. Both of mine are `IsActive = false`,
so they cannot reach an order, invoice or packing screen.

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
9. **Never run `next build` while `next dev` is up** — they share `.next` and
   the cache corrupts into a blanket HTTP 500.

### Reference

| File | What it holds |
|---|---|
| `backend/database/db_code_changes.txt` | **Every DB change, applied or not, with rollbacks.** §9–12 are the newest |
| `backend/SETUP.md` | NuGet packages, configuration, how to run |
| `backend/API_CONTRACT.md` | endpoint request/response shapes |
| `backend/database/ERD.txt` | text ERD |
| `vizo-erp/AGENTS.md` | rendering-speed rules — currently at odds with the per-page fetch brief |
