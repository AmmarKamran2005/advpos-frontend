# AdvPOS — Session Handoff (frontend + backend)

Last updated: 2026-08-25 (second session)

This is the **whole-project** handoff. `vizo-erp/handoff.md` predates the
backend and only covers the frontend mockup — read this one first, then that
one for portal-by-portal UI detail.

| File | What it holds |
|---|---|
| `backend/SETUP.md` | NuGet packages, configuration, the hand-edits, how to run |
| `backend/API_CONTRACT.md` | endpoint request/response shapes |
| `backend/database/ERD.txt` | text ERD of the tables |
| `backend/database/README.md` | schema rules and load order |

---

## Where we are

Three real parts: the **Neon PostgreSQL database**, an **ASP.NET Core 8 API**
on `https://localhost:7177`, and the **Next.js 16 frontend** on `:3000`.

**The API is complete.** 162 actions across eleven modules, every one answering
from Neon, every one wrapped in try/catch. Swagger: 129 paths / 164 operations.

**The frontend is part-converted.** 50 screens read live data; 30 still import
`src/data/*`. See the table below — it is the single most important thing on
this page.

**Every one of the 30 already has a working endpoint.** What is left is frontend
wiring, not API work: 16 detail (`[id]`) pages and 14 create (`new`) forms.

### Screens on live data

| Area | Live | Still mock |
|---|---|---|
| `/admin/**` | all 12 | — |
| `/reports` | **all 7** | — |
| `/claims` `/delivery` `/packing` `/dispatch` | **all 4** | `claims/[id]` |
| `/accounting` | coa, collections, trial balance, profit & loss, balance sheet, cash flow, journal entries, vouchers, expenses | ledger, ledgers, period-close, reconciliation, 3 `[id]`, 3 `new` |
| `/inventory` | products, categories, brands, stock levels, movements, adjustments, transfers | products `[id]`/`new`, adjustments `[id]`/`new`, transfers `[id]`/`new` |
| `/sales` | orders, invoices, returns, credit holds | 3 `[id]`, 3 `new`, direct |
| `/purchases` | orders, grns, invoices, returns | 4 `[id]`, 4 `new` |
| `/parties` | list, customers, suppliers, **new** | `[id]`, statement, visits |

Converting one is mechanical: delete the `@/data/*` import, declare the response
type locally, add the `load` callback, swap the array name. Copy
`src/app/(app)/parties/page.tsx` — it is the reference.

---

## The three parts

### 1. Database — Neon PostgreSQL 18 (Singapore)

84 tables. **PascalCase table AND column names** — `"User"."UserId"`, not
`user_id`. Always double-quote. No enums; every closed value set is a lookup
table. Row counts are real: 33 products, 21 parties, 17 orders, 104 stock rows.

`database/01`–`05` are the ORIGINAL snake_case scripts and **do not apply to
Neon**. `database/06_neon_auth.sql` is the PascalCase one that does; it is
idempotent and it is what added `PasswordResetCode` and fixed the login hashes.

### 2. Backend — ASP.NET Core 8, controller-only

No DTOs, services, interfaces or repositories. Request bodies bind to `record`
types at the foot of each controller; responses are anonymous objects shaped to
the screen.

```
Controllers/
  ApiControllerBase.cs        Fail(), Now(), Today(), CurrentUserId(), Initials(), Log()
  Admin/                      10 controllers, all [Authorize(Policy="SuperAdmin")], all on api/admin/*
  AuthController              login, /me, forgot/verify/reset/change-password, logout
  Parties Sales Inventory Purchases Accounting Claims Delivery Packing Dispatch Reports
  Notification Upload
```

**Error handling.** Every action is `try { … } catch (Exception ex) { return
Fail(ex, "…"); }`. `Fail` logs the exception and returns JSON with
`ex.GetBaseException().Message` — Npgsql puts the useful text there, while the
outer `DbUpdateException` only ever says "An error occurred while saving the
entity changes". Stack trace in Development only. A global handler in
`Program.cs` catches what happens outside an action (model binding, filters,
serialisation).

### 3. Frontend — Next.js 16

`src/proxy.ts` guards navigation; the API is the real boundary. Pages call
axios directly with `useState`/`useEffect` — no `api.ts`, per the brief.

---

## How to run

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

---

## ⚠️ Secrets are public

`vizo-backend/appsettings.json` is **committed to the public repo
`muhammadtalhabinsuhail/vizo-backend`**, with the live Neon password, the JWT
signing key, two Cloudinary API secrets and a Gmail app password — and they are
in the git history, so deleting the file does not undo it.

**Rotate all five**, then move them to user-secrets and drop the file from
tracking. `Program.cs` documents the shape with the values redacted.

Anyone holding that Neon password has full read/write on the production
database, including `UPDATE "User" SET "PasswordHash" = …`.

---

## Traps that cost real time

**0. Identity sequences. THE ONE THAT STOPPED EVERYTHING.** The seed loaded
every table with explicit primary keys, so 77 of 78 identity sequences were
still at 1 while the tables held rows up to 106. The first insert the API tried
collided with seeded row 1 and threw `23505 duplicate key`. **No record of any
kind could be created anywhere in the application.** Fixed by
`database/07_neon_sequence_reset.sql` — idempotent, re-run it any time data is
imported with explicit keys.

**1. PascalCase.** A context scaffolded from a snake_case database maps
`.HasColumnName("user_id")` and every query fails on Neon. There should be zero
`HasColumnName` calls in `AppDbContext.cs`. If you re-scaffold, delete
`Models/PasswordResetCode.cs` and `Models/AppDbContext.Custom.cs` first — the
scaffolder will generate its own and you will get duplicate definitions.

**2. `CreatedByUser` is not always a `User`.** On the purchase side
(`PurchaseOrder`, `GoodsReceipt`, `PurchaseInvoice`, `PurchaseReturn`,
`StockAdjustment`, `StockTransfer`) and on `Claim`, `Collection`, `Delivery`,
`CustomerVisit`, it is an **`Employee`**, so the name is
`.CreatedByUser.User.FullName`. On the sales side it really is a `User`. Same
for `Party.SalesPersonUserId` → `Employee`.

**3. `OpeningBalance` is stored in the account's NATURAL sign.** A Sale account
opens at +21,800,000 even though a sale is a credit. Ledger maths runs on a
debit basis, so flip credit-normal openings first — `ToDebitBasis()` in
`AccountingController`. Without it the trial balance is nonsense.

**4. Lookup keys are not the words you would guess.** `AccountGroup` is
Assets/Capital/Expenses/Liabilities/**Revenue** (plural, no "Income", no
"Equity"). `ClaimStage` has no WITH_SUPPLIER or SETTLED — it is RECEIVED, SENT,
REPLACED, CREDITED, REJECTED, WRITTEN_OFF. `OrderStatus` has no NEW; a fresh
order is SUBMITTED. Guessing does not error, it silently returns nothing.

**5. `User` has two location collections.** `User.Locations` = locations this
person is in charge of. `User.LocationsNavigation` = the `UserLocation`
junction, where they may work. Access control wants the second.

**6. `Claim` and `Account` collide with framework types.**
`using SecurityClaim = System.Security.Claims.Claim;` and
`using CloudinaryAccount = CloudinaryDotNet.Account;`.

**7. Npgsql rejects `DateTime` with `Kind = Utc`** for `timestamp without time
zone`. Everything goes through `Now()`.

**8. Middleware order.** `UseCors` → `UseAuthentication` → `UseAuthorization`.
Wrong order and pre-flight `OPTIONS` gets a 401 before CORS headers are written,
which looks exactly like a CORS bug and is not one.

**9. Never run `next build` while `next dev` is up** — they share `.next` and
the cache corrupts into a blanket HTTP 500.

---

## Known issues

**`react-hooks/set-state-in-effect` is disabled at 29 call sites.** The rule
rejects *any* setState reachable from an effect, not just a synchronous one, so
the requested "axios inside the page, driven by useState/useEffect" pattern can
never satisfy it. Each site carries an inline comment saying so. `AGENTS.md`
asks for the opposite architecture (fetch on the server, pass as props).
**Worth settling before converting the remaining ~65 screens** — that decision
is cheap now and expensive later.

**Trial balance does not balance, and that is the data.** Posted movement
balances to the cent (5,323,575 = 5,323,575). The seeded *opening balances*
carry a 51,256,709 debit imbalance. `GET /accounting/trial-balance` reports the
two separately so nobody hunts through journal entries that were never at fault.

**Numbering can collide.** `NextNumber()` reads and increments
`DocumentSeries.NextNumber` in one call; two documents in the same second could
take the same number. The real fix is a database sequence per series.

---

## Explicitly not done

- ~65 screens still on `src/data/*` (see the table at the top)
- Dispatch booking form and the packing short-pack path are not wired to
  their endpoints (`POST /packing/{id}/pack` is all-or-nothing by design)
- Server-side `can()` enforcement for non-admin screens beyond role policies
- Session listing / revocation (`/profile/sessions` 404s)
- Real backup execution — `POST /admin/backups/run` records a row
- Landed cost on imports, per-customer pricing, supplier pay-run
- Test suite, Storybook, i18n

---

## Git

Frontend → `AmmarKamran2005/advpos-frontend` (remote `new`), branch `main`.
Backend → `muhammadtalhabinsuhail/vizo-backend` (public), branch `master`.

The backend lives in Talha's repo. `backend/` here is a working copy and is
deliberately NOT tracked by the frontend repo, with two exceptions that are
committed for convenience: `backend/database/db_code_changes.txt` and
`07_neon_sequence_reset.sql`. Those two also exist in Talha's repo, which is
the authoritative copy — if they ever disagree, his wins.

**Talha owns five files. Do not overwrite them without checking:**
`global.json`, `vizo-backend.csproj`, `Program.cs`, `Models/AppDbContext.cs`,
`Controllers/AuthController.cs`. He pushed changes to all five on 2026-08-25
(commits `e05928e`, `8cabedf`), including restoring the `ValueGeneratedNever()`
hand-edit on `Role` that a stale local copy had lost.

⚠️ His `global.json` pins **SDK 9.0.317**. If that SDK is not installed,
`dotnet` fails outright in `backend/`. Install .NET 9, or relax the pin — do not
silently change the file.
