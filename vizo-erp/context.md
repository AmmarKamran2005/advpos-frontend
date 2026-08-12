# AdvPOS Frontend — Project Context

This document captures the **who, what, and why** of this project so that any future session can pick up work without spelunking through the codebase or chat history.

---

## 1. Product

**AdvPOS** — a production-grade multi-branch **POS + ERP frontend** for distribution businesses. The current sample tenant / seed data is a mobile-accessories distributor called **VIZO Pakistan** (Karachi HQ, branches in Lahore and Islamabad).

The rebrand from "VIZO ERP" (the app name in the first few commits) to **AdvPOS** (the software product name) happened in commit `be4a1a9`. Mock data still references VIZO because VIZO is now positioned as a **sample customer**, not the app itself.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.4** (App Router, Turbopack) | ⚠️ **Not the Next.js in Claude's training data.** See `AGENTS.md` — check `node_modules/next/dist/docs/` for breaking changes before writing. |
| Runtime | **React 19** | Strict hook rules: `Date.now()`, `Math.random()`, `new Date()` at top-level of render bodies are **compile-time errors** (rule: `react-hooks/purity`). Use lazy `useState(() => …)` initializers. |
| Language | **TypeScript strict mode** | `npx tsc --noEmit` must return zero errors before every commit. |
| Styling | **Tailwind CSS v4** (CSS-based config via `@theme` in `src/app/globals.css`) | Brand tokens: `brand-yellow` `#EDC705`, `navy-900` `#031833`, plus the standard scale. |
| Forms | **react-hook-form 7.75 + zod v4** | Wire with the custom `vizoResolver` helper in `src/lib/zod-resolver.ts` — it bypasses the RHF/zod input/output type mismatch. |
| Config | **`src/data/settings.ts`** | Locations, account types, prefixes, roles, policies. **Never hardcode a business list in a component** — put it here. |
| Roles | **`SessionProvider` + permission matrix** | `useSession().can("orders.approve")`, `<Can permission="…">`, and `navigationForRole()`. Matrix lives in settings. |
| Components | shadcn-style primitives in `src/components/ui/*` | Dialog, Sheet, Dropdown, Popover, Command (cmdk), Toaster (Sonner), Checkbox, Switch, Textarea, Label, SelectNative, Skeleton, Tabs. |
| Charts | **recharts** | Wrap in a `mounted`-gated block to avoid `width(-1)` warnings on SSR/hydration boundary. |
| Icons | **lucide-react** | Always `size-*` Tailwind class, never inline SVG width/height. |

## 3. Repository layout

```
vizo-erp/
├── src/
│   ├── app/
│   │   ├── login/ setup/ forgot-password/ reset-password/
│   │   └── (app)/                        ← route group with app shell
│   │       ├── dashboard/
│   │       ├── sales/                    ← orders, invoices, returns, limit alerts
│   │       ├── purchases/                ← orders, stock received, invoices, returns
│   │       ├── delivery/                 ← courier consignments + COD (draft)
│   │       ├── inventory/                ← items, categories, brands, stock, transfers
│   │       ├── parties/                  ← customers, suppliers, visits
│   │       ├── accounting/               ← accounts, ledgers, statements, expenses
│   │       ├── reports/
│   │       ├── admin/                    ← Setup: locations, account types,
│   │       │                                numbering, couriers, users, roles,
│   │       │                                settings, backup, activity
│   │       ├── profile/
│   │       └── zakat/
│   ├── components/
│   │   ├── ui/                           ← shadcn primitives
│   │   ├── dialogs/                      ← Confirm, EntityForm, RecordPayment,
│   │   │                                    WhatsAppShare
│   │   ├── layout/                       ← sidebar, top-bar, app-shell,
│   │   │                                    command-palette, shortcut-sheet
│   │   ├── widgets/                      ← ReportToolbar, SalesTrendChart, StatCard
│   │   └── providers/                    ← ThemeProvider, SessionProvider
│   ├── data/
│   │   ├── settings.ts                   ← CONFIGURATION — read this first
│   │   ├── accounting.ts, admin.ts, delivery.ts, mock.ts,
│   │   │   parties.ts, products.ts, purchases.ts, sales.ts
│   └── lib/
│       ├── labels.ts                     ← plain-language statuses + glossary
│       ├── nav-config.ts                 ← role-filtered navigation tree
│       ├── format.ts                     ← PKR money, dates, initials, compact
│       ├── utils.ts                      ← cn() classname helper
│       └── zod-resolver.ts               ← vizoResolver wrapper
├── AGENTS.md · CLAUDE.md
├── context.md                            ← THIS FILE
├── plan.md                               ← client-fit plan + open questions
├── handoff.md                            ← session state
└── package.json
```

## 4. Design conventions

**Configuration over code** — The business runs one branch and three locations *today*. Everything that could change (locations, account types, code prefixes, document numbering, couriers, roles, policies) lives in `src/data/settings.ts` and is editable from the Setup section. If you are about to type a business-specific list inside a component, it belongs in settings instead.

**Language** — Sales and Order Department screens use plain words; the Accountant's screens keep the standard statement names, because that is what they ask for. `src/lib/labels.ts` holds the translation — `statusLabel()`, `paymentLabel()`, and a `glossary` for the terms that have to stay technical. Never render a raw status enum.

**Roles** — Four: Super Admin, Accountant, Order Department, Sales. The sidebar filters itself via `navigationForRole(role)`; action buttons gate on `can(permission)`. No scattered `if (role === "sales")`.

**Colors** — Yellow **used sparingly** as the accent only (primary CTA, active nav item, highlights). Body copy on navy, cards on white / navy-800 in dark mode. Every color used comes from a defined Tailwind token — no hex literals in JSX.

**Typography** — Inter for text, JetBrains Mono for numbers (`tabular` class). All money and quantities use `tabular` so they align in columns.

**Spacing** — 4 / 8 / 12 / 16 scale (Tailwind default). Rounded-lg for cards, rounded-md for buttons/inputs, rounded-full for pills/avatars.

**Data tables** — Use `DataTable` from `src/components/ui/data-table.tsx` with a `columns: Column<Row>[]` config. Pass `rowHref={(r) => "/path/" + r.id}` to make rows navigable — always prefer this over per-row Link wrapping.

**Detail pages** — Two-column grid: `lg:col-span-2` for the primary content, `lg:col-span-1` for meta (party, timeline, actions). Header has breadcrumbs, title with status pill, subtitle, and action buttons on the right.

**State machines** — Encoded in the detail page itself as local React state. See `inventory/transfers/[id]/page.tsx` for the reference implementation.

**Keyboard** — The staff coming off the old FoxPro system drive it entirely from the keyboard. The map is in `settings.ts` (`shortcuts`) and surfaced by pressing `?`. New data-entry grids are expected to honour it.

**Money** — Always `formatMoney(n)` (returns `PKR 21,800`) or `formatCompact(n)` (returns `PKR 21.8M`). Never `n.toLocaleString()` in JSX.

**Dates** — `formatDate(iso)` returns `01-May-2026`. All dates in the codebase are ISO strings (`"2026-04-30"`) — never `Date` objects in props.

## 5. Toast / dialog patterns

Every button that triggers a side effect must give feedback:

- **Reversible / immediate** actions → `toast.success(title, { description })` — from `@/components/ui/toaster`.
- **Destructive or state-changing** actions → `<ConfirmDialog>` with `variant="danger"` or `"info"`, and `requireReason` when a paper trail is expected (write-off, rejection, credit-limit override).
- **Multi-field forms** on an existing list page → `<EntityFormDialog>` (generic modal) — see `src/components/dialogs/entity-form-dialog.tsx`.
- **Full-page forms** (invoice, order, GRN creation) → dedicated `[…]/new/page.tsx` route with a real `<Form>` wrapper.

## 6. Known gotchas

1. **Next 16 + React 19 purity rule** — `Date.now()` inside a render body is a compile error. Wrap with lazy state init: `useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))`. `Math.random()` same rule.
2. **`react-hooks/set-state-in-effect`** — `useEffect(() => setMounted(true), [])` is an error. Use `useEffect(() => { setMounted(true); }, [])` (statement, not expression), or replace with a derived value like `const mounted = resolvedTheme !== undefined`.
3. **Windows encoding** — `powershell`/`cmd` default to cp1252 which chokes on `✓`, `—`, and other Unicode. Use plain ASCII in bash `echo`/`print` statements or you'll crash mid-script.
4. **Turbopack dev server ports** — Old dev processes sometimes hang on to `:3000`. If a restart fails, `taskkill //F //PID <pid>` after `netstat -ano | findstr :3000 | findstr LISTENING`.
5. **`cz-shortcut-listen` hydration warning** — Injected by the **ColorZilla** Chrome extension into `<body>`. Not a code issue. Disable the extension to silence it.
6. **Chart width(-1) warnings** — recharts complains when its container measures 0px on first paint. Cosmetic only; wrap chart in a `{mounted && (…)}` block gated by a hydration flag if it bothers you.

## 7. Data model at a glance

The mock data models real Pakistani distribution:

- **Parties** — customers, suppliers, or BOTH. Have `partyCode` (e.g. `VZ-C-0008`), `NTN`, `STRN`, `creditLimit`, `creditDays`, `currentBalance`, `payableBalance`.
- **Products** — belong to a brand (Titan, PowerX, VSP, VR, VOLT). Have SKU, `costPrice`, `salePrice`, `totalStock` across warehouses.
- **Branches** — Karachi HQ, Lahore, Islamabad. Each has warehouses (`KHI-WH-01`, `LHR-WH-01`, `ISB-WH-01`).
- **Documents** numbered as `{branch}-{prefix}-{YY}-{seq}` — e.g. `ORD-KHI-26-0142`, `GRN-KHI-26-0089`, `PR-KHI-26-0008` (return), `TRF-KHI-26-0012` (transfer).
- **Payment methods** — Cash, Bank, JazzCash, Easypaisa, Credit. Amounts always PKR.

## 8. Commits so far

| SHA | Summary |
|---|---|
| `99d0d8d` | Initial: Next 16 scaffolding + design docs |
| `5185c61` | Production-grade form validation, action modals, auth flow, detail pages |
| `5b5d5b0` | Every Add/Edit button works — 14 new create pages + modals on simple lists |
| `990eb5a` | Accounting section — closed all 9 gaps (full and final) |
| `3313ea1` | Inventory / Sales / Purchases / Reports / Notifications / AI Assistant — all gaps closed |
| `be4a1a9` | Rebrand VIZO ERP → AdvPOS (mock data preserved) |

Repo: https://github.com/AmmarKamran2005/AdvancePOS (branch `main`)

## 9. Non-goals

- **No backend.** No API calls, no auth. Every mutation is `setState` + toast. The submit handler on `/login` just calls `router.push("/dashboard")`.
- **No i18n.** Copy is English + occasional Urdu-in-Latin toast text where the tone fits.
- **No state library.** No Zustand / Redux / Jotai. Local component state and prop drilling only.
- **No test suite.** Verification is `tsc --noEmit` clean + manual click-through in the dev server.
- **No documentation `*.md` files** unless the user asks (this file is an exception because it was asked for).
