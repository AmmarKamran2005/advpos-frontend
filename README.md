# VIZO ERP — Sales · Inventory · Purchases · Accounting

Production-grade ERP system designed for **VIZO Pakistan** (mobile accessories distribution — Karachi · Lahore · Islamabad).

> Multi-branch, double-entry accounting, credit control, AI-assisted insights, SMS notifications, and more.

---

## 📂 Repository Structure

```
.
├── docs/                                # Design documentation (markdown)
│   ├── VIZO_ERP_System_Design.md        # ~3,100 lines — full system blueprint v2.0
│   └── UI_SITEMAP.md                    # ~1,200 lines — UI sitemap & IA
│
├── ui-prototype/                        # HTML/CSS/JS prototype (reference only)
│   ├── index.html                       # Login screen
│   ├── pages/dashboard.html             # SuperAdmin dashboard
│   └── assets/                          # Logos, CSS, JS
│
├── vizo-erp/                            # ★ Production Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/                   # All authenticated pages (sidebar shell)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── parties/             # Customers + Suppliers (unified)
│   │   │   │   ├── sales/               # Orders · Invoices · Returns · Credit Holds
│   │   │   │   ├── purchases/           # POs · GRNs · Invoices · Returns
│   │   │   │   ├── inventory/           # Products · Stock · Transfers · Warehouses
│   │   │   │   ├── accounting/          # COA · JE · Vouchers · TB · P&L · BS · CF
│   │   │   │   ├── zakat/
│   │   │   │   ├── reports/             # Aging · Top Customers · Slow Moving · Dead Stock
│   │   │   │   ├── notifications/       # SMS history · templates · gateways
│   │   │   │   ├── ai-assistant/        # LLM chat
│   │   │   │   ├── admin/               # Users · Roles · Branches · Audit · Backup · LLM Usage
│   │   │   │   └── profile/
│   │   │   └── login/                   # Auth screens
│   │   ├── components/
│   │   │   ├── ui/                      # Button · Card · Badge · Input · DataTable · Tabs · etc.
│   │   │   ├── layout/                  # Sidebar · TopBar · AIDrawer · ThemeToggle
│   │   │   ├── widgets/                 # SalesTrendChart · StatCard · etc.
│   │   │   └── providers/               # ThemeProvider
│   │   ├── data/                        # Mock data (mobile accessories — VIZO catalog)
│   │   ├── lib/                         # nav-config · format · utils
│   │   └── types/
│   └── public/
│       ├── vizo-logo.png
│       └── vizo-logo-dark.jpg
│
├── proposal.docx                         # Original client proposal
└── Sales, Inventory, ... .pdf            # Original client requirements
```

---

## 🛠 Tech Stack

### Frontend (current)
- **Next.js 16** (App Router, React 19, Turbopack)
- **TypeScript** strict mode
- **Tailwind CSS v4** (CSS-based config)
- **shadcn-style components** (custom-built with VIZO theme)
- **Radix UI** primitives (Dialog, Dropdown, Tabs, etc.)
- **Recharts** for charts
- **Lucide** icons
- **next-themes** for dark mode

### Backend (planned)
- **ASP.NET Core 8** + EF Core
- **PostgreSQL 16** (decimal precision for accounting)
- **Redis** for caching, **Hangfire** for background jobs
- **MinIO** for file storage (invoice PDFs, product images)

### AI / Integrations
- **Gemini / OpenAI** — LLM Assistant (tool-calling, no raw SQL)
- **Jazz BizSMS / Telenor / Twilio PK** — SMS gateway with failover
- **Easypaisa / JazzCash / HBL** — payment methods

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| **Brand Yellow** | `#EDC705` | Active states, primary CTAs, accents — used sparingly |
| **Brand Navy**   | `#031833` | Headings, dark mode bg |
| **Font (UI)**    | Inter | All text |
| **Font (Numbers)** | JetBrains Mono | Money, IDs, tabular figures |
| **Inspiration**  | Stripe Dashboard · Tailwind UI · Zoho One | — |

Dark mode is **first-class**, not bolted on.

---

## 🚀 Run Locally

```bash
cd vizo-erp
npm install
npm run dev
```

Open **http://localhost:3000** → login with any credentials → explore.

---

## ✨ What's Built (v1 frontend complete)

- **63 pages** across 11 modules
- **0 TypeScript errors**
- **All routes return 200**
- **Light + Dark mode** on every page
- **Responsive** for desktop/tablet/mobile

### Modules
1. **Dashboard** — role-based widgets, AI insight banner, stat cards, charts
2. **Parties** — unified customers + suppliers, 6-tab detail, visit tracking, credit settings
3. **Sales** — orders with state machine, credit holds, invoices (printable), partial returns
4. **Purchases** — POs, GRNs (with damaged tracking), purchase invoices, returns
5. **Inventory** — products, multi-warehouse stock, transfers (Kanban), movements log
6. **Accounting** — branch-aware COA, JE, vouchers (with mobile wallet support), full reports (TB, P&L, BS, CF), period close
7. **Zakat** — Hijri periods, nisab calculation, finalization
8. **Reports** — AR/AP aging, top customers, slow-moving, dead stock, sales trends
9. **Notifications** — SMS history, templates, gateway management
10. **AI Assistant** — LLM chat with suggested prompts and audit log
11. **Administration** — users, roles, branches, audit log, backup & restore, settings, LLM usage

---

## 📋 Next Phase

1. Backend scaffolding (ASP.NET Core 8 + EF Core + Postgres)
2. Auth API integration (JWT + refresh tokens)
3. Real data wiring (replace mocks)
4. Background jobs (SMS dispatch, daily backup, MV refresh)
5. AI tool implementations (Gemini integration)

---

**Client:** Umer Memon · VIZO Pakistan
**Stack decision date:** 2026-04-10
**Frontend completion:** 2026-05-01
