# Super Admin Portal

Read `plan.md` for overall scope, `flow.md` for the daily chain, and the three
`*-portal.md` files for the roles this one sits above.

**Status: first pass built.** Owner dashboard, limit-cross approvals surfaced,
zakat orphan removed, admin utility pages checked against the new data model.

---

## Who this is for, and why it's different

The other three portals belong to people *doing* the daily work — taking
orders, packing, confirming money. The super admin is the **owner**. He is not
in the transaction chain; he sits above it. So his first screen is not a work
queue of his own tasks — it is the health of the whole business, plus the one
or two things that genuinely need his signature.

That is the guiding line for this portal: **oversight, not operation.** Show
him what's leaking and what needs a decision; let him drop into any other
portal's screens (he can see them all) when he wants detail.

## The owner dashboard — four bands

| Band | What it answers |
|---|---|
| **Money today** | Today's sales, collections, receivables outstanding, payables due — the four numbers an owner checks first |
| **Needs your decision** | Limit-cross orders waiting for approval. This is the one thing in the daily chain that is genuinely his — a rep can't raise a customer's limit, the accountant sets it, but crossing it on a live order is the owner's call |
| **What's leaking** | Money tied up where it shouldn't be: overdue recovery (60+ days), stock not selling, claims stuck with suppliers. Each links to the report that already exists |
| **Activity** | Who did what across every portal — the oversight feed. This is the owner's window into work he isn't doing himself |

Same house rule as the other three: it opens on decisions and problems, not a
wall of charts. The revenue chart stays (an owner does want the trend) but it's
one element, not the whole page.

## Limit-cross approval — why it's the owner's, spelled out

Across the app the credit limit has one deliberate shape:

- **Sales** never sees it — a limit the person selling against it can raise is
  not a limit.
- **Accountant** sets it — he holds the customer's financial picture.
- **Super admin** approves crossing it on a live order — because letting an
  order through over the limit is a risk decision, and risk is the owner's.

The dashboard surfaces these; the existing `/sales/credit-holds` screen (renamed
Limit Alerts in nav) is where he acts on them.

## What got cleaned up

- **Zakat routes deleted.** `/zakat/calculations` and `/zakat/periods` existed
  as orphans — not in any nav, not in the client's legacy system, and the index
  `/zakat` was a 404. Gone.
- **Dashboard now reads the signed-in user** via `useSession` instead of the
  hardcoded `currentUser`, so "Good morning, Umer" is right and would be right
  for any owner account.
- **Dead header buttons removed.** The old generic dashboard had Today / Export
  / Refresh buttons that did nothing. An owner's overview doesn't need them.

## Admin utility pages — checked, already coherent

These were built in the first client-fit pass and still hold up against the
current data model (locations not branches, real role names, real users):

- **Activity History** (`/admin/audit-log`) — who did what, severity filter,
  detail dialog. The owner's audit tool.
- **Users, Roles** — the four roles and their people.
- **Locations, Account Types, Numbering, Couriers** — the Setup config screens.
- **Backup & Restore, Settings** — housekeeping.

Left as they are; no rework needed for this pass.

## Open questions — specific to this portal

1. **Does the owner approve limit crosses himself, or does he delegate to the
   accountant?** Right now both `super-admin` and (via the limit permission)
   the accountant can act. If the owner wants it to be *only* his call, tighten
   the permission.
2. **Daily/weekly summary to WhatsApp?** The owner is the one person who might
   genuinely want a pushed number — "today: X sales, Y collected, Z overdue" —
   rather than opening the app. Worth asking; not built.
3. **Which numbers matter most to him?** The four money tiles are my pick
   (sales, collections, receivables, payables). The owner may care more about
   margin, or a specific product line. Easy to swap once he says.
