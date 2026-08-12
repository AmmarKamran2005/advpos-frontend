# AdvPOS — Session Handoff

**Read `context.md` first** for project background and conventions, then `plan.md` for the client-fit plan and the open questions.

Last updated: 2026-08-13

---

## Where we are

The app has been reshaped around **one branch, three locations, four roles** — the client's actual setup — and stripped of everything they said they don't use.

- `npx tsc --noEmit` — clean
- `npx next build` — clean, 80 pages
- `npx eslint src` — 15 errors (baseline was 18; nothing new introduced)

### What changed this session

**Removed**
- LLM usage, AI Assistant page, AI drawer, the dashboard's "AI Insight" card (now "Daily Briefing")
- The whole SMS module — history, templates, gateways, `SendSmsDialog`
- Branches (module, data model, selectors, branch codes in document numbers)
- Warehouses module, Units of Measure, `profile/sessions`

**Added**
- `src/data/settings.ts` — the configuration store. Locations, account types, code prefixes, document series, brands/compatibility, payment methods, couriers, roles + permission matrix, stock/sales/delivery policies, keyboard map. **Nothing business-specific should be hardcoded in a component again.**
- `src/lib/labels.ts` — plain-language status and payment labels, plus a term glossary
- `src/components/providers/session-provider.tsx` — role context, `can()`, `<Can>`, and a role switcher
- `/admin/locations`, `/admin/account-types`, `/admin/numbering`, `/admin/couriers`
- `/delivery` — third-party courier consignments with COD settlement tracking
- `/accounting/ledgers` — one screen replacing five
- `WhatsAppShareDialog` — replaces the SMS dialog on orders and invoices
- `ShortcutSheet` — press `?` anywhere

**Reworked**
- Chart of accounts rebuilt from the client's real account list (Warranty & Claims, Dealer Commission, Shop 2 Expense, Discount Loss, Personal …)
- Items gained packing, min/max quantity, opening cost. Brand kept, seeded with the handset families from the live catalogue
- Every document number lost its branch code: `ORD-KHI-26-0142` → `ORD-26-0142`
- Sidebar and top bar are role-aware; each role sees a different menu

### Role switcher

Top bar → **Viewing as**. Switches between Super Admin, Accountant, Order Department and Sales; the sidebar, quick-create menu and permissions all follow. It is a demo affordance, not auth. State persists in `localStorage` under `advpos-active-role`.

---

## What's deliberately unfinished

| Item | Why |
|---|---|
| **Claims module** | Blocked on `plan.md` §6.3. The `Warranty & Claims` expense account is seeded and waiting |
| **Delivery details** | `/delivery` is a **draft** built on the standard Pakistani courier flow, with an on-screen banner saying so. Blocked on `plan.md` §6.2 |
| **Per-screen keyboard handling** | The shortcut sheet documents F2/F3/F4 and Enter-to-next-cell; the line-item grids don't implement them yet |
| **Cost-price hiding for Sales** | `cost.view` is in the permission matrix but the stock screens don't gate on it |
| **Print layouts** | Browser default. Client confirmed a standard modern format is fine, so this is styling work, not discovery |
| **Zakat** | Two pages exist, no index — `/zakat` still 404s. Not raised with the client yet |

## Still not started (and shouldn't be without asking)

- Backend of any kind — no fetch calls anywhere
- Real auth — login just pushes to `/dashboard`
- Persistence — every mutation is `setState` + toast; reload resets
- Data migration — client said dummy data is fine for now
- Tests, Storybook, i18n

## How to run

```bash
cd vizo-erp
npm run dev
```

http://localhost:3000 · `/` redirects to `/login` · any email and password gets you to `/dashboard`.

If port 3000 is stuck:

```bash
netstat -ano | findstr :3000 | findstr LISTENING
```

## Pre-commit checklist

1. `npx tsc --noEmit` returns nothing
2. `npx eslint src` shows no *new* errors against the 15 currently there
3. `npx next build` completes
4. Commit message: imperative one-line title with a scope in parens, blank line, then bullets

## Next moves

1. **Get the §6.2 and §6.3 answers** — Delivery and Claims are both waiting on the client
2. **Wire the keyboard shortcuts** into the line-item grids — the old system's users will feel their absence immediately
3. **Gate cost price** behind `cost.view` on the stock and item screens
4. **Add a `/zakat` index** or drop the module
5. **Print stylesheets** for invoice, order and the statements
