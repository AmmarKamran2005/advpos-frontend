# Accountant Portal

Read `plan.md` for overall scope, `flow.md` for the daily chain, `sales-portal.md`
and `order-dept.md` for the two portals this one closes the loop on.

**Status: first pass built.** The confirm-collections screen, the accountant
dashboard, and payables/recovery visibility are in. Bank reconciliation and a
dedicated supplier-payment run are not.

---

## The one thing this portal exists to close

The sales portal already has a rep collecting cash in the field and logging it
as **"awaiting Accounts"** — the balance doesn't move until someone here says
the money actually arrived. Until this portal existed, there was nowhere to
say that. Every collection a rep logged just sat in `data/collections.ts`
with nobody able to act on it.

That is the first thing this build fixes: **Confirm Collections**
(`/accounting/collections`). Every AWAITING receipt from the field, one place,
two actions — Confirm or Bounced — and the ledger only moves on the
accountant's word, exactly as designed in the sales portal.

## Why bounced is its own outcome, not a delete

A cheque comes back. The money the rep already got credit for collecting
didn't arrive. Marking it **Bounced** (not deleting the receipt) keeps the
paper trail — the customer's balance goes back up, and the record stays as
evidence of what was promised and what actually happened. Requires a reason,
same as every other reversal in this app (order cancel, claim write-off,
delete).

## Dashboard — work queue, not a report

Same house rule as Sales and Order Dept: the accountant's first screen shows
what needs a decision today, not a chart.

| Block | What it is |
|---|---|
| 4 counters | Awaiting confirmation · Confirmed today · Payables due this week · Recovery 60+ days |
| Needs your attention | The shared reminder list — now also carries collection and payable reminders |
| Confirm queue | The oldest AWAITING collections, actionable right on the dashboard |
| Cash position | Cash / bank / wallet split, so the day starts with what's actually liquid |

## Two new reminder kinds

Following the same pattern as delivery and claim reminders — derived from
dates, never stored, disappear the moment the work is done:

| Reminder | Fires when | Owner |
|---|---|---|
| Collection not confirmed | A rep's receipt has sat AWAITING more than a day | Accountant |
| Supplier payment due | A purchase invoice is within 3 days of due, or already overdue | Accountant |

## What this portal deliberately does not rebuild

- **Recovery / aging** — already exists at `/reports/aging/customer` and
  `/reports/aging/supplier`. The dashboard links to it rather than duplicating it.
- **Paying a supplier** — already happens on the purchase invoice detail page
  (`/purchases/invoices/[id]`), which the accountant already has access to.
  A dedicated "pay run" screen (batch-paying several invoices at once) is a
  reasonable next step but wasn't asked for yet.
- **General voucher entry** — `/accounting/vouchers` stays the raw tool for
  any cash/bank/wallet/journal voucher. Confirm Collections is the *guided*
  path specifically for what a sales rep submits; it doesn't replace the
  general one.

One label fix while in here: the nav used to call `/accounting/vouchers`
**"Money Received"**, but the underlying data is every voucher type — receipts
*and* payments *and* journal entries. Renamed to **"Vouchers"** so it doesn't
mislead the person who has to pick between it and Confirm Collections.

---

## Open questions — specific to this portal

1. **Confirming a collection — does it need to name which bank account it
   landed in?** Right now confirmation is a single click. If the business
   reconciles bank statements, the accountant will want to say *which*
   account the cash was banked into at confirm time, not just that it arrived.
2. **Cheque bounce — who eats the courier/bank charge, if any?** Minor, but
   it's a real line item at some businesses.
3. **Batch confirm** — if ten receipts come in from one rep's Monday round,
   does the accountant confirm them one at a time, or is there a "confirm all
   from this rep, today" action? Only worth building if the volume justifies it.
4. **Supplier payment run** — pay five overdue invoices in one sitting with
   one bank transaction, or always one voucher per invoice?

See also `open-questions.md` #9 (rep-collected cash confirmed by Accounts —
already assumed yes, this portal is that assumption made real) and #12
(cheque bounce handling — now has a screen, still needs the business rule).
