# VIZO ERP — UI Sitemap & Information Architecture

| Field | Value |
|---|---|
| **Project** | VIZO ERP — Web Application |
| **Document** | UI Sitemap & IA (v1.0) |
| **Date** | 2026-05-01 |
| **Tenant Model** | Single-tenant (VIZO only) |
| **Platform** | Web only (mobile deferred) |
| **Tech (prototype)** | HTML5 + Tailwind CSS + Alpine.js + Lucide icons |
| **Tech (production)** | Next.js 14 (App Router) + TypeScript |
| **Locale** | English only |
| **Theme** | Light + Dark (both first-class) |
| **Inspiration** | Stripe Dashboard · Tailwind UI · Zoho One |

---

## Table of Contents

- [1. Design Principles](#1-design-principles)
- [2. Application Shell (Layout)](#2-application-shell-layout)
- [3. Authentication & Public Pages](#3-authentication--public-pages)
- [4. Sidebar Navigation Tree](#4-sidebar-navigation-tree)
- [5. URL / Route Map](#5-url--route-map)
- [6. Module-by-Module Screen Inventory](#6-module-by-module-screen-inventory)
- [7. Role-Based Dashboards](#7-role-based-dashboards)
- [8. Critical User Flows](#8-critical-user-flows)
- [9. Modal vs Drawer vs Full-Page Decision Matrix](#9-modal-vs-drawer-vs-full-page-decision-matrix)
- [10. Responsive Behavior](#10-responsive-behavior)
- [11. Component Library Catalog](#11-component-library-catalog)
- [12. Notification & Feedback Patterns](#12-notification--feedback-patterns)
- [13. Page Inventory Summary](#13-page-inventory-summary)
- [14. Build Order (UI Construction Sequence)](#14-build-order-ui-construction-sequence)

---

## 1. Design Principles

1. **Modern minimalism.** Clean lines, generous whitespace, restrained color — Stripe-grade polish.
2. **Information density without clutter.** ERP users see a lot of numbers; tables must be efficient but readable. Use zebra rows sparingly, prefer card grouping.
3. **Role-aware UI.** Each user only sees what their role permits. No "you don't have permission" dead ends — features hide cleanly.
4. **100% responsive.** 320px phone → 4K desktop. Tables collapse to cards on mobile.
5. **Dark mode is first-class.** Designed simultaneously with light, not an afterthought.
6. **Keyboard-first.** Power users navigate with Cmd+K command palette, hotkeys, tab navigation.
7. **Optimistic + fast.** Skeleton loaders, optimistic updates, instant feedback.
8. **Accessible.** WCAG AA target — focus rings, ARIA labels, semantic HTML.
9. **Consistent.** Same primitives reused everywhere — buttons, badges, tables.
10. **Numbers matter.** Money uses `JetBrains Mono` (tabular figures), right-aligned, color-coded (debits red, credits green where contextual).

---

## 2. Application Shell (Layout)

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky, h-16)                                              │
│  [☰] [Logo] [Branch ▾]  [🔍 search]   [+ Create] [✨][🔔][🌙][👤]  │
├────────────┬─────────────────────────────────────────────────────────┤
│            │  Breadcrumbs                                             │
│            │  Page Title                       [Action] [Action ▾]   │
│  SIDEBAR   │  ─────────────────────────────────────────────────────  │
│  (260px /  │                                                          │
│  72px      │  ┌─────────────────────────────────────────────────────┐ │
│  collapsed)│  │                                                     │ │
│            │  │              MAIN CONTENT                           │ │
│  Nav tree  │  │       (forms, tables, cards, charts)                │ │
│            │  │                                                     │ │
│            │  └─────────────────────────────────────────────────────┘ │
│  [«]       │                                                          │
└────────────┴─────────────────────────────────────────────────────────┘
                                                          ╔═══════════╗
                                                          ║   Right   ║
                                                          ║  Drawer   ║
                                                          ║  (AI/     ║
                                                          ║   notif)  ║
                                                          ╚═══════════╝
```

### 2.1 Top Bar (sticky, height 64px)

| Element | Position | Behavior |
|---|---|---|
| Sidebar toggle (☰) | far left | Mobile/tablet only — opens drawer |
| VIZO Logo | left | Click → `/dashboard` |
| Branch Switcher | left | Dropdown of allowed branches; persists in localStorage; only visible if user has multi-branch access |
| Global Search | center | Searches parties, products, invoices, orders, POs. Cmd+K opens command palette instead. |
| Quick Create (+) | right | Dropdown: New Order · New Invoice · New PO · New GRN · New Voucher · New Party · New Product |
| AI Assistant (✨) | right | Opens right drawer with chat |
| Notifications (🔔) | right | Bell icon with red dot badge → dropdown of last 10 |
| Theme Toggle (🌙/☀️) | right | Light / Dark / System |
| User Menu (avatar) | far right | Dropdown: Profile · Preferences · Help · Sign Out |

### 2.2 Left Sidebar (sticky, default 260px)

States:
- **Expanded (260px)** — labels + icons visible
- **Collapsed (72px)** — icons only, hover shows tooltip
- **Mobile (<768px)** — hidden by default, slides in as overlay drawer

Structure:
- Logo + business name (top)
- Navigation tree (scrollable middle)
- Collapse toggle (bottom)
- App version + help icon (bottom)

Active state: pill-shaped highlight with primary color, slightly bolder text.
Sub-items: indented, lighter color, smaller font when expanded.
Section dividers: thin border + uppercase section label.

### 2.3 Main Content Area

| Zone | Description |
|---|---|
| **Breadcrumbs** | `Sales > Orders > #ORD-KHI-26-0142` — every level clickable |
| **Page Header** | H1 title (24px bold) + subtitle + status badge + primary actions on right |
| **Tabs** (optional) | For multi-section pages (Party detail, Order detail, Reports) |
| **Filters bar** | Date range, status, branch, etc. — sticky on table pages |
| **Content body** | Forms, tables, charts, cards |
| **Footer hint** (subtle) | Keyboard shortcut hints, "Last saved 2 min ago" |

### 2.4 Right Slide-out Drawers

Used for:
- **AI Assistant chat** — persistent across navigation
- **Notifications panel** — full list with filters
- **Quick filters** on report pages
- **Quick create forms** for lightweight entities (e.g. new contact, new address)
- **Detail preview** — peek at a record without leaving the list

Width: 480px desktop, full-screen mobile. Slides in from right with backdrop.

### 2.5 Command Palette (Cmd+K / Ctrl+K)

Modern essential for power users (à la Linear, Vercel):
- Quick navigate to any screen ("go to invoices")
- Quick actions ("create order", "create PO")
- Quick search across entities (parties, products, invoices)
- Recent items
- Keyboard shortcut reference

### 2.6 Color & Theme Tokens (placeholder — final colors per VIZO brand)

> Final palette to come from Umer. Below is a **professional default** to start with.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-app` | `#F9FAFB` | `#0B0F19` | Page background |
| `--bg-surface` | `#FFFFFF` | `#111827` | Cards, panels |
| `--bg-sidebar` | `#FFFFFF` | `#0F172A` | Sidebar |
| `--text-primary` | `#0F172A` | `#F8FAFC` | Body text |
| `--text-secondary` | `#475569` | `#94A3B8` | Subtle text |
| `--border` | `#E5E7EB` | `#1F2937` | Dividers |
| `--primary` | `#2563EB` | `#3B82F6` | Brand blue (placeholder) |
| `--success` | `#10B981` | `#34D399` | Paid, posted |
| `--warning` | `#F59E0B` | `#FBBF24` | Pending, due soon |
| `--danger` | `#EF4444` | `#F87171` | Overdue, blocked |
| `--info` | `#06B6D4` | `#22D3EE` | Informational |

Typography:
- **UI font:** Inter (400, 500, 600, 700)
- **Numbers font:** JetBrains Mono (tabular figures for tables, money columns)
- **Base size:** 14px desktop, 16px mobile

---

## 3. Authentication & Public Pages

| # | Screen | URL | File | Description |
|---|---|---|---|---|
| 3.1 | **Login** | `/login` | `index.html` | Email + password, "Remember me", forgot link, branded with VIZO logo. Split-screen: left form, right brand panel with illustration / quote. |
| 3.2 | **Forgot Password** | `/forgot-password` | `pages/auth/forgot-password.html` | Email input → send reset link |
| 3.3 | **Reset Password** | `/reset-password` | `pages/auth/reset-password.html` | New password + confirm, with strength meter |
| 3.4 | **First-Time Setup** | `/setup` | `pages/auth/first-time-setup.html` | Force change of temp password on first login |
| 3.5 | **Locked Account** | `/locked` | `pages/auth/locked.html` | After 5 failed attempts |
| 3.6 | **Session Expired** | modal | — | Modal overlay → back to login |
| 3.7 | **404 Not Found** | n/a | `pages/errors/404.html` | Friendly with "Back to dashboard" CTA |
| 3.8 | **403 Forbidden** | n/a | `pages/errors/403.html` | "You don't have access to this page" |
| 3.9 | **500 Error** | n/a | `pages/errors/500.html` | "Something went wrong" + report button |

---

## 4. Sidebar Navigation Tree

Final menu hierarchy (icons via Lucide):

```
🏠  Dashboard

──── SALES & CUSTOMERS ────
📋  Sales
    ├── Orders
    ├── Invoices
    ├── Sales Returns
    └── Credit Holds          (badge: count)
👥  Parties
    ├── All Parties
    ├── Customers
    ├── Suppliers
    └── Customer Visits

──── PURCHASES ────
🛒  Purchases
    ├── Purchase Orders
    ├── Goods Receipts (GRN)
    ├── Purchase Invoices
    └── Purchase Returns

──── INVENTORY ────
📦  Inventory
    ├── Products
    ├── Categories
    ├── Brands
    ├── Units of Measure
    ├── Stock Levels
    ├── Stock Movements
    ├── Stock Adjustments
    ├── Stock Transfers
    └── Warehouses

──── ACCOUNTING ────
📒  Accounting
    ├── Chart of Accounts
    ├── Journal Entries
    ├── Vouchers
    ├── Expenses
    ├── General Ledger
    ├── Trial Balance
    ├── Profit & Loss
    ├── Balance Sheet
    ├── Cash Flow
    └── Period Close

🕌  Zakat
    ├── Periods
    └── Calculations

──── INSIGHTS ────
📊  Reports                    (search bar inside)
    ├── Sales Reports
    ├── Purchase Reports
    ├── Inventory Reports
    ├── Financial Reports
    ├── Aging (AR / AP)
    ├── Top Customers
    ├── Slow Moving
    ├── Dead Stock
    └── Sales Trends

🤖  AI Assistant               (also floating button on every page)

──── COMMUNICATION ────
💬  SMS / Notifications
    ├── SMS History
    ├── Templates
    └── Gateways               (admin only)

──── ADMIN (SuperAdmin only) ────
⚙️  Administration
    ├── Users
    ├── Roles & Permissions
    ├── Branches
    ├── Audit Log
    ├── Backup & Restore
    ├── System Settings
    └── LLM Usage & Cost
```

**Visibility rules:**
- Menu items hidden if user lacks `*.read` permission for that module
- Sub-items hidden if user can't access any of their pages
- Whole sections collapse if all children are hidden

---

## 5. URL / Route Map

> Designed to map cleanly to **Next.js App Router** later. Each `/segment` will become a folder under `app/`.

```
PUBLIC
  /login
  /forgot-password
  /reset-password
  /setup
  /locked

APP (post-login, all under app shell)
  /                                   → redirect /dashboard
  /dashboard
  /command-palette                    (modal route)

  SALES
  /sales/orders
  /sales/orders/new
  /sales/orders/{id}
  /sales/orders/{id}/edit
  /sales/invoices
  /sales/invoices/new
  /sales/invoices/{id}
  /sales/invoices/{id}/print
  /sales/returns
  /sales/returns/new
  /sales/returns/{id}
  /sales/credit-holds

  PURCHASES
  /purchases/orders
  /purchases/orders/new
  /purchases/orders/{id}
  /purchases/grns
  /purchases/grns/new
  /purchases/grns/{id}
  /purchases/invoices
  /purchases/invoices/new
  /purchases/invoices/{id}
  /purchases/returns
  /purchases/returns/new
  /purchases/returns/{id}

  PARTIES
  /parties
  /parties/new
  /parties/{id}                        (default: Overview tab)
  /parties/{id}/ledger
  /parties/{id}/orders
  /parties/{id}/invoices
  /parties/{id}/visits
  /parties/{id}/credit
  /parties/customers
  /parties/suppliers
  /parties/visits

  INVENTORY
  /inventory/products
  /inventory/products/new
  /inventory/products/{id}
  /inventory/categories
  /inventory/brands
  /inventory/uom
  /inventory/stock-levels
  /inventory/movements
  /inventory/adjustments
  /inventory/adjustments/new
  /inventory/transfers
  /inventory/transfers/new
  /inventory/transfers/{id}
  /inventory/warehouses

  ACCOUNTING
  /accounting/coa
  /accounting/journal-entries
  /accounting/journal-entries/new
  /accounting/journal-entries/{id}
  /accounting/vouchers
  /accounting/vouchers/new
  /accounting/vouchers/{id}
  /accounting/expenses
  /accounting/expenses/new
  /accounting/ledger
  /accounting/ledger/{accountId}
  /accounting/trial-balance
  /accounting/profit-loss
  /accounting/balance-sheet
  /accounting/cash-flow
  /accounting/period-close

  ZAKAT
  /zakat/periods
  /zakat/calculations
  /zakat/calculations/new
  /zakat/calculations/{id}

  REPORTS
  /reports                              (report library hub)
  /reports/sales-summary
  /reports/sales-by-salesperson
  /reports/sales-by-product
  /reports/purchase-summary
  /reports/inventory-valuation
  /reports/aging/customer
  /reports/aging/supplier
  /reports/top-customers
  /reports/slow-moving
  /reports/dead-stock
  /reports/sales-trends
  /reports/customer-statement/{id}

  AI
  /ai-assistant                         (full-page conversation view)

  NOTIFICATIONS
  /notifications/sms
  /notifications/sms/{id}
  /notifications/templates
  /notifications/templates/{code}
  /notifications/gateways               (admin)

  ADMIN (SuperAdmin only)
  /admin/users
  /admin/users/new
  /admin/users/{id}
  /admin/roles
  /admin/roles/{id}
  /admin/branches
  /admin/branches/new
  /admin/branches/{id}
  /admin/audit-log
  /admin/backup
  /admin/settings
  /admin/llm-usage

  ME
  /profile
  /profile/security
  /profile/preferences
  /profile/sessions
```

**Total app routes: ~95**

---

## 6. Module-by-Module Screen Inventory

> Legend:
> - **Type:** `PAGE` (full route), `MODAL` (overlay), `DRAWER` (right slide-out), `TAB` (within parent page)
> - **Roles:** SA = SuperAdmin · AC = Accountant · OD = Order Dept · SL = Sales · PO = Purchase Officer · BM = Branch Mgr · CO = Collections

### 6.1 Dashboard

| # | Screen | Type | URL | Roles | Notes |
|---|---|---|---|---|---|
| D1 | Home Dashboard | PAGE | `/dashboard` | All | Role-based widgets (see §7) |
| D2 | Notifications | DRAWER | overlay | All | Last 30 notifications, filterable |
| D3 | Quick Create | DROPDOWN | top bar | All | Inline menu of common create actions |
| D4 | Command Palette | MODAL | `Cmd+K` | All | Search & action bar |

### 6.2 Sales Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| S1 | Orders List | PAGE | `/sales/orders` | SA·OD·SL·BM | Filters: status, branch, salesperson, date range, customer. Bulk actions. |
| S2 | Order Create (Wizard) | PAGE | `/sales/orders/new` | SA·OD·SL | 3 steps: Customer & Items → Pricing & Tax → Review & Submit |
| S3 | Order Detail | PAGE | `/sales/orders/{id}` | SA·OD·SL·BM | Tabs: Items · Activity · Stock · Documents. State actions on header. |
| S4 | Order Edit (DRAFT only) | PAGE | `/sales/orders/{id}/edit` | SA·OD·SL | Same as S2 with prefilled data |
| S5 | Credit Hold Override | MODAL | from S3 | SA·AC·BM | Mandatory reason textarea + override button |
| S6 | Cancel Order | MODAL | from S3 | SA·OD | Confirmation + reason |
| S7 | Invoices List | PAGE | `/sales/invoices` | SA·AC·OD·SL·BM·CO | Filters incl. "Overdue only", "Due in next 7 days" |
| S8 | Invoice Create (direct) | PAGE | `/sales/invoices/new` | SA·AC·OD | When invoicing without an order |
| S9 | Invoice Detail | PAGE | `/sales/invoices/{id}` | SA·AC·OD·SL·BM·CO | Sticky action bar: Print · Email · SMS · Record Payment · Void |
| S10 | Invoice Print Preview | PAGE | `/sales/invoices/{id}/print` | All | Print-optimized layout (A4) |
| S11 | Record Payment | DRAWER | from S9 | SA·AC·CO | Payment method, amount, allocation to invoices |
| S12 | Email Invoice | MODAL | from S9 | SA·AC·OD·SL·BM | To/cc, subject, body preview |
| S13 | Send via SMS | MODAL | from S9 | SA·AC·OD·SL·BM | Template preview |
| S14 | Sales Returns List | PAGE | `/sales/returns` | SA·AC·OD·SL·BM | Filter by condition, status |
| S15 | Sales Return Create | PAGE | `/sales/returns/new` | SA·AC·OD·SL | Pick invoice → line-level partial return + condition per line |
| S16 | Sales Return Detail | PAGE | `/sales/returns/{id}` | SA·AC·OD·SL·BM | Approve/Reject actions |
| S17 | Approve Return | MODAL | from S16 | SA·AC·OD·BM | Final review before stock & JE |
| S18 | Credit Holds Queue | PAGE | `/sales/credit-holds` | SA·AC·OD·BM | All orders currently on credit hold awaiting decision |

### 6.3 Purchases Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| P1 | Purchase Orders List | PAGE | `/purchases/orders` | SA·PO·BM | Filters: supplier, status, branch |
| P2 | PO Create | PAGE | `/purchases/orders/new` | SA·PO·BM | Wizard: Supplier & Items → Costs & Tax → Review |
| P3 | PO Detail | PAGE | `/purchases/orders/{id}` | SA·PO·BM·AC | Tabs: Items · GRNs · Invoices · Activity |
| P4 | PO Approval | MODAL | from P3 | SA·BM | Approver review |
| P5 | GRNs List | PAGE | `/purchases/grns` | SA·PO·BM | Recent receipts |
| P6 | GRN Create | PAGE | `/purchases/grns/new` | SA·PO·BM | Pick PO → fill received qty per line + damaged + batch + expiry |
| P7 | GRN Detail | PAGE | `/purchases/grns/{id}` | SA·PO·BM·AC | Post action; shows posted JE link |
| P8 | Purchase Invoices List | PAGE | `/purchases/invoices` | SA·PO·AC·BM | Filter: overdue, supplier |
| P9 | Purchase Invoice Create | PAGE | `/purchases/invoices/new` | SA·PO·AC·BM | Link to GRN(s) or direct bill |
| P10 | Purchase Invoice Detail | PAGE | `/purchases/invoices/{id}` | SA·PO·AC·BM | Pay action, void action |
| P11 | Pay Supplier | DRAWER | from P10 | SA·AC·BM | Payment method, WHT, allocation |
| P12 | Purchase Returns List | PAGE | `/purchases/returns` | SA·PO·AC·BM |  |
| P13 | Purchase Return Create | PAGE | `/purchases/returns/new` | SA·PO·AC·BM | Line-level partial with reason |
| P14 | Purchase Return Detail | PAGE | `/purchases/returns/{id}` | SA·PO·AC·BM | Approve action |

### 6.4 Parties Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| PA1 | All Parties List | PAGE | `/parties` | All | Filters: type, city, category, active. Toggle: Customers / Suppliers / Both |
| PA2 | Customers List | PAGE | `/parties/customers` | All | Pre-filtered view of PA1 |
| PA3 | Suppliers List | PAGE | `/parties/suppliers` | All | Pre-filtered view of PA1 |
| PA4 | Party Create | PAGE | `/parties/new` | SA·AC·OD·SL·PO·BM | Quick mode (modal) + Full mode (page) |
| PA4b | Party Quick Create | MODAL | from anywhere with `+` | SA·AC·OD·SL·PO·BM | Minimum fields only |
| PA5 | Party Detail — Overview | TAB | `/parties/{id}` | All | Profile, contacts, addresses, summary stats |
| PA6 | Party Detail — Ledger | TAB | `/parties/{id}/ledger` | SA·AC·BM·CO | Date range, running balance |
| PA7 | Party Detail — Orders | TAB | `/parties/{id}/orders` | All | Order history table |
| PA8 | Party Detail — Invoices | TAB | `/parties/{id}/invoices` | All | + aging summary cards |
| PA9 | Party Detail — Visits | TAB | `/parties/{id}/visits` | SA·OD·SL·BM | Visit log with map snippet |
| PA10 | Party Detail — Credit | TAB | `/parties/{id}/credit` | SA·AC·BM | Limit, days, hold policy, override history |
| PA11 | Edit Credit Settings | MODAL | from PA10 | SA·AC·BM | credit_limit, credit_days, hold_policy |
| PA12 | Convert Type | MODAL | from PA5 | SA·BM | CUSTOMER → BOTH conversion |
| PA13 | Customer Visits Hub | PAGE | `/parties/visits` | SA·OD·BM | All visits across all parties; map view + table view |

### 6.5 Inventory Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| I1 | Products List | PAGE | `/inventory/products` | All (stock view gated) | Card / table toggle. Filters: category, brand, low-stock |
| I2 | Product Create | PAGE | `/inventory/products/new` | SA | Tabs: Basic · Pricing · Stock · Barcodes · Images |
| I3 | Product Detail | PAGE | `/inventory/products/{id}` | All | Tabs: Overview · Stock by Warehouse · Movements · Pricing · Images |
| I4 | Product Quick Edit | DRAWER | from I1 | SA | Inline edit name/price/category |
| I5 | Categories | PAGE | `/inventory/categories` | SA·BM | Tree view, drag-and-drop reorder |
| I6 | Brands | PAGE | `/inventory/brands` | SA·BM | Simple list + create modal |
| I7 | Units of Measure | PAGE | `/inventory/uom` | SA | Simple table |
| I8 | Stock Levels | PAGE | `/inventory/stock-levels` | All | Pivot: products × warehouses. Filters: low-stock, out-of-stock |
| I9 | Stock Movements Log | PAGE | `/inventory/movements` | SA·AC·OD·BM | Append-only log, filter heavy |
| I10 | Stock Adjustments List | PAGE | `/inventory/adjustments` | SA·AC·OD·BM |  |
| I11 | Stock Adjustment Create | PAGE | `/inventory/adjustments/new` | SA·AC·OD·BM | Reason required; auto-JE posting on save |
| I12 | Stock Transfers List | PAGE | `/inventory/transfers` | SA·OD·BM·PO | Status pipeline view (kanban) |
| I13 | Stock Transfer Create | PAGE | `/inventory/transfers/new` | SA·OD·BM | From/to warehouse, items |
| I14 | Stock Transfer Detail | PAGE | `/inventory/transfers/{id}` | SA·OD·BM | State actions: submit, approve, ship, receive |
| I15 | Receive Transfer | MODAL | from I14 | SA·OD·BM | Per-line received qty (discrepancy capture) |
| I16 | Warehouses List | PAGE | `/inventory/warehouses` | SA·BM | Simple list |
| I17 | Warehouse Create/Edit | MODAL | from I16 | SA·BM |  |
| I18 | Bulk Import Products | MODAL | from I1 | SA | CSV upload with column mapping & preview |

### 6.6 Accounting Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| A1 | Chart of Accounts | PAGE | `/accounting/coa` | SA·AC | Tree view, expand/collapse, drag-reorder |
| A2 | Account Create/Edit | MODAL | from A1 | SA·AC |  |
| A3 | Journal Entries List | PAGE | `/accounting/journal-entries` | SA·AC | Filter: status, date, type, branch |
| A4 | JE Create | PAGE | `/accounting/journal-entries/new` | SA·AC | Multi-line table, live debit/credit balance check |
| A5 | JE Detail | PAGE | `/accounting/journal-entries/{id}` | SA·AC | Post/Reverse actions; immutable when posted |
| A6 | Reverse JE | MODAL | from A5 | SA·AC | Confirmation + reason |
| A7 | Vouchers List | PAGE | `/accounting/vouchers` | SA·AC·BM·CO | Type tabs: Cash R · Cash P · Bank R · Bank P · Wallet · JV |
| A8 | Voucher Create | PAGE | `/accounting/vouchers/new` | SA·AC·BM·CO | Form adapts to type; payment method picker; invoice allocation table |
| A9 | Voucher Detail | PAGE | `/accounting/vouchers/{id}` | SA·AC·BM·CO | Post / cancel / reconcile |
| A10 | Reconcile Voucher | MODAL | from A9 | SA·AC | Mark as reconciled vs bank statement |
| A11 | Expenses List | PAGE | `/accounting/expenses` | SA·AC·BM | Filter by category, branch |
| A12 | Expense Create | PAGE | `/accounting/expenses/new` | SA·AC·BM | Form + receipt upload |
| A13 | General Ledger | PAGE | `/accounting/ledger` | SA·AC·BM | Account picker → ledger view |
| A14 | Ledger by Account | PAGE | `/accounting/ledger/{accountId}` | SA·AC·BM | Date range, running balance, drill to JE |
| A15 | Trial Balance | PAGE | `/accounting/trial-balance` | SA·AC·BM | As-of date picker, branch filter, drill-down |
| A16 | Profit & Loss | PAGE | `/accounting/profit-loss` | SA·AC·BM | Date range, comparison columns (vs prev period), branch filter |
| A17 | Balance Sheet | PAGE | `/accounting/balance-sheet` | SA·AC·BM | As-of date, branch filter |
| A18 | Cash Flow | PAGE | `/accounting/cash-flow` | SA·AC·BM | Date range, indirect method |
| A19 | Period Close | PAGE | `/accounting/period-close` | SA·AC | List of periods, close action with checklist |

### 6.7 Zakat Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| Z1 | Zakat Periods | PAGE | `/zakat/periods` | SA·AC | Hijri year list with status |
| Z2 | Period Create/Edit | MODAL | from Z1 | SA·AC | Hijri dates, gold/silver rates, nisab |
| Z3 | Calculations List | PAGE | `/zakat/calculations` | SA·AC |  |
| Z4 | Calculation Create | PAGE | `/zakat/calculations/new` | SA·AC | Snapshot wizard |
| Z5 | Calculation Detail | PAGE | `/zakat/calculations/{id}` | SA·AC | Item-level inclusion toggles, finalize action |
| Z6 | Pay Zakat | MODAL | from Z5 | SA·AC | Generates payment voucher |

### 6.8 Reports Module

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| R1 | Report Library | PAGE | `/reports` | All | Searchable grid of all reports, recent + favorites |
| R2 | Sales Summary | PAGE | `/reports/sales-summary` | SA·AC·OD·SL·BM | Filters drawer; chart + table |
| R3 | Sales by Salesperson | PAGE | `/reports/sales-by-salesperson` | SA·AC·OD·BM |  |
| R4 | Sales by Product | PAGE | `/reports/sales-by-product` | SA·AC·OD·BM |  |
| R5 | Purchase Summary | PAGE | `/reports/purchase-summary` | SA·AC·PO·BM |  |
| R6 | Inventory Valuation | PAGE | `/reports/inventory-valuation` | SA·AC·BM | Per warehouse, per product |
| R7 | AR Aging | PAGE | `/reports/aging/customer` | SA·AC·BM·CO | Buckets: 0 / 1-30 / 31-60 / 61-90 / 90+ |
| R8 | AP Aging | PAGE | `/reports/aging/supplier` | SA·AC·BM | Buckets same |
| R9 | Top Customers | PAGE | `/reports/top-customers` | SA·AC·OD·BM | Last N days, top N |
| R10 | Slow Moving Stock | PAGE | `/reports/slow-moving` | SA·AC·BM·PO |  |
| R11 | Dead Stock | PAGE | `/reports/dead-stock` | SA·AC·BM·PO |  |
| R12 | Sales Trends | PAGE | `/reports/sales-trends` | SA·AC·BM | Line + heatmap by region |
| R13 | Customer Statement | PAGE | `/reports/customer-statement/{id}` | SA·AC·BM·CO | Printable PDF version |
| R14 | Export Report | MODAL | any report | All who see report | Format: PDF / Excel / CSV |
| R15 | Schedule Report | MODAL | any report | SA·AC·BM | Email schedule (future-friendly slot) |

### 6.9 AI Assistant

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| AI1 | AI Chat (drawer) | DRAWER | floating button | All | Persistent across navigation |
| AI2 | AI Full Page | PAGE | `/ai-assistant` | All | Full-screen conversation with side panel of saved chats |
| AI3 | Suggested Prompts | inline | within AI1/AI2 | All | "What sold most last month?", etc. |
| AI4 | Flag Response | MODAL | from chat | All | User reports incorrect answer |

### 6.10 SMS / Notifications

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| N1 | SMS History | PAGE | `/notifications/sms` | SA·AC·OD·SL·BM·CO | Filters: status, template, date |
| N2 | SMS Detail | PAGE | `/notifications/sms/{id}` | All | Body, gateway, cost, delivery receipt |
| N3 | Templates List | PAGE | `/notifications/templates` | SA | Card grid |
| N4 | Template Editor | PAGE | `/notifications/templates/{code}` | SA | Body editor with variable picker, live preview |
| N5 | Test Template | MODAL | from N4 | SA | Send test SMS |
| N6 | Gateways List | PAGE | `/notifications/gateways` | SA | Provider config, health, priority |
| N7 | Bulk SMS Campaign | PAGE | `/notifications/sms/bulk` | SA·BM | Audience picker + template + schedule |
| N8 | Notifications Drawer | DRAWER | from top bar | All | In-app notifications (separate from SMS) |

### 6.11 Administration

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| AD1 | Users List | PAGE | `/admin/users` | SA |  |
| AD2 | User Create | PAGE | `/admin/users/new` | SA | Form + role assignment + branch access |
| AD3 | User Detail | PAGE | `/admin/users/{id}` | SA | Tabs: Profile · Roles · Branches · Sessions · Activity |
| AD4 | Reset Password | MODAL | from AD3 | SA | Send reset link / set temp password |
| AD5 | Roles List | PAGE | `/admin/roles` | SA |  |
| AD6 | Role Editor | PAGE | `/admin/roles/{id}` | SA | Permission matrix grouped by module |
| AD7 | Branches List | PAGE | `/admin/branches` | SA |  |
| AD8 | Branch Create/Edit | PAGE | `/admin/branches/new` | SA | Address, manager, prefixes |
| AD9 | Audit Log | PAGE | `/admin/audit-log` | SA | Filter user, action, entity; full-text search; before/after diff |
| AD10 | Backup & Restore | PAGE | `/admin/backup` | SA | Run backup, download list, restore drill log |
| AD11 | System Settings | PAGE | `/admin/settings` | SA | Tabs: Company · Numbering · Tax · Currency · Email · Integrations |
| AD12 | LLM Usage & Cost | PAGE | `/admin/llm-usage` | SA | Charts: queries/day, cost/day, top users, flagged answers |

### 6.12 Profile / Me

| # | Screen | Type | URL | Roles |
|---|---|---|---|---|
| ME1 | My Profile | PAGE | `/profile` | All | View/edit own info |
| ME2 | Security | PAGE | `/profile/security` | All | Change password, 2FA (future), active sessions |
| ME3 | Preferences | PAGE | `/profile/preferences` | All | Theme, default branch, notification settings |
| ME4 | Sessions | PAGE | `/profile/sessions` | All | Logout other devices |

---

## 7. Role-Based Dashboards

Each role lands on `/dashboard` but sees a tailored set of widgets. Layout is a **12-column responsive grid**.

### 7.1 SuperAdmin Dashboard

| Widget | Size | Content |
|---|---|---|
| Today's Sales | 3 cols | Total amount, # invoices, vs yesterday delta |
| Today's Collections | 3 cols | Cash in across all methods |
| Outstanding (AR) | 3 cols | Total + overdue (red) |
| Payables (AP) | 3 cols | Total + due-soon (yellow) |
| Sales Trend (last 30d) | 8 cols | Line chart |
| Top Products (week) | 4 cols | List with sparklines |
| Branch Performance | 6 cols | Bar chart per branch |
| Stock Alerts | 6 cols | Low stock + dead stock counts |
| AI Insights | 12 cols | LLM-generated daily briefing |
| Recent Activity | 12 cols | Audit log feed (last 20) |

### 7.2 Accountant Dashboard

| Widget | Size | Content |
|---|---|---|
| Cash on Hand | 3 cols | All cash accounts total |
| Bank Balances | 3 cols | All banks total + per-bank breakdown |
| Today's Receipts | 3 cols | Sum of receipt vouchers |
| Today's Payments | 3 cols | Sum of payment vouchers |
| AR Aging Snapshot | 6 cols | Stacked bar chart |
| AP Aging Snapshot | 6 cols | Stacked bar chart |
| Pending JEs (DRAFT) | 6 cols | List with quick post action |
| Period Close Status | 6 cols | Open/closed badge per branch |
| Overdue Invoices | 12 cols | Top 10 with quick "Send Reminder" |

### 7.3 Order Department Dashboard

| Widget | Size | Content |
|---|---|---|
| Orders Today | 3 cols | Count + value |
| Pending Confirmation | 3 cols | Count → click to filtered list |
| To Pack | 3 cols | Count |
| To Dispatch | 3 cols | Count |
| Credit Holds | 6 cols | List awaiting decision |
| Order Pipeline | 6 cols | Funnel chart |
| Today's Dispatches | 12 cols | Live table with status |
| Returns Pending Approval | 12 cols | List |

### 7.4 Sales Dashboard

| Widget | Size | Content |
|---|---|---|
| My Sales (MTD) | 3 cols | My target progress |
| My Orders Today | 3 cols | Count + value |
| My Customers | 3 cols | Active count |
| My Visits Today | 3 cols | Planned vs completed |
| My Top Customers | 6 cols | Last 30 days |
| My Pending Orders | 6 cols | Awaiting next action |
| My Targets | 12 cols | Progress chart |
| Quick Actions | inline | + New Order · + New Visit · + New Customer |

### 7.5 Purchase Officer Dashboard

| Widget | Size | Content |
|---|---|---|
| Open POs | 3 cols | Count + value |
| Awaiting Receipt | 3 cols | POs with goods en route |
| GRNs This Week | 3 cols | Count + total value |
| Pending Invoices | 3 cols | Suppliers' invoices to enter |
| Top Suppliers | 6 cols | Last 90 days |
| Reorder Suggestions | 6 cols | Items below reorder level |
| Recent GRNs | 12 cols | Table |

### 7.6 Branch Manager Dashboard

| Widget | Size | Content |
|---|---|---|
| Branch P&L (MTD) | 6 cols | Revenue, COGS, expenses, profit |
| Branch Cash Position | 6 cols | All accounts owned by branch |
| Sales Team Performance | 6 cols | Bar chart per salesperson |
| Inventory Health | 6 cols | Low stock + dead stock for branch warehouses |
| Customer Visits Today | 12 cols | Map with all team visits |
| Branch Operations | 12 cols | Open orders, pending POs, pending JEs |

### 7.7 Collections Officer Dashboard

| Widget | Size | Content |
|---|---|---|
| Collected Today | 3 cols | Sum |
| Collected MTD | 3 cols | Progress vs target |
| Overdue 90+ Days | 3 cols | Critical |
| Promised Today | 3 cols | Customers who promised payment today |
| AR Aging Drill | 12 cols | Interactive aging table |
| Customers to Call | 12 cols | AI-suggested list with last-contact info |

---

## 8. Critical User Flows

### 8.1 Sales: Create Order → Dispatch → Invoice → Payment

```
Sales Rep: clicks "+ New Order" in top bar
  ↓
Step 1: Pick customer (autocomplete) + select items (search/scan)
  ↓
Step 2: Apply pricing rules, discount, tax — live total preview
  ↓
Step 3: Review → Submit
  ↓
[Credit Check runs server-side]
  ├─ PASS  → status SUBMITTED, redirect to order detail
  ├─ WARN  → toast "Customer near credit limit", proceed
  └─ BLOCK → status CREDIT_HOLD, banner shows; need override
  ↓
Order Dept opens order from Credit Holds queue
  → Override (with reason) OR Cancel
  ↓
Order Dept clicks Confirm → Pack → Dispatch on detail page
  ↓
[On Dispatch click:]
  - Stock movement posted
  - Invoice auto-generated (number + PDF)
  - Journal entry posted
  - SMS queued to customer
  - Drawer slides in showing the new invoice with Print/Email buttons
  ↓
Later: Customer pays → Accountant clicks "Record Payment" on Invoice
  → Drawer: payment method, amount, allocation
  → Voucher posted, invoice status updates
```

### 8.2 Purchase: PO → GRN → Invoice → Payment

```
Purchase Officer: + New Purchase Order
  ↓
Pick supplier, items, costs, expected date → Submit
  ↓
Branch Manager opens PO from approval queue → Approve
  ↓
[Goods arrive physically]
  ↓
Purchase Officer: Open PO → "Create GRN" button
  ↓
GRN form: per-line received qty, accepted, damaged, batch, expiry
  → Post
  ↓
[Stock ↑, JE: DR Inv / CR GR-IR posted]
  ↓
Supplier sends commercial invoice
  ↓
Purchase Officer / Accountant: Open PO → "Create Purchase Invoice"
  → Confirms amounts match GRN; adds supplier invoice number
  → Post
  ↓
[JE: DR GR-IR / CR AP posted]
  ↓
Later: Accountant opens Purchase Invoice → "Pay" button
  → Drawer: payment method (Cash/Bank/Wallet), WHT, amount
  → Voucher posted, invoice marked paid
```

### 8.3 Login → Role-Based Dashboard

```
/login
  ↓ submit credentials
[Server validates, returns JWT + user.permissions[]]
  ↓
Redirect to /dashboard
  ↓
Dashboard component reads user.role(s)
  → Renders matching widget grid (§7)
  → Sidebar filters menu by permissions
```

### 8.4 Stock Transfer: Karachi → Lahore

```
Order Dept (Karachi): + New Stock Transfer
  → From: Karachi · To: Lahore · Items
  → Submit (state: PENDING_APPROVAL)
  ↓
Branch Manager: Approve (state: APPROVED, source stock reserved)
  ↓
Karachi warehouse: Click "Ship"
  → Modal confirms qty being shipped
  → State: IN_TRANSIT
  → JE: DR Goods-in-Transit / CR Inventory-Karachi
  ↓
Lahore warehouse: Click "Receive"
  → Modal: per-line received qty (capture discrepancy)
  → State: RECEIVED
  → JE: DR Inventory-Lahore / CR Goods-in-Transit
  → If shortfall → JE: DR Shrinkage / CR Goods-in-Transit
```

### 8.5 Sales Return with Condition

```
Customer brings back goods
  ↓
Sales Rep: + New Sales Return
  → Pick original invoice (autocomplete by invoice number / customer)
  → Per line: how many returning + condition (RESALABLE / DAMAGED / EXPIRED)
  → If RESALABLE → pick warehouse to restock
  → If DAMAGED → goes to virtual "Damaged" warehouse
  → Reason (textarea)
  → Submit (state: DRAFT)
  ↓
Order Dept / Accountant: Open return → Approve
  ↓
[Stock movements posted per condition + reversing JE posted +
 refund voucher created if cash]
```

### 8.6 Manual Journal Voucher

```
Accountant: Accounting → Journal Entries → + New JE
  ↓
Form:
  Date, branch, narration
  Lines table (debit | credit columns)
    + Add line
    Live total at bottom; debit must equal credit
  Save as DRAFT
  ↓
Review screen → Post
  ↓
Status: POSTED (immutable). Reverse only via reversing JE.
```

### 8.7 AI Assistant Q&A

```
User: clicks ✨ in top bar
  ↓
Right drawer slides in with chat
  ↓
User types: "Which wholesalers in Karachi haven't paid in 30+ days?"
  ↓
[Server: classify intent → permission check → tool call get_ar_aging(...) →
 LLM renders answer with table]
  ↓
Drawer shows answer + table + "View full report" link
  ↓
User can: Flag answer, Save to favorites, Open as full page (/ai-assistant)
```

### 8.8 Customer Visit Log (Web with browser GPS)

```
Sales Rep at customer location → opens VIZO on phone browser
  ↓
Parties → finds customer → "Check In"
  ↓
[Browser asks for location permission → captures GPS]
  ↓
Form: purpose, notes, can attach photo (camera)
  ↓
Submit → visit logged, "Check Out" button now visible
  ↓
Later → "Check Out" → captures end GPS + outcome (ORDER_PLACED / NO_ORDER / FOLLOWUP)
  ↓
If ORDER_PLACED → "Create Order Now" button → goes to order wizard with customer prefilled
```

### 8.9 Period Close

```
Accountant: Accounting → Period Close
  ↓
Sees list of months per branch with status
  ↓
Click "Close April 2026 — Karachi" button
  ↓
[Pre-close checklist modal:
   ✅ All draft JEs reviewed
   ✅ All vouchers posted
   ✅ Bank reconciled
   ❌ 3 unposted purchase invoices ← blocker
   Action: View unposted]
  ↓
Resolve blockers, return → Close
  ↓
Period locked: any future post to closed period rejected with friendly error
```

### 8.10 Backup & Restore Drill (SuperAdmin)

```
Admin → Backup & Restore
  ↓
"Run Backup Now" button → progress bar → success toast with download link (15 min validity)
  ↓
Below: list of recent backups with size, integrity hash, created_by
  ↓
Tab "Restore Drill Log" → table of monthly drills with diff results
  ↓
Tab "Schedule" → cron schedule editor (display only — actual config in settings)
```

---

## 9. Modal vs Drawer vs Full-Page Decision Matrix

| Use Case | Pattern |
|---|---|
| Confirm a destructive action (delete, void, cancel) | **MODAL** — small, centered, with X in corner |
| Quick edit single field (rename, change status) | **MODAL** small |
| Quick create lightweight entity (contact, address, brand) | **MODAL** medium |
| Detail preview without leaving the list | **DRAWER** right |
| AI Assistant chat | **DRAWER** right (persistent) |
| Notifications full list | **DRAWER** right |
| Filters (advanced) | **DRAWER** right |
| Quick payment recording | **DRAWER** right |
| Multi-step wizards (new order, new PO, new GRN) | **FULL PAGE** with progress indicator |
| Detail page with tabs | **FULL PAGE** |
| Reports with filters | **FULL PAGE** with collapsible filter bar |
| Print preview | **FULL PAGE** (separate clean route) |

---

## 10. Responsive Behavior

### Breakpoints (Tailwind defaults)
- `sm:` 640px — small tablet portrait
- `md:` 768px — tablet
- `lg:` 1024px — small laptop
- `xl:` 1280px — desktop
- `2xl:` 1536px — large monitor

### Adaptive Patterns

| Element | Mobile (< md) | Tablet (md-lg) | Desktop (≥ lg) |
|---|---|---|---|
| **Sidebar** | Hidden, drawer overlay on toggle | Collapsed (icons only) | Expanded by default, user can collapse |
| **Top bar search** | Icon → expands fullscreen | Inline shrunk | Inline full width |
| **Branch switcher** | In sidebar drawer | Top bar dropdown | Top bar dropdown |
| **Tables** | Card view (each row → stacked card) | Horizontal scroll | Full table |
| **Forms** | Single column | Single column wide fields | 2-col grid |
| **Detail tabs** | Horizontal scroll | Horizontal | Horizontal full |
| **Dashboard widgets** | 1-col stacked | 6-col (2 per row) | 12-col grid |
| **Modals** | Full screen | Centered, max-w-md | Centered, max-w-lg/xl |
| **Drawers** | Full screen | Right slide 60% | Right slide 480px |
| **Page actions** | Bottom sticky bar | Top right header | Top right header |
| **Money columns** | Single right-aligned | Right aligned | Right aligned + tabular |

### Mobile-Specific UX
- **Bottom tab bar** for top 5 actions when sidebar is hidden (Dashboard, Orders, Parties, Reports, More)
- **Floating Action Button** (FAB) for primary action on list screens (e.g. + on Orders list)
- **Swipe actions** on cards (swipe left to reveal Delete/Edit) — Alpine.js
- **Pull-to-refresh** on list screens (visual only in prototype)

---

## 11. Component Library Catalog

To be built once, reused everywhere. Saved as Alpine.js components / HTML partials in `components/`.

### 11.1 Atoms
- **Button** — variants: primary, secondary, ghost, danger, outline · sizes: sm, md, lg, icon · states: default, hover, focus, disabled, loading
- **Icon Button** — square, with tooltip
- **Badge** — variants: default, success, warning, danger, info, outline · sizes: sm, md
- **Status Pill** — colored dot + label (e.g. ● POSTED, ● DRAFT, ● OVERDUE)
- **Avatar** — with initials fallback, sizes
- **Tag / Chip** — removable
- **Input** — text, email, password, number (with stepper), search (with icon), money (right-aligned, tabular)
- **Textarea** — auto-resize
- **Select / Combobox** — searchable, multi-select variant
- **Date Picker** — single date, date range, with shortcuts (Today, This Week, MTD, etc.)
- **Toggle / Switch**
- **Checkbox** — indeterminate state
- **Radio Group**
- **File Upload** — drag-drop zone + preview
- **Color Swatch**
- **Spinner / Loader**
- **Skeleton** — for loading states

### 11.2 Molecules
- **Form Field** — label + input + helper + error
- **Inline Edit** — click to edit field
- **Search Bar** — with icon, clear button, optional shortcut hint
- **Filter Bar** — chips for active filters + "+ Add Filter" + "Clear all"
- **Empty State** — illustration + title + description + CTA
- **Stat Card** — label + big number + delta (up/down arrow + %) + sparkline
- **Toolbar** — page header actions cluster
- **Tabs** — pill style + underline style
- **Breadcrumbs**
- **Pagination** — prev/next + page numbers + page size
- **Toast / Snackbar** — success, error, info, warning + action button slot
- **Alert / Banner** — full-width inline alert
- **Tooltip**
- **Popover**
- **Confirmation Dialog**
- **Progress Bar** + **Progress Stepper** (for wizards)

### 11.3 Organisms
- **App Shell** — top bar + sidebar + content area
- **Sidebar Navigation** — collapsible, multi-level
- **Data Table** — sortable, filterable, paginated, row selection, sticky header, sticky first column, column visibility toggle, bulk actions bar
- **Card** — heading + content + footer slots
- **List Item** — avatar/icon + title + meta + actions
- **Form Layout** — single col / two col / sectioned
- **Wizard** — step indicator + content + nav buttons
- **Detail Layout** — header + tabs + content + side panel
- **Report Layout** — header + filters bar + chart + table + export
- **Chart Wrappers** — line, bar, pie, donut, sparkline, heatmap (use Chart.js or ApexCharts in prototype)
- **Kanban Board** — for transfer pipeline
- **Calendar / Timeline** — for visits, period close

### 11.4 Domain-Specific Composites
- **Money Display** — tabular, right-aligned, with currency, with delta
- **Aging Buckets Bar** — stacked horizontal bar (current/30/60/90/90+)
- **Status Pipeline** — order/PO/transfer state visualization
- **Voucher Form** — adapts to type (cash/bank/wallet/JV)
- **Journal Entry Lines Editor** — multi-line table with running balance check
- **Item Picker** — product autocomplete + barcode scan + qty + price
- **Party Picker** — autocomplete with type filter + quick create
- **Branch Switcher** — dropdown
- **Permission Matrix** — checkbox grid grouped by module

---

## 12. Notification & Feedback Patterns

| Event | Pattern | Position | Duration |
|---|---|---|---|
| Success action (saved, posted) | Toast (green) | Top right | 4s |
| Error from server | Toast (red) | Top right | 6s + Retry button |
| Form validation error | Inline below field | Field | Until fixed |
| Long-running action | Progress bar + skeleton | Inline | Until done |
| Background job started (e.g. PDF gen) | Toast with link | Top right | 4s |
| Background job complete | Toast + bell badge | Top right + bell | 6s |
| Critical alert (credit hold, overdue) | Banner | Top of page | Sticky until dismissed |
| Confirmation needed | Modal | Center | Until decision |
| Quick info | Tooltip | Hover target | Hover |
| New unread notification | Bell badge | Top bar | Until read |

---

## 13. Page Inventory Summary

| Module | Pages | Modals | Drawers | Total |
|---|---|---|---|---|
| Auth & Errors | 9 | 1 | 0 | 10 |
| Dashboard | 1 | 1 | 1 | 3 |
| Sales | 12 | 5 | 1 | 18 |
| Purchases | 11 | 2 | 1 | 14 |
| Parties | 9 | 3 | 0 | 12 |
| Inventory | 14 | 4 | 1 | 19 |
| Accounting | 18 | 3 | 0 | 21 |
| Zakat | 4 | 2 | 0 | 6 |
| Reports | 13 | 2 | 0 | 15 |
| AI Assistant | 1 | 1 | 1 | 3 |
| SMS / Notifications | 6 | 1 | 1 | 8 |
| Administration | 11 | 1 | 0 | 12 |
| Profile | 4 | 0 | 0 | 4 |
| **TOTAL** | **113** | **26** | **6** | **145** |

> Note: many "modals" and "drawers" are reused (e.g. one Confirmation Dialog component handles dozens of confirm flows). Actual unique HTML files in prototype: ~85-95.

---

## 14. Build Order (UI Construction Sequence)

To stay productive and demo-able from week 1:

### Phase A — Foundation (Week 1)
1. Tailwind config + design tokens (colors, fonts, spacing)
2. App Shell: Top Bar + Sidebar + Main + Right Drawer
3. Theme toggle (light/dark) + persistence
4. Component library atoms (Button, Input, Badge, Card, Modal, Toast)
5. Login screen
6. SuperAdmin Dashboard (showcase widgets)

### Phase B — Master Data (Week 2)
7. Parties List + Detail (with all tabs)
8. Products List + Detail
9. Warehouses, Branches, Categories, Brands, UoM
10. Users / Roles / Permissions admin

### Phase C — Sales Flow (Week 3)
11. Orders List + Wizard Create + Detail
12. Credit Hold flow
13. Invoices List + Detail + Print
14. Sales Returns
15. Sales Dashboard widgets

### Phase D — Purchase Flow (Week 4)
16. Purchase Orders List + Create + Detail
17. GRN List + Create + Detail
18. Purchase Invoices + Pay flow
19. Purchase Returns
20. Purchase Officer Dashboard

### Phase E — Inventory & Transfers (Week 5)
21. Stock Levels + Movements
22. Stock Adjustments
23. Stock Transfers (Kanban + Detail with state actions)

### Phase F — Accounting (Week 6)
24. Chart of Accounts (tree)
25. Journal Entries (List + Create + Detail)
26. Vouchers (all types in unified form)
27. Expenses
28. Ledger, Trial Balance, P&L, Balance Sheet, Cash Flow
29. Period Close

### Phase G — Reports & Insights (Week 7)
30. Report Library hub
31. All standard reports (sales, purchase, inventory, financial)
32. AR/AP Aging
33. Top Customers, Slow Moving, Dead Stock
34. Sales Trends

### Phase H — Notifications, AI, Zakat, Admin (Week 8)
35. SMS history, templates, gateways
36. AI Assistant drawer + full page
37. Zakat module
38. Audit Log, Backup, Settings, LLM Usage

### Phase I — Polish (Week 9)
39. Empty states, error states, loading states everywhere
40. Animations & transitions
41. Mobile responsive QA on every screen
42. Accessibility audit
43. Print stylesheets for invoices, vouchers, reports

---

## 15. Open Questions / Pending Decisions

Things to confirm before/during build (not blockers for sitemap):

1. **VIZO logo files** — provide SVG (preferred) or high-res PNG, both light and dark variants if available
2. **Brand colors** — primary (HEX), secondary, success/warning/danger overrides if needed
3. **Default sidebar state** — expanded or collapsed for first-time users? (Recommend: expanded on desktop, hidden on mobile)
4. **Dashboard widget personalization** — should users be able to drag/reorder widgets? (Recommend: not in v1, set per role)
5. **PDF print template** — minimal vs branded with full letterhead? (Recommend: branded for invoices)
6. **Currency** — PKR only or multi-currency support in UI? (Recommend: PKR only for v1)
7. **Date format** — `DD-MMM-YYYY` (e.g. 01-May-2026) or `YYYY-MM-DD`? (Recommend: DD-MMM-YYYY)
8. **Numbers** — Pakistani lakh/crore grouping (1,00,000) or international (100,000)? (Recommend: international 100,000)

---

*End of Document — VIZO ERP UI Sitemap v1.0*
*Next deliverable: Design System (color tokens, typography scale, spacing, component library setup) → then HTML/CSS pages following the Build Order above.*
