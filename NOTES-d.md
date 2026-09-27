# Session D — Confirm Collections made live, and an animated sign-in page

27 Sep 2026. Branch `feat/d-collections` (both repos), built on `integration/2026-09-26`
and merged back into it. Tested on `advpos_d`, a local copy made from the live backup of
26 Sep 18:49 plus migrations 26, 30–33, 35 and 36. **Nothing run on live.**

## What the owner asked for

1. The login page, animated, so it looks beautiful when it renders.
2. The accounts section fully dynamic, **Confirm Collections above all**:
   - Every order that has moved on appears as a row.
   - Opening a row brings up a modal asking how much is being collected and confirmed now.
   - Confirming reflects in the customer's account: what he paid and what is still owed, debit and credit in his ledger.

## What was actually wrong

- Nothing in the API ever **created** a collection. The eight on live are seed
  rows, and the "record collection" dialog only showed a toast.
- On the Confirm Collections screen, the **Confirm** and **Bounced** buttons
  only showed a toast. Neither called the API.
- A confirmed collection posted a receipt to the customer's account, but the
  receipt was not allocated to his **invoice**, so every invoice still showed
  as unpaid.
- Every other Money screen was already reading live data. The only mock-data
  widgets left (order payment and delivery cards, reminders) are not used by any
  screen.

## What was built

**API**
- `Controllers/CollectionDeskController.cs` (new), under `api/accounting/collections`,
  for super-admin and accountant only:
  - `GET receivables?q&show=open|paid|all&page`: every invoiced order that is
    not cancelled, declined, returned or draft, showing what was received and
    what the reps say they hold. The balance and overdue days are worked out on
    the server. There is also a summary: amount still to collect, overdue, held
    by reps, and received this month.
  - `GET orders/{id}`: everything the modal needs. That is the order, its
    receipts, and the customer's **whole account** from the books (opening
    balance, amount billed as Dr, amount paid as Cr, balance, credit limit). It
    also lists the ways money can come in (each named with its cash/bank
    account) and who can have collected it.
  - `POST collect`: creates a **confirmed** collection (series `COL-26-0089`
    onwards), allocated to the order, and posts it as a receipt voucher: Dr the
    cash/bank account of the method, Cr the customer. The voucher is allocated
    to the invoice.
    - Refused: more than the order owes, a non-cash payment without a
      reference, a date in the future.
  - `POST {id}/bounce`: marks a rep's collection that is still awaiting as
    bounced, with the reason. It never touched the books, so nothing is reversed.
- `AccountingController.ConfirmCollection` now takes an optional
  `{amount, note}`. That lets the accountant confirm **less** than the rep
  recorded, never more. The allocations to orders are trimmed to match.
- `Services/LedgerPosting.PostCollectionAsync` allocates each receipt voucher to
  the invoices of the orders it pays. So an invoice's paid and balance figures,
  and the Sale Invoices list, move with it.
- `database/36_collection_series.sql` adds the `COL` numbering series, starting
  after the highest number already used.

**Web**
- `/accounting/collections`, rebuilt:
  - **Four stat cards:** still to collect, overdue, held by reps, received this month.
  - **Tabs:**
    - **To collect** (with Owing / Paid / All): each order row shows the customer, order, invoice and salesperson; its status, overdue days and anything a rep holds on it; a received-of-total progress bar and the amount owed. Clicking a row opens the modal.
    - **Rep collections:** Confirm opens a modal asking how much actually arrived; Bounced asks why.
    - **Confirmed** and **Bounced**.
- `components/accounting/collect-dialog.tsx`, the modal:
  - The order with a progress bar showing what this payment adds.
  - The amount (Full / Half shortcuts) and the method, naming the account the money goes into.
  - The date, a reference, the bank name and the cheque date where they apply.
  - Who collected it (defaults to the salesperson) and a note.
  - The customer's whole account, with its balance before and after this payment, plus a link to his ledger.
  - This order's earlier receipts.
- `/login` is animated with pure CSS (`app/login/login.module.css`), no library:
  - The page blocks rise in one after another.
  - The role cards lift on hover, and a check pops in on the chosen one.
  - The sign-in button has a light sweep, and an error shakes each time it appears.
  - On the right panel: drifting glows, a slowly moving grid, and a shimmering headline accent.
  - A line draws itself down through the three steps, which pulse.
  - Two floating "live" cards appear on wide screens.
  - Everything collapses to still for anyone whose system asks for reduced motion (the rule already in `globals.css`).

## Deploy

Run `36_collection_series.sql` on live with the other 26 Sep migrations, before the
API deploy (changa.txt §G2). It is safe to run twice. Without it, new collection
numbers fall back to a timestamp (HANDOFF trap 9).

## How it was verified (`advpos_d`)

- **API:**
  - After posting the history, 29 orders were owing (760,455.69).
  - Collecting half of ORD-26-0034 in cash gave COL-26-0089 → RV-26-0514. The
    books moved by exactly 65,400 and stayed balanced. The order went to
    PARTIAL and the customer's account balance fell by 65,400.
  - Collecting the rest by bank gave COL-26-0090 → RV-26-0515. The invoice
    reads 218,000 paid of 218,000.
  - Refused as expected: over-collecting, and a bank payment with no reference.
  - The rep's COL-26-0087 (140,000) was confirmed as 135,000; the note records
    why and the voucher was posted.
  - The order desk gets 403.
- **Browser (accountant):**
  - The four cards and the order rows show live figures.
  - The modal opened on ORD-26-0140. 20,000 collected in cash gave COL-26-0091 → RV-26-0517, "PKR 36,200 is still owed".
  - The customer ledger `/ledgers/customers/16` then shows *RV-26-0517 · Cash on Hand, credit 20,000*, with the balance at 58,168.30.
  - No sideways scroll at 375 px on the page or in the modal.
- **Login:** it renders with 25 animations running, the logo loads, and its layout is unchanged.
- **Gate:** backend build 0 errors; `tsc` clean; `eslint` 0 errors, with no new warnings.
