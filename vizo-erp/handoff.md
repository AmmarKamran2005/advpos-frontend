# AdvPOS — Session Handoff

**Read `context.md` first** for stack, conventions and repo layout. This file is
the volatile "where we are right now" companion — update it at the end of each
significant work session.

Last updated: 2026-08-19

---

## Where we are

The frontend has been **reshaped for the real client** (a Karachi
mobile-accessories distributor, currently on a FoxPro app called CSD Program
Manager) and all **four role portals are feature-complete as a click-through
mockup**. Still no backend — every mutation is `setState` + toast, reload
resets. Next real step is the backend (ASP.NET Core + PostgreSQL on Neon,
Singapore region — see the discussion notes below).

### The four portals (each has its own dashboard + signature screens)

| Role | Login | Opens on | Signature work |
|---|---|---|---|
| **Sales** | `sales@advpos.pk` | orders + money | take order, record collection, customer statement |
| **Order Dept** | `order@advpos.pk` | work queue | packing, dispatch, claims, counter sale |
| **Accountant** | `accounts@advpos.pk` | confirm queue | confirm collections, payables |
| **Super Admin** | `admin@advpos.pk` | owner overview | limit-cross approval |

Password for all four: **`advpos1234`**. Login page has clickable role panels
that fill the credentials in. Role also switchable live from the top-bar
"Viewing as" dropdown (demo affordance, `SessionProvider`).

### The spine that ties it together

An order flows **Sales → Order Dept → Accountant**, and the design keeps three
deliberate control gaps that a reviewer should not "fix":

1. **Rep-collected cash waits for Accounts.** A sales rep logs a field
   collection; it sits as "awaiting Accounts" and does NOT move the customer
   ledger until the accountant confirms it (`/accounting/collections`). Stops a
   rep sitting on cash while the books look settled.
2. **Delivery confirmation is owned by channel, not person.** Four routes
   (Karachi own-team / online courier / local cargo / heavy freight), each with
   a different confirmer and its own reminder timer. Buttons appear only for the
   role that owns that channel.
3. **Limit-cross is the owner's call.** A rep can't set a limit, the accountant
   sets it, but letting a live order through over its limit is a risk decision
   surfaced on the Super Admin dashboard.

### Reminders (`data/reminders.ts`) — the software chases the staff

Derived from dates, never stored — finish the work and the row disappears.
Covers: deliveries unconfirmed, claims unsent / stuck with supplier, orders
unpacked, collections unconfirmed, supplier payments due/overdue. Each is
addressed to the role that owns it and shown in the `ReminderList` widget on
that role's dashboard.

---

## What was done, most recent first

| Commit | What |
|---|---|
| `0be27b8` | Super Admin portal — owner dashboard + limit-cross approval; generic 660-line dashboard reduced to a 10-line mount; deleted orphan `/zakat` routes |
| `3b4fe16` | Accountant portal — confirm-collections screen, work-queue dashboard, payable/collection reminders; renamed nav "Money Received" → "Vouchers" |
| `585d11e` | Order Dept — packing bench + dispatch (the 4 delivery routes are chosen here) |
| `d85050a` | Order Dept — claims (backbone), reminders, counter sale, work-queue dashboard |
| `2e53f56` | Cleared all React Compiler bail-outs (18 → 0 ESLint errors); moved dashboards into `components/portals/<role>/` |
| `ed5b7a9` | Sales portal finalised — orders/money focus, collections, statement, credit-limit removed from sales view |
| `124952a` | Per-role sign-in with demo accounts |
| `d6fa3f7` | The big reshape: 1 branch, 3 locations, 4 roles, terminology, stripped SMS/LLM/branches |

Repo: **https://github.com/AmmarKamran2005/advpos-frontend** (private, remote
name is `new`; `origin` still points at the old AdvancePOS repo). Push with
`git push new main`. Working branch `main`.

Per-portal design notes: `sales-portal.md`, `order-dept.md`, `accountant-portal.md`,
`super-admin-portal.md`. Daily flow in `flow.md`. Client questions in `open-questions.md`.

---

## Health

- `npx tsc --noEmit` — **clean**
- `npx eslint src` — **0 errors** (~110 warnings, all pre-existing unused-vars, harmless)
- `npx next build` — **clean, 82 pages**
- Rendering-speed rules are a **standing requirement** — see `AGENTS.md`
  ("Rendering speed is a requirement here"), loaded every session via CLAUDE.md.
  Still ~130 client components; the big server-component refactor is best done
  alongside the backend when data moves server-side.

### ⚠️ Recurring trap — the `.next` 500

If the whole app throws HTTP 500 with `Cannot find module '.../[turbopack]_runtime.js'`
or a missing `routes-manifest.json`, the `.next` cache is corrupt. Cause:
running `next build` while `next dev` is running — they share `.next`. Fix:
stop the dev server, `rm -rf .next`, restart. **Never run `next build` while the
dev server is up.**

---

## The open decisions that actually gate the design

The ones whose answers change what gets built. Full lists in `open-questions.md`
and each `*-portal.md`.

1. **Per-customer pricing.** Does every shop have its own rate, or one rate for
   all? Distribution usually means per-customer rates. If so it touches the item
   master, the order form, and the rep's ability to type a price. Biggest
   unanswered question.
2. **Landed cost on imports** (discussed last session — see below). China
   invoices in USD (the legacy `$: 1.00` field); real per-unit cost = USD×rate +
   duty + sales-tax-at-import + clearing + freight. If they book only the USD
   price, every cost/margin/claim-loss number is wrong. Ask: do they fold import
   charges into item cost, or expense them separately?
3. **Reminder escalation** — does an unactioned reminder go up the chain after 3
   days, or only ever to the one owner?
4. **Delivery charge** — charged to the customer on the invoice, or absorbed?
5. **Refused claim** — recovered from the customer, or absorbed to the Warranty
   account (currently assumed absorbed)?
6. **Limit-cross approver** — owner only, or accountant too? Both can act today.

---

## Last session's discussion — purchase / inbound flow (no code yet)

Client asked how the purchase invoice works for goods from China. Established,
to be built into the purchases screens once confirmed:

- **Two invoices, not one.** China's commercial invoice is *theirs* (received as
  PDF/email). The system's Purchase Invoice (PI) is *ours* — our record of the
  payable. No supplier upload portal; someone on our side enters the PI and
  should be able to attach China's PDF (attachment field doesn't exist yet;
  `supplierInvoiceNo` reference field does).
- **Three separate things people conflate:** creating the item (once), receiving
  stock (GRN — stock qty up, cost set), recording the bill (PI — payable up).
  Chain already exists: **PO → GRN → PI**. Stock rises at GRN, not PI.
- **Landed cost is the gap** (decision #2 above). Most important thing to get
  right on the purchase side and not modelled yet.

---

## Suggested next moves (pick one, don't do all)

1. **Backend** — ASP.NET Core Web API + PostgreSQL. Deploy target discussed:
   Railway (API) + Neon (DB), **both in Singapore region** for latency, API and
   DB co-located. Watch: PORT binding, forwarded-headers for HTTPS, ephemeral FS
   (claim photos → object storage, not DB), UTC vs Asia/Karachi, own `pg_dump`
   backup regardless of provider tier. `settings.ts` is designed to become a
   `/api/settings` response — everything configurable already lives there.
2. **Purchase / landed-cost redesign** once client answers the import questions.
3. **Send the client the batched open questions** (`open-questions.md` has a
   copy-paste block) and refine per answers.
4. **Claim-out batching** — the one Order Dept piece left (send several claims to
   one supplier on one slip).
5. **Rendering-speed refactor** — push `"use client"` down, fetch server-side.
   Most valuable done *with* the backend, not before.

## Explicitly not done (don't start without asking)

- Real backend / persistence / auth (login just routes in).
- Customer self-service portal (mobile = login ID) — design space reserved,
  build after the internal system is settled.
- Per-customer pricing, landed cost, bank reconciliation, supplier pay-run.
- Data migration from the 14k-invoice legacy system (dummy data for now).
- Test suite, Storybook, i18n.

## How to run

```bash
cd vizo-erp
npm run dev
```

Turbopack dev server on http://localhost:3000. Any email/password combination
from the four demo accounts above, or click a role panel on the login page.
