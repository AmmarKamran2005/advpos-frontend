# AdvPOS — Continue From Here

> ## ⛔ SUPERSEDED — read `HANDOFF.md` instead
>
> This file froze on **2026-08-25** and is now wrong in ways that will waste
> your time:
>
> * It says **35 screens** are left on mock data. It is **15**.
> * It points at frontend `86217e7`. Current is **`69afbe6`** — and that
>   one is **Talha's**; he pushes to this repo too now, not just the backend.
> * It points at backend `03f7a0e`. Current is **`aa510f1`** — and that one is
>   **Talha's**, pushed 2026-08-27.
> * Its page-by-page endpoint map lists work that is already done.
>
> `HANDOFF.md` is dated newest-first and carries all of this, plus the traps
> and the settled decisions that were only in here. Kept below for history.

---

State as of **2026-08-25, end of second session**.

---

## 1. Verify you are where this file says you are

Run these four before touching anything. If any disagrees, trust the machine,
not this document.

```bash
cd "D:/Main/Sales Softwaer" && git log --oneline -1
```

Expected: `86217e7 docs: bring the handoff up to date; ignore backend secret files`

```bash
cd "D:/Main/Sales Softwaer" && git fetch new -q && git rev-parse --short main new/main
```

Expected: both `86217e7` — frontend is pushed.

```bash
gh api repos/muhammadtalhabinsuhail/vizo-backend/commits/master --jq '.sha[0:7]'
```

Expected: `03f7a0e` — backend is pushed.

```bash
cd "D:/Main/Sales Softwaer/vizo-erp" && npx tsc --noEmit && npx eslint src 2>&1 | tail -2
```

Expected: tsc silent, `0 errors, 148 warnings`.

---

## 2. Current state in one table

| | |
|---|---|
| Database | Neon PostgreSQL 18, Singapore. 85 tables, **PascalCase columns**. Real data. |
| Backend | ASP.NET Core 8, `https://localhost:7177`. **162 actions, 162 try/catch.** Swagger clean: 129 paths / 164 operations. |
| Frontend | Next.js 16, `:3000`. **50 of 80 in-scope screens on live data.** 30 left. |
| Frontend repo | `AmmarKamran2005/advpos-frontend` @ `main` = `86217e7` |
| Backend repo | `muhammadtalhabinsuhail/vizo-backend` @ `master` = `03f7a0e` (public) |

Both repos are pushed and in sync. Nothing is sitting uncommitted except the
`backend/**` working copy, which is untracked **on purpose** — the backend lives
in Talha's repo.

---

## 3. ⛔ Before you write any backend code

### Talha is an active collaborator on the backend repo

He pushed `e05928e` and `8cabedf` on 2026-08-25 *while the last session was
working*. A blind `cp -r` would have reverted all of it. **Always
`git fetch && git log` the backend repo before staging anything.**

**These five files are his. Do not overwrite them:**

```
global.json
vizo-backend/vizo-backend.csproj
vizo-backend/Program.cs
vizo-backend/Models/AppDbContext.cs
vizo-backend/Controllers/AuthController.cs
```

The push recipe that worked: clone fresh, `git reset --hard HEAD`, copy in
**only** your own files, then assert those five show no diff before committing.

### The .NET SDK will fail on a fresh machine

His `global.json` pins **SDK 9.0.317**. If it is not installed, `dotnet` does
not merely warn — it fails to load at all inside `backend/`:

> The command could not be loaded

Check with `dotnet --list-sdks`. If 9.x is missing, either install it or build
behind a **temporary local override** and restore his file before pushing:

```bash
cd "D:/Main/Sales Softwaer/backend"
cp global.json global.json.talha
printf '{\n  "sdk": { "version": "8.0.0", "rollForward": "latestFeature" }\n}\n' > global.json
# ... build / run / verify ...
mv global.json.talha global.json      # ALWAYS restore before committing
```

### forgot-password is currently disabled

Talha commented out `forgot-password` / `verify-code` / `reset-password` in
`AuthController.cs`. `POST /api/Auth/forgot-password` does **not** exist right
now. The `PasswordResetCode` table and its two model files still exist and still
compile; they are simply unused. Do not "fix" this without asking him — it was a
deliberate edit.

---

## 4. The next task: 35 screens

30 still import `src/data/*`; 5 more are static. **Every one already has a
working endpoint** — this is frontend wiring, not API work.

### Detail pages (16) — read-only, mechanical, do these first

| Page | Endpoint |
|---|---|
| `parties/[id]` | `GET /api/parties/{id}` |
| `parties/[id]/statement` | `GET /api/parties/{id}/statement` |
| `claims/[id]` | `GET /api/claims/{id}` (+ `POST {id}/send`, `{id}/settle`) |
| `sales/orders/[id]` | `GET /api/sales/orders/{id}` (+ `PATCH {id}/status`) |
| `sales/invoices/[id]` | `GET /api/sales/invoices/{id}` |
| `sales/returns/[id]` | `GET /api/sales/returns/{id}` |
| `purchases/orders/[id]` | `GET /api/purchases/orders/{id}` (+ `POST {id}/approve`) |
| `purchases/grns/[id]` | `GET /api/purchases/grns/{id}` |
| `purchases/invoices/[id]` | `GET /api/purchases/invoices/{id}` |
| `purchases/returns/[id]` | `GET /api/purchases/returns/{id}` |
| `inventory/products/[id]` | `GET /api/inventory/products/{id}` (+ `PUT`) |
| `inventory/adjustments/[id]` | `GET /api/inventory/adjustments/{id}` |
| `inventory/transfers/[id]` | `GET /api/inventory/transfers/{id}` (+ `POST {id}/receive`) |
| `accounting/journal-entries/[id]` | `GET /api/accounting/journal-entries/{id}` (+ `POST {id}/post`) |
| `accounting/vouchers/[id]` | `GET /api/accounting/vouchers/{id}` (+ `POST {id}/post`) |
| `accounting/expenses/[id]` | `GET /api/accounting/expenses/{id}` |

These are 420–470 lines each. That size is why the last session stopped here
rather than rushing them.

### Create forms (14) — need lookups + POST

| Page | Endpoint | Lookups |
|---|---|---|
| `sales/orders/new` | `POST /api/sales/orders` | `GET /api/sales/lookups` |
| `sales/invoices/new` | `POST /api/sales/invoices` | `GET /api/sales/lookups` |
| `sales/returns/new` | `POST /api/sales/returns` | `GET /api/sales/lookups` |
| `sales/direct` | `POST /api/sales/direct` | `GET /api/sales/lookups` |
| `purchases/orders/new` | `POST /api/purchases/orders` | `GET /api/purchases/lookups` |
| `purchases/grns/new` | `POST /api/purchases/grns` | `GET /api/purchases/lookups` |
| `purchases/invoices/new` | `POST /api/purchases/invoices` | `GET /api/purchases/lookups` |
| `purchases/returns/new` | `POST /api/purchases/returns` | `GET /api/purchases/lookups` |
| `inventory/products/new` | `POST /api/inventory/products` | `GET /api/inventory/lookups` |
| `inventory/adjustments/new` | `POST /api/inventory/adjustments` | `GET /api/inventory/lookups` |
| `inventory/transfers/new` | `POST /api/inventory/transfers` | `GET /api/inventory/lookups` |
| `accounting/journal-entries/new` | `POST /api/accounting/journal-entries` | `GET /api/accounting/lookups` |
| `accounting/vouchers/new` | `POST /api/accounting/vouchers` | `GET /api/accounting/lookups` |
| `accounting/expenses/new` | `POST /api/accounting/expenses` | `GET /api/accounting/lookups` |

**`parties/new` is the worked example.** It was the archetypal fake — it slept
800 ms, toasted "Customer added", and navigated away having written nothing. It
now POSTs for real, swaps the free-text city box for a select off the `City`
table, derives province from the chosen city, and lets the server allocate the
`VZ-C-####` code. Copy its shape.

### Remaining list/static pages (5)

| Page | Endpoint |
|---|---|
| `accounting/ledger` | `GET /api/accounting/ledger?accountId=&from=&to=` |
| `accounting/ledgers` | `GET /api/accounting/coa` (account picker) |
| `accounting/period-close` | `GET /api/accounting/periods` (+ `POST {id}/close`) |
| `accounting/reconciliation` | `GET /api/accounting/reconciliation` |
| `parties/visits` | `GET /api/parties/visits` |

### Two half-wired actions

- **Dispatch booking form** — `POST /api/dispatch/{id}/dispatch` exists and is
  tested; the form is not wired to it.
- **Packing short-pack** — deliberately removed from the dialog.
  `POST /api/packing/{id}/pack` is all-or-nothing by design (it refuses the whole
  order if any line is short). Do not add a button that would always fail.

---

## 5. The conversion recipe

Reference file: `vizo-erp/src/app/(app)/parties/page.tsx`.

1. Delete the `@/data/*` import. **Never leave it** — importing a data module
   from a client component ships the whole mock file in the bundle
   (`AGENTS.md` rule 5).
2. Declare the response `type` locally in the page. Types are per-page on
   purpose; there is no shared types module, matching the "each page owns its
   call" brief.
3. Add `rows` / `loading` / `error` state and a `load` callback with axios +
   `authHeader()`.
4. `React.useEffect(() => { void load(); }, [load])` with the
   `eslint-disable-next-line react-hooks/set-state-in-effect` comment.
5. **Do not put `setLoading(true)` at the top of `load`** — `loading` already
   starts `true`, and it triggers the purity rule.
6. Add the error `<Card>` with a "Try again" button, and `<Skeleton>` while
   loading.
7. `npx tsc --noEmit` after every 2–3 pages. It catches the vocabulary
   mismatches (see §6) that a browser check would miss.

**Expect TypeScript to find real bugs.** Every mismatch it flagged last session
was the mock's vocabulary disagreeing with the database, not a typing nuisance.

---

## 6. Traps that already cost hours

Full list is in `HANDOFF.md`. The four that bite during page conversion:

1. **Lookup keys are not the obvious words.** `AccountGroup` is
   `Assets / Liabilities / Capital / Revenue / Expenses` — plural, no "Income",
   no "Equity". `ClaimStage` has no `WITH_SUPPLIER` or `SETTLED`; it is
   `RECEIVED / SENT / REPLACED / CREDITED / REJECTED / WRITTEN_OFF`.
   `OrderStatus` has no `NEW`; a fresh order is `SUBMITTED`. **Guessing does not
   error — it silently returns nothing.** The CoA summary tiles read zero for
   exactly this reason.
2. **`CreatedByUser` is not always a `User`.** On the purchase side, and on
   `Claim` / `Collection` / `Delivery` / `CustomerVisit`, it is an **`Employee`**
   — so the name is `.CreatedByUser.User.FullName`. Sales side is a real `User`.
3. **Delivery has 8 statuses, not 6.** The mock knew one `ON_THE_WAY`; the
   database splits it into `BOOKED / AWAITING / IN_TRANSIT / OUT_FOR_DELIVERY`
   plus `NOT_DISPATCHED` and two failure states.
4. **`DataTable` requires an `id` field** on every row type.

To confirm any lookup, ask the database rather than guessing:

```bash
psql "$NEON_URL" -c 'SELECT "StatusKey" FROM "OrderStatus" ORDER BY "SortOrder";'
```

---

## 7. Settled decisions — do not re-litigate

| Decision | Why |
|---|---|
| axios + `useState`/`useEffect` **inside each page**, no `api.ts` | Explicit client brief, stated twice. |
| `react-hooks/set-state-in-effect` disabled at 29 sites | The rule rejects *any* setState reachable from an effect, so the requested pattern can never satisfy it. Disabled per-site with the reason inline, not globally. **This contradicts `AGENTS.md`, which wants server-side fetching — worth settling before the last 35 screens, but it is a client decision, not a code one.** |
| No DTOs, services, interfaces, repositories | Explicit brief. `ApiControllerBase` is plain controller inheritance — not a service, nothing in DI. |
| Request records nested per controller | Brief says "at the foot of each controller". Causes duplicate names, which is why `CustomSchemaIds` is required in `Program.cs`. |
| Secrets **redacted** in the `Program.cs` comment block | The brief asked for both config files pasted in verbatim. The repo is **public**; pasting live values would publish a database password. Structure is complete, values are `<PLACEHOLDERS>`. |
| Backend not tracked by the frontend repo | It lives in Talha's repo. Two exceptions committed for convenience: `db_code_changes.txt` and `07_neon_sequence_reset.sql` — **his copies are authoritative.** |

---

## 8. Open items that are not code

1. **🔴 Credentials are public and still not rotated.**
   `vizo-backend/appsettings.json` is committed to the public repo with the live
   Neon password, JWT signing key, both Cloudinary secrets and a Gmail app
   password — and they are in the git history, so deleting the file does not
   undo it. That is how the last session reached the database at all. Rotate all
   four; `git rm --cached` plus history purge, or accept the old values are
   public forever and rely on rotation. **Nothing in either recent commit adds
   to this.**
2. **`system@advpos.pk` (user 11) is a super-admin service account** with a
   working password shared with five other accounts (`Vizo@1234`). Consider
   `IsActive = false`.
3. **Trial balance does not balance — and that is the data, not a bug.** Posted
   movement ties to the cent (5,323,575 = 5,323,575); the seeded *opening
   balances* are 51,256,709 out. The endpoint reports the two separately so
   nobody hunts through journal entries that were never at fault. Needs a
   balancing entry before the books can be trusted.
4. **Document numbers can collide.** `NextNumber()` reads and increments
   `DocumentSeries.NextNumber` non-atomically. Fix is one Postgres sequence per
   series — written up in `db_code_changes.txt` §3.1, not applied.

---

## 9. Database changes already applied to Neon

All recorded in **`backend/database/db_code_changes.txt`** with rollbacks.

| § | Change | Status |
|---|---|---|
| 0 | **Identity sequence reset** — 77 of 78 sequences were parked at 1 while tables held rows up to 106, so **every insert anywhere in the app threw `23505 duplicate key`.** Nothing could be created at all. `07_neon_sequence_reset.sql`, idempotent. | ✅ applied |
| 1 | `PasswordResetCode` table added (the only table this project added) | ✅ applied |
| 2 | Real BCrypt hashes on rows 2–11 — they carried a literal `$2b$12$PLACEHOLDER…` string, so **ten of eleven accounts could not sign in** | ✅ applied |
| 3 | Sequence-per-series; opening-balance correction | ⛔ not applied, your call |

**If seed data is ever re-imported with explicit ids, re-run `07`** or every
create starts failing again.

---

## 10. Suggested order of work

1. `parties/[id]` and `parties/[id]/statement` — completes the Parties module,
   and it is what the client opened first.
2. The other 14 detail pages — read-only, low risk, high visible progress.
3. The 14 create forms — copy `parties/new`.
4. `accounting/ledger` + `ledgers`, `period-close`, `reconciliation`,
   `parties/visits`.
5. Wire the dispatch booking form.
6. Then, and only then, the `AGENTS.md` rendering-speed refactor — it is a
   whole-app change and should not land mid-conversion.

Verify each batch with `npx tsc --noEmit`, then `npx next build`, then click
through against the running backend. **Never run `next build` while `next dev`
is up** — they share `.next` and it corrupts into a blanket HTTP 500.
