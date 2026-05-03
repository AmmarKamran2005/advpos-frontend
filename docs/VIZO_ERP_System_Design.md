# VIZO ERP — Sales, Inventory, Purchases & Accounting System
## Senior Architect's Design Document

| Field | Value |
|---|---|
| **Client** | Umer Memon |
| **Company** | VIZO |
| **Domain** | Multi-city Sales, Purchases & Distribution |
| **Document Type** | Production-Grade System Blueprint |
| **Status** | Proposal v2.0 (Enhanced) |
| **Date** | 2026-04-10 |
| **Revision Notes** | v2.0 adds Purchases, Credit Control, Invoice Management, Payment Methods (Cash / Bank / EasyPaisa / JazzCash), Multi-Branch Accounting, Advanced Returns with Condition Tracking, Unified Party System, Advanced Reporting, Mobile GPS/Visit Tracking, Backup & DR, SMS Integration, and LLM-based AI Assistant. |

---

## Table of Contents

- [0. Tech Stack Decision (Justified)](#0-tech-stack-decision-justified)
- [1. High-Level System Architecture](#1-high-level-system-architecture)
  - [1.1 Component Diagram](#11-component-diagram)
  - [1.2 Module Separation (Modular Monolith)](#12-module-separation-modular-monolith)
  - [1.3 Data Flow (Request Lifecycle)](#13-data-flow-request-lifecycle)
- [2. Database Design](#2-database-design)
  - [2.1 Identity & Access Control](#21-identity--access-control)
  - [2.2 Catalog (Products)](#22-catalog-products)
  - [2.3 Inventory](#23-inventory)
  - [2.4 Stock Transfers](#24-stock-transfers)
  - [2.5 Sales (Orders, Invoices, Returns)](#25-sales-orders-invoices-returns)
  - [2.6 Accounting (Double-Entry, Branch-Aware)](#26-accounting-double-entry-branch-aware)
  - [2.7 Vouchers (Cash / Bank / Wallet / Journal)](#27-vouchers-cash--bank--wallet--journal)
  - [2.8 Zakat](#28-zakat)
  - [2.9 Reporting (Materialized Views)](#29-reporting-materialized-views)
  - [2.10 Entity Relationship Overview](#210-entity-relationship-overview)
  - [2.11 Parties (Unified Customers + Suppliers)](#211-parties-unified-customers--suppliers)
  - [2.12 Purchases (Suppliers → PO → GRN → Invoice → Return)](#212-purchases-suppliers--po--grn--invoice--return)
  - [2.13 Branches & Multi-Branch Accounting](#213-branches--multi-branch-accounting)
  - [2.14 Notifications (SMS / Email / Push)](#214-notifications-sms--email--push)
  - [2.15 AI Assistant (LLM Query Log)](#215-ai-assistant-llm-query-log)
- [3. API Design](#3-api-design)
  - [3.1 Conventions](#31-conventions)
  - [3.2 Identity & Auth](#32-identity--auth)
  - [3.3 Catalog](#33-catalog)
  - [3.4 Inventory](#34-inventory)
  - [3.5 Stock Transfers](#35-stock-transfers)
  - [3.6 Sales, Invoices & Returns](#36-sales-invoices--returns)
  - [3.7 Accounting](#37-accounting)
  - [3.8 Vouchers & Payments](#38-vouchers--payments)
  - [3.9 Zakat](#39-zakat)
  - [3.10 Reporting & AI](#310-reporting--ai)
  - [3.11 Mobile-Specific (GPS + Visits)](#311-mobile-specific-gps--visits)
  - [3.12 Parties (Unified)](#312-parties-unified)
  - [3.13 Purchases](#313-purchases)
  - [3.14 Notifications (SMS)](#314-notifications-sms)
  - [3.15 AI Assistant (LLM)](#315-ai-assistant-llm)
- [4. Role & Permission System](#4-role--permission-system)
  - [4.1 Model: RBAC + Attribute Filters](#41-model-rbac--attribute-filters)
  - [4.2 Permission Catalog (Sample)](#42-permission-catalog-sample)
  - [4.3 Default Role Mappings](#43-default-role-mappings)
  - [4.4 Implementation (ASP.NET Core)](#44-implementation-aspnet-core)
  - [4.5 Warehouse Scoping (Attribute-Based Filter)](#45-warehouse-scoping-attribute-based-filter)
  - [4.6 Dynamic Permission Assignment Flow](#46-dynamic-permission-assignment-flow)
- [5. Detailed Development Plan](#5-detailed-development-plan)
- [6. Risks & Challenges](#6-risks--challenges)
  - [6.1 Accounting Integrity (the #1 risk)](#61-accounting-integrity-the-1-risk)
  - [6.2 Inventory Consistency](#62-inventory-consistency)
  - [6.3 Performance](#63-performance)
  - [6.4 Security](#64-security)
  - [6.5 Business & Operational](#65-business--operational)
- [7. Optimization Suggestions](#7-optimization-suggestions)
  - [7.1 Database](#71-database)
  - [7.2 Application](#72-application)
  - [7.3 Frontend](#73-frontend)
  - [7.4 Mobile](#74-mobile)
  - [7.5 Security](#75-security)
  - [7.6 DevOps](#76-devops)
- [8. System Flowcharts](#8-system-flowcharts)
  - [8.1 Order Flow (Sales → Credit Check → Invoice → Ledger)](#81-order-flow-sales--credit-check--invoice--ledger)
  - [8.2 Inventory Flow](#82-inventory-flow)
  - [8.3 Stock Transfer Flow](#83-stock-transfer-flow)
  - [8.4 Accounting Flow (Unified)](#84-accounting-flow-unified)
  - [8.5 Permission Check Flow](#85-permission-check-flow)
  - [8.6 Zakat Calculation Flow](#86-zakat-calculation-flow)
  - [8.7 Mobile Offline Sync Flow (with GPS)](#87-mobile-offline-sync-flow-with-gps)
  - [8.8 Purchase Flow (Supplier → PO → GRN → Invoice → Payment)](#88-purchase-flow-supplier--po--grn--invoice--payment)
  - [8.9 Credit Control Flow](#89-credit-control-flow)
  - [8.10 SMS Notification Flow](#810-sms-notification-flow)
  - [8.11 AI Assistant (LLM) Query Flow](#811-ai-assistant-llm-query-flow)
- [9. Backup, Disaster Recovery & Data Safety](#9-backup-disaster-recovery--data-safety)
- [10. SMS Integration Strategy (Pakistan)](#10-sms-integration-strategy-pakistan)
- [11. AI Strategy — LLM Insights + Optional ML Forecasting](#11-ai-strategy--llm-insights--optional-ml-forecasting)
- [12. Immediate Next Steps (Recommended Kickoff)](#12-immediate-next-steps-recommended-kickoff)

---

## 0. Tech Stack Decision (Justified)

| Layer | Choice | Why |
|---|---|---|
| **Backend** | **ASP.NET Core 8 (C#)** | Accounting systems demand `decimal` precision, strong typing, and transactional integrity. ASP.NET Core + EF Core handles `decimal(18,4)` natively — Node.js needs `decimal.js` everywhere, which leaks through every API boundary. Also: first-class DI, FluentValidation, MediatR for CQRS, and excellent performance. |
| **Frontend (Web)** | **Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui** | Server components for dashboards, RSC for heavy reports, built-in auth middleware. |
| **Mobile** | **React Native (Expo SDK) + TypeScript** | Single JS codebase for iOS + Android; Expo Barcode Scanner is mature; OTA updates via EAS. |
| **Database** | **PostgreSQL 16** | MVCC, partial indexes, `NUMERIC` type for accounting, row-level locking, partitioning for stock_movements. |
| **Cache / Queue** | **Redis 7** + **Hangfire** (or **RabbitMQ**) | Session cache, report cache, background jobs (low-stock alerts, nightly closing, AI batch jobs). |
| **File Storage** | **MinIO (S3-compatible)** | Product images, invoice PDFs, receipt uploads. |
| **Search** | **PostgreSQL full-text** initially, **Meilisearch** later | Avoid Elastic until justified by volume. |
| **Observability** | **Serilog → Seq**, **OpenTelemetry → Grafana/Tempo** | Structured logs, traces, metrics. |
| **Auth** | **JWT (access) + Refresh Tokens + Argon2id hashing** | Industry standard; refresh tokens stored hashed in DB. |
| **Architecture** | **Modular Monolith (Clean Architecture)** | Microservices are premature for a single client with ~4 roles; monolith ships faster and can be split later at module boundaries. |

---

## 1. High-Level System Architecture

### 1.1 Component Diagram

```
                         ┌─────────────────────────────────────────┐
                         │              CLIENTS                    │
                         ├─────────────────┬───────────────────────┤
                         │  Next.js Web    │   React Native App    │
                         │ (Admin/Account/ │  (Sales Team, Order   │
                         │  Orders/Sales)  │   Dept, Warehouse)    │
                         └────────┬────────┴────────┬──────────────┘
                                  │                 │
                                  │  HTTPS / JWT    │
                                  ▼                 ▼
                         ┌─────────────────────────────────────────┐
                         │        API GATEWAY (Nginx / YARP)       │
                         │    TLS • Rate Limit • CORS • WAF        │
                         └────────────────────┬────────────────────┘
                                              │
                         ┌────────────────────▼────────────────────┐
                         │        ASP.NET CORE API (Monolith)      │
                         │   ┌──────────────────────────────────┐  │
                         │   │  Presentation Layer (Controllers)│  │
                         │   ├──────────────────────────────────┤  │
                         │   │  Application Layer               │  │
                         │   │  (CQRS: Commands / Queries       │  │
                         │   │   via MediatR + Validators)      │  │
                         │   ├──────────────────────────────────┤  │
                         │   │  Domain Layer                    │  │
                         │   │  (Entities, Aggregates,          │  │
                         │   │   Domain Events, Value Objects)  │  │
                         │   ├──────────────────────────────────┤  │
                         │   │  Infrastructure Layer            │  │
                         │   │  (EF Core, Repos, Identity,      │  │
                         │   │   Email, Storage, AI clients)    │  │
                         │   └──────────────────────────────────┘  │
                         └──┬───────┬────────┬─────────┬───────────┘
                            │       │        │         │
                            ▼       ▼        ▼         ▼
                    ┌───────────┐ ┌─────┐ ┌──────┐ ┌─────────────┐
                    │PostgreSQL │ │Redis│ │MinIO │ │  Hangfire   │
                    │  (Primary)│ │Cache│ │ Files│ │  Jobs / Cron│
                    │  + Replica│ └─────┘ │  +   │ └─────────────┘
                    │           │         │ PDFs │
                    └─────┬─────┘         └──────┘
                          │
                          │ nightly
                          ▼
                    ┌─────────────┐
                    │ Backups:    │
                    │ pg_basebackup│
                    │ + WAL-G     │
                    │ → S3/MinIO  │
                    └─────────────┘

                     ┌─────────────────────────────────────────┐
                     │       EXTERNAL SERVICES                 │
                     ├─────────────────┬───────────────────────┤
                     │ SMS Gateway     │ LLM Provider          │
                     │ (Jazz/Telenor/  │ (Gemini / OpenAI)     │
                     │  Twilio PK)     │ — AI Assistant        │
                     ├─────────────────┼───────────────────────┤
                     │ Mobile Wallet   │ ML Service (Python    │
                     │ APIs (Easypaisa,│ FastAPI) — OPTIONAL   │
                     │  JazzCash)      │ Prophet/SARIMAX       │
                     └─────────────────┴───────────────────────┘
```

### 1.2 Module Separation (Modular Monolith)

Each bounded context is a separate assembly/project. No cross-module DB access — only via domain events or public contracts.

```
src/
├── Vizo.Api/                         (hosting, DI, middleware)
├── Vizo.Shared.Kernel/               (base entities, value objects, errors)
├── Vizo.Shared.Infrastructure/       (EF Core base, auth, audit, backup)
├── Modules/
│   ├── Identity/                     (users, roles, permissions, branches)
│   ├── Catalog/                      (products, categories, barcodes)
│   ├── Inventory/                    (stock, warehouses, movements)
│   ├── StockTransfer/                (transfers between warehouses)
│   ├── Parties/                      (★ unified customers + suppliers)
│   ├── Sales/                        (orders, invoices, returns, credit control)
│   ├── Purchases/                    (★ suppliers, POs, GRNs, purchase invoices, returns)
│   ├── Accounting/                   (COA, journals, ledger, branch-aware)
│   ├── Vouchers/                     (cash/bank/wallet/journal vouchers, payment methods)
│   ├── Zakat/                        (zakat calculations)
│   ├── Reporting/                    (read models, materialized views, aging, dead stock)
│   ├── Notifications/                (★ SMS gateway abstraction, queued dispatch)
│   └── Intelligence/                 (LLM assistant, optional ML forecasts)
└── Vizo.Tests/
    ├── Unit/
    ├── Integration/
    └── Architecture/                 (enforces module boundaries)
```

> **★ = new in v2.0.** All cross-module communication still happens via domain events (Outbox pattern) — the `Parties` module publishes `PartyUpdated`, `Sales`/`Purchases` subscribe for denormalized reads; `Accounting` subscribes to `OrderDispatched`, `GoodsReceived`, `PaymentCollected`; `Notifications` subscribes to `OrderDispatched`, `InvoiceGenerated`, `PaymentDue` to queue SMS dispatch.

### 1.3 Data Flow (Request Lifecycle)

```
Client → JWT validated → Permission checked (policy) → Controller
       → MediatR Command/Query → FluentValidation
       → Domain Aggregate (business rules)
       → EF Core (Unit of Work, transaction)
       → Domain Events published → Outbox table
       → Background worker dispatches events → other modules react
       → Response DTO → Client
```

---

## 2. Database Design

> All tables use `id BIGINT GENERATED ALWAYS AS IDENTITY`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at` (soft delete where appropriate). Money uses `NUMERIC(18,4)`. Quantities use `NUMERIC(18,3)`.

### 2.1 Identity & Access Control

```sql
-- Users
users (
  id BIGINT PK,
  email CITEXT UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  password_hash TEXT NOT NULL,       -- Argon2id
  full_name VARCHAR(150),
  phone VARCHAR(20),
  employee_code VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  failed_login_count INT DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at, updated_at, deleted_at
)

roles (
  id BIGINT PK,
  name VARCHAR(50) UNIQUE,           -- SuperAdmin, Accountant, OrderDept, Sales
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE    -- system roles cannot be deleted
)

permissions (
  id BIGINT PK,
  permission_key VARCHAR(100) UNIQUE, -- e.g. 'orders.create', 'accounting.journal.post'
  module VARCHAR(50),
  action VARCHAR(50),                 -- read|write|update|delete|approve|post
  resource VARCHAR(50),
  description TEXT
)

role_permissions (role_id, permission_id, PK(role_id, permission_id))
user_roles        (user_id, role_id, assigned_by, assigned_at, PK(user_id, role_id))

-- Multi-warehouse scoping: restrict a user to specific warehouses
user_warehouse_access (user_id, warehouse_id, PK(user_id, warehouse_id))

refresh_tokens (
  id BIGINT PK, user_id, token_hash, device_info, ip_address,
  issued_at, expires_at, revoked_at
)

audit_logs (
  id BIGINT PK, user_id, action, entity_name, entity_id,
  old_values JSONB, new_values JSONB,
  ip_address INET, user_agent TEXT, created_at
)
-- Index: (entity_name, entity_id), (user_id, created_at)
```

### 2.2 Catalog (Products)

```sql
categories (
  id, parent_id (self FK), name, slug UNIQUE, description,
  image_url, sort_order, is_active
)
-- ltree extension for hierarchical queries, or materialized path

brands (id, name, description, is_active)

units_of_measure (id, code, name, decimals)  -- PCS, CTN, KG, LTR

products (
  id, sku VARCHAR(50) UNIQUE, name, description,
  category_id FK, brand_id FK, uom_id FK,
  cost_price NUMERIC(18,4),      -- weighted-average cost (maintained by inventory)
  sale_price NUMERIC(18,4),      -- default price
  tax_rate_percent NUMERIC(5,2),
  hide_stock BOOLEAN DEFAULT FALSE,  -- ★ requirement: hide total stock from sales
  reorder_level NUMERIC(18,3),
  is_active BOOLEAN,
  created_at, ...
)

product_barcodes (id, product_id FK, barcode UNIQUE, barcode_type, pack_qty)
product_images   (id, product_id FK, url, sort_order, is_primary)

price_lists       (id, name, currency, is_default)
price_list_items  (price_list_id, product_id, price, PK(price_list_id, product_id))
customer_price_list (customer_id, price_list_id)
```

### 2.3 Inventory

```sql
warehouses (
  id, code UNIQUE, name, city, address, phone,
  manager_id FK users, is_active
)

-- Current stock per product per warehouse
stock_items (
  id, product_id FK, warehouse_id FK,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(18,3) NOT NULL DEFAULT 0, -- reserved by pending orders
  available_quantity NUMERIC(18,3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  avg_cost NUMERIC(18,4) NOT NULL DEFAULT 0,          -- weighted-average
  last_counted_at TIMESTAMPTZ,
  updated_at,
  UNIQUE(product_id, warehouse_id)
)
-- Index: (warehouse_id, product_id)

-- Immutable append-only ledger of all stock changes (event sourcing for inventory)
stock_movements (
  id BIGINT PK,
  product_id, warehouse_id,
  movement_type VARCHAR(20),           -- PURCHASE, SALE, SALE_RETURN, TRANSFER_OUT,
                                       -- TRANSFER_IN, ADJUSTMENT, OPENING
  reference_type VARCHAR(30),          -- ORDER, TRANSFER, ADJUSTMENT, VOUCHER
  reference_id BIGINT,
  quantity NUMERIC(18,3),              -- signed: + in, - out
  unit_cost NUMERIC(18,4),
  balance_after NUMERIC(18,3),
  notes TEXT,
  created_by, created_at
)
-- PARTITIONED BY RANGE(created_at) monthly, for long-term scalability
-- Index: (product_id, warehouse_id, created_at DESC)
```

### 2.4 Stock Transfers

```sql
stock_transfers (
  id, transfer_no VARCHAR(20) UNIQUE,
  from_warehouse_id FK, to_warehouse_id FK,
  status VARCHAR(20),           -- DRAFT, PENDING_APPROVAL, APPROVED, IN_TRANSIT,
                                --  RECEIVED, REJECTED, CANCELLED
  initiated_by FK users, initiated_at,
  approved_by, approved_at,
  shipped_by, shipped_at,
  received_by, received_at,
  notes, remarks_on_receipt
)

stock_transfer_items (
  id, transfer_id FK,
  product_id FK,
  quantity_sent NUMERIC(18,3),
  quantity_received NUMERIC(18,3),  -- filled on receipt; discrepancies logged
  unit_cost NUMERIC(18,4),          -- snapshot from source warehouse avg_cost
  notes
)

stock_transfer_history (
  id, transfer_id, from_status, to_status, changed_by, notes, created_at
)
```

### 2.5 Sales (Orders, Invoices, Returns)

> **v2.0 change:** `customers` has been refactored into a unified `parties` table (see §2.11). The `customer_id` column on orders/returns now references `parties.id` where `parties.type IN ('CUSTOMER','BOTH')`. Existing column names are kept as `customer_party_id` for schema clarity. Credit control, partial returns with condition tracking, and printable invoices are all new in v2.0.

```sql
-- ORDERS (branch-aware, credit-checked) -----------------------------------
orders (
  id, order_no VARCHAR(20) UNIQUE,
  customer_party_id FK parties,       -- was customer_id; now points to parties
  branch_id FK branches,              -- ★ NEW: originating branch
  warehouse_id FK,                    -- fulfilling warehouse
  sales_person_id FK users,
  order_date DATE, delivery_date DATE,
  status VARCHAR(20),                 -- DRAFT, SUBMITTED, CREDIT_HOLD, CONFIRMED,
                                      -- PROCESSING, PACKED, DISPATCHED, INVOICED,
                                      -- DELIVERED, CANCELLED, RETURNED
  subtotal, discount_amount, tax_amount, total_amount, paid_amount NUMERIC(18,4),
  payment_status VARCHAR(20),         -- UNPAID, PARTIAL, PAID
  payment_method VARCHAR(20),         -- ★ CASH, BANK, EASYPAISA, JAZZCASH, CREDIT
  credit_check_result VARCHAR(20),    -- ★ PASS, WARNED, BLOCKED, OVERRIDDEN
  credit_override_by FK users,        -- ★ who overrode the block
  credit_override_reason TEXT,        -- ★ mandatory when overridden
  -- Mobile context (from sales rep app)
  gps_lat NUMERIC(10,7),              -- ★ where the order was captured
  gps_lng NUMERIC(10,7),              -- ★
  gps_accuracy_m NUMERIC(6,1),        -- ★ GPS accuracy in meters
  device_id VARCHAR(100),             -- ★ mobile device that created it
  notes,
  created_by, created_at, updated_at
)

order_items (
  id, order_id FK, product_id FK,
  quantity NUMERIC(18,3),
  unit_price, discount_percent, discount_amount,
  tax_percent, tax_amount,
  line_total NUMERIC(18,4),
  sort_order
)

order_status_history (
  id, order_id, from_status, to_status, changed_by, notes, created_at
)

-- INVOICES (generated on dispatch) ----------------------------------------
-- ★ NEW in v2.0 — a sales invoice is the legal commercial document and the
-- source of record for accounting (AR posting).
invoices (
  id,
  invoice_no VARCHAR(30) UNIQUE,       -- format: INV-{branch}-{YY}-{seq}
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,              -- invoice_date + party.credit_days
  order_id FK orders,                  -- nullable (direct invoicing allowed)
  customer_party_id FK parties,
  branch_id FK branches,
  warehouse_id FK warehouses,
  sales_person_id FK users,
  subtotal, discount_amount, tax_amount, total_amount NUMERIC(18,4),
  paid_amount NUMERIC(18,4) DEFAULT 0,
  balance_amount NUMERIC(18,4) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  payment_status VARCHAR(20),          -- UNPAID, PARTIAL, PAID, OVERDUE, VOID
  payment_method VARCHAR(20),          -- CASH, BANK, EASYPAISA, JAZZCASH, CREDIT
  pdf_url TEXT,                        -- MinIO object key to generated PDF
  pdf_generated_at TIMESTAMPTZ,
  journal_entry_id FK journal_entries, -- links AR posting
  status VARCHAR(20),                  -- DRAFT, ISSUED, PAID, VOID
  printed_count INT DEFAULT 0,
  first_printed_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  notes,
  created_by, created_at
)
-- Indexes: (customer_party_id, status), (due_date) WHERE status<>'PAID'

invoice_items (
  id, invoice_id FK,
  order_item_id FK order_items,        -- nullable for direct invoices
  product_id FK,
  description TEXT,
  quantity NUMERIC(18,3),
  unit_price, discount_percent, discount_amount,
  tax_percent, tax_amount,
  line_total NUMERIC(18,4),
  sort_order
)

-- Invoice-to-payment allocation (an invoice can be partially paid across vouchers)
invoice_payments (
  id, invoice_id FK, voucher_id FK,
  amount NUMERIC(18,4) NOT NULL,
  payment_method VARCHAR(20),
  payment_date DATE,
  reference_no VARCHAR(50),            -- cheque / txn id / wallet txn
  created_by, created_at
)

-- SALES RETURNS (partial + condition-aware) -------------------------------
-- ★ v2.0: returns are now line-level partial, and each line carries a
-- condition flag that drives whether stock goes back to saleable or to a
-- damaged-goods warehouse.
sales_returns (
  id, return_no VARCHAR(20) UNIQUE,
  original_invoice_id FK invoices,     -- ★ now linked to invoice, not order
  original_order_id FK orders,         -- kept for traceability
  customer_party_id FK parties,
  warehouse_id FK,                     -- destination warehouse for resalable stock
  branch_id FK branches,
  return_date DATE,
  reason TEXT,
  total_amount NUMERIC(18,4),
  refund_method VARCHAR(20),           -- CASH, BANK, EASYPAISA, JAZZCASH, CREDIT_NOTE
  refund_voucher_id FK vouchers,       -- auto-created on approval
  status VARCHAR(20),                  -- DRAFT, APPROVED, POSTED, REJECTED
  journal_entry_id FK journal_entries,
  created_by, approved_by, created_at
)

sales_return_items (
  id, return_id FK,
  original_invoice_item_id FK invoice_items,
  product_id FK,
  quantity_returned NUMERIC(18,3),     -- ≤ original quantity − already returned
  unit_price NUMERIC(18,4),
  line_total NUMERIC(18,4),
  condition VARCHAR(20),               -- ★ RESALABLE, DAMAGED, EXPIRED, MISSING
  restock_warehouse_id FK warehouses,  -- ★ nullable: NULL if not restocked
  damaged_warehouse_id FK warehouses,  -- ★ virtual warehouse for write-off stock
  notes
)
-- Business rule: SUM(quantity_returned) per invoice_item across all returns
-- must not exceed the original invoice_item.quantity.
```

### 2.6 Accounting (Double-Entry, Branch-Aware)

This is the most critical section. Every financial event MUST balance `SUM(debit) = SUM(credit)`. **v2.0 adds branch awareness** so that each debit/credit line is tagged with the branch that owns it, enabling branch-level P&L and balance sheets as well as consolidated reporting.

```sql
-- Chart of Accounts (hierarchical)
chart_of_accounts (
  id, account_code VARCHAR(20) UNIQUE,    -- e.g. "1101"
  name VARCHAR(150),
  parent_id FK self,
  account_type VARCHAR(20),               -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  account_subtype VARCHAR(30),            -- CURRENT_ASSET, FIXED_ASSET, CASH, BANK, AR, AP, ...
  normal_balance CHAR(1),                 -- 'D' for debit-normal, 'C' for credit-normal
  is_group BOOLEAN,                       -- parent group vs postable leaf
  is_system BOOLEAN,                      -- cannot be deleted
  is_active BOOLEAN,
  currency_code CHAR(3) DEFAULT 'PKR',
  opening_balance NUMERIC(18,4) DEFAULT 0,
  is_branch_specific BOOLEAN DEFAULT FALSE, -- ★ true for per-branch cash/bank
  owner_branch_id FK branches,              -- ★ nullable; set when branch-specific
  created_at
)

-- Per-period balances for fast reports (materialized) — now branch-aware
account_balances (
  id, account_id FK,
  branch_id FK branches,                  -- ★ NULL = consolidated row
  period_year SMALLINT, period_month SMALLINT,
  opening_balance, debit_total, credit_total, closing_balance,
  UNIQUE(account_id, branch_id, period_year, period_month)
)

-- Accounting periods (to prevent posting to closed months)
accounting_periods (
  id, period_year SMALLINT, period_month SMALLINT,
  branch_id FK branches,                  -- ★ NULL = global period
  is_closed BOOLEAN DEFAULT FALSE,
  closed_by FK users, closed_at,
  UNIQUE(period_year, period_month, branch_id)
)

-- Header of a journal entry (one logical transaction)
journal_entries (
  id, entry_no VARCHAR(20) UNIQUE,
  entry_date DATE NOT NULL,
  branch_id FK branches NOT NULL,         -- ★ primary branch for the entry
  entry_type VARCHAR(20),                  -- SALE, PURCHASE, RECEIPT, PAYMENT,
                                           -- PURCHASE_RETURN, SALE_RETURN,
                                           -- JOURNAL, CONTRA, OPENING, ADJUSTMENT, CLOSING
  reference_type VARCHAR(30),              -- ORDER, INVOICE, PO, GRN, VOUCHER,
                                           -- RETURN, TRANSFER, EXPENSE
  reference_id BIGINT,
  narration TEXT,
  total_debit NUMERIC(18,4) NOT NULL,
  total_credit NUMERIC(18,4) NOT NULL,
  status VARCHAR(20),                      -- DRAFT, POSTED, REVERSED
  posted_at TIMESTAMPTZ, posted_by,
  reversed_by_entry_id FK self,
  created_by, created_at,
  CHECK (total_debit = total_credit)      -- DB-enforced balance
)

journal_lines (
  id, entry_id FK,
  account_id FK,
  branch_id FK branches NOT NULL,          -- ★ per-line branch tagging —
                                           --   line branch may differ from header
                                           --   (e.g. inter-branch contras)
  debit NUMERIC(18,4) DEFAULT 0,
  credit NUMERIC(18,4) DEFAULT 0,
  description TEXT,
  party_type VARCHAR(20),                  -- CUSTOMER, SUPPLIER, EMPLOYEE, NULL
  party_id BIGINT,                         -- now points to parties.id
  cost_center_id BIGINT,
  line_no INT,
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
)
-- Index: (account_id, branch_id, entry_id), (party_type, party_id),
--        partial (account_id, entry_id) WHERE branch_id IS NOT NULL

-- Convenience linking for cash / bank posting
cash_accounts (
  id, account_id FK UNIQUE,
  branch_id FK branches,                   -- ★ which branch owns the till
  warehouse_id FK,
  cashier_id FK users
)

bank_accounts (
  id, account_id FK UNIQUE,
  branch_id FK branches,                   -- ★ owning branch
  bank_name, branch, account_title, account_number, iban,
  currency_code CHAR(3)
)

-- ★ NEW in v2.0: mobile wallet accounts (Easypaisa, JazzCash, etc.)
wallet_accounts (
  id, account_id FK UNIQUE,
  branch_id FK branches,
  provider VARCHAR(20),                    -- EASYPAISA, JAZZCASH, SADAPAY, NAYAPAY
  merchant_id VARCHAR(50),
  registered_number VARCHAR(20),
  currency_code CHAR(3) DEFAULT 'PKR',
  is_active BOOLEAN
)

-- Expense categorisation
expense_categories (id, name, account_id FK, parent_id)
expenses (
  id, expense_no, expense_date, branch_id FK branches, category_id, account_id,
  paid_from_account_id, paid_from_method VARCHAR(20),
  amount, vendor_party_id FK parties,      -- ★ use parties for vendor
  description, receipt_url, journal_entry_id, created_by
)
```

### 2.7 Vouchers (Cash / Bank / Wallet / Journal)

> **v2.0 change:** Vouchers now carry a `payment_method` + `payment_provider` pair so a single "CR" (Cash Receipt) voucher can be marked as Cash, Bank, Easypaisa or JazzCash without needing per-method voucher types. Mobile wallet transaction ids are captured for reconciliation.

```sql
voucher_types (
  id, code UNIQUE,             -- CR (Cash Receipt), CP (Cash Payment),
                               -- BR (Bank Receipt), BP (Bank Payment),
                               -- WR (Wallet Receipt), WP (Wallet Payment), JV (Journal)
  name, prefix,
  is_cash, is_bank, is_wallet, is_journal,   -- ★ is_wallet added
  default_debit_account_id, default_credit_account_id
)

vouchers (
  id, voucher_no UNIQUE, voucher_type_id FK,
  voucher_date DATE,
  branch_id FK branches,        -- ★ NEW: owning branch
  party_type VARCHAR(20),       -- CUSTOMER, SUPPLIER, ACCOUNT, EMPLOYEE
  party_id BIGINT,              -- → parties.id
  amount NUMERIC(18,4),
  -- Payment method details
  payment_method VARCHAR(20),   -- ★ CASH, BANK, EASYPAISA, JAZZCASH,
                                --    SADAPAY, NAYAPAY, CHEQUE, ONLINE
  payment_provider VARCHAR(30), -- ★ optional: "Meezan Bank", "HBL", etc.
  cash_account_id FK cash_accounts,     -- ★ nullable; when method=CASH
  bank_account_id FK bank_accounts,     -- ★ nullable; when method=BANK/CHEQUE
  wallet_account_id FK wallet_accounts, -- ★ nullable; when method=EASYPAISA/JAZZCASH
  narration TEXT,
  reference_no VARCHAR(50),     -- cheque / txn id / wallet txn id
  wallet_txn_id VARCHAR(100),   -- ★ provider transaction id for wallet payments
  mobile_number VARCHAR(20),    -- ★ the wallet account's registered number
  status VARCHAR(20),           -- DRAFT, POSTED, CANCELLED, RECONCILED
  reconciled_at TIMESTAMPTZ,    -- ★ when bank/wallet statement matched
  journal_entry_id FK,          -- link to the posting that was generated
  -- Allocation to invoices (for receipts)
  allocation_strategy VARCHAR(20), -- FIFO, OLDEST_FIRST, MANUAL
  created_by, created_at
)

voucher_lines (                  -- used by JV (multi-line)
  id, voucher_id FK, account_id, branch_id FK branches,
  debit, credit, description
)

-- ★ NEW: invoice allocation of received amounts (many-to-many)
-- A single Cash Receipt voucher for PKR 50,000 can knock off three invoices.
voucher_invoice_allocations (
  id, voucher_id FK, invoice_id FK,
  allocated_amount NUMERIC(18,4),
  PRIMARY KEY (voucher_id, invoice_id)
)
```

### 2.8 Zakat

```sql
zakat_periods (
  id, lunar_year VARCHAR(10),            -- Hijri e.g. "1447 AH"
  start_date, end_date,
  nisab_gold_grams NUMERIC(10,3),        -- 87.48
  nisab_silver_grams NUMERIC(10,3),      -- 612.36
  gold_rate NUMERIC(18,4),               -- per gram on calc date
  silver_rate NUMERIC(18,4),
  nisab_value NUMERIC(18,4),             -- chosen nisab in PKR
  status VARCHAR(20)
)

zakat_calculations (
  id, period_id FK, calculation_date,
  total_zakatable_assets NUMERIC(18,4),
  total_deductible_liabilities NUMERIC(18,4),
  net_zakatable NUMERIC(18,4),
  zakat_rate NUMERIC(5,4) DEFAULT 0.025, -- 2.5%
  zakat_payable NUMERIC(18,4),
  status VARCHAR(20),                     -- DRAFT, FINALIZED, PAID
  journal_entry_id FK,
  created_by, created_at
)

zakat_items (
  id, calculation_id FK,
  item_type VARCHAR(30),                 -- CASH, BANK, RECEIVABLE, INVENTORY,
                                         -- LIABILITY_PAYABLE, LIABILITY_LOAN
  account_id FK,
  amount NUMERIC(18,4),
  is_included BOOLEAN,
  notes
)
```

### 2.9 Reporting (Materialized Views)

```sql
-- Fast sales dashboard — refreshed nightly + on-demand
CREATE MATERIALIZED VIEW mv_sales_daily AS
SELECT order_date, branch_id, warehouse_id, sales_person_id,
       COUNT(*) AS orders, SUM(total_amount) AS revenue
FROM orders WHERE status NOT IN ('CANCELLED','DRAFT')
GROUP BY 1,2,3,4;

CREATE MATERIALIZED VIEW mv_stock_valuation AS
SELECT s.warehouse_id, s.product_id,
       s.quantity, s.avg_cost, s.quantity * s.avg_cost AS stock_value
FROM stock_items s;

-- Party ledger (was mv_customer_ledger) — now covers customers AND suppliers
CREATE MATERIALIZED VIEW mv_party_ledger AS
SELECT jl.party_type, jl.party_id, je.branch_id, je.entry_date, je.entry_no,
       jl.debit, jl.credit,
       SUM(jl.debit - jl.credit)
         OVER (PARTITION BY jl.party_type, jl.party_id
               ORDER BY je.entry_date, je.id) AS running_balance
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.entry_id
WHERE jl.party_type IN ('CUSTOMER','SUPPLIER') AND je.status = 'POSTED';

-- ★ NEW in v2.0: Outstanding Aging (Accounts Receivable buckets)
-- Used by /reports/aging/customer and the collections dashboard
CREATE MATERIALIZED VIEW mv_ar_aging AS
SELECT
  i.customer_party_id,
  i.branch_id,
  COUNT(*)                                                   AS invoice_count,
  SUM(i.balance_amount)                                      AS total_outstanding,
  SUM(CASE WHEN CURRENT_DATE <= i.due_date
            THEN i.balance_amount ELSE 0 END)                AS current_bucket,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30
            THEN i.balance_amount ELSE 0 END)                AS days_1_30,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60
            THEN i.balance_amount ELSE 0 END)                AS days_31_60,
  SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90
            THEN i.balance_amount ELSE 0 END)                AS days_61_90,
  SUM(CASE WHEN CURRENT_DATE - i.due_date > 90
            THEN i.balance_amount ELSE 0 END)                AS days_over_90
FROM invoices i
WHERE i.payment_status IN ('UNPAID','PARTIAL','OVERDUE')
  AND i.status = 'ISSUED'
GROUP BY i.customer_party_id, i.branch_id;

-- ★ NEW: Accounts Payable aging (mirror for suppliers)
CREATE MATERIALIZED VIEW mv_ap_aging AS
SELECT pi.supplier_party_id, pi.branch_id,
       COUNT(*) AS invoice_count,
       SUM(pi.balance_amount) AS total_payable,
       SUM(CASE WHEN CURRENT_DATE <= pi.due_date THEN pi.balance_amount ELSE 0 END) AS current_bucket,
       SUM(CASE WHEN CURRENT_DATE - pi.due_date BETWEEN 1  AND 30 THEN pi.balance_amount ELSE 0 END) AS days_1_30,
       SUM(CASE WHEN CURRENT_DATE - pi.due_date BETWEEN 31 AND 60 THEN pi.balance_amount ELSE 0 END) AS days_31_60,
       SUM(CASE WHEN CURRENT_DATE - pi.due_date BETWEEN 61 AND 90 THEN pi.balance_amount ELSE 0 END) AS days_61_90,
       SUM(CASE WHEN CURRENT_DATE - pi.due_date > 90            THEN pi.balance_amount ELSE 0 END) AS days_over_90
FROM purchase_invoices pi
WHERE pi.payment_status IN ('UNPAID','PARTIAL','OVERDUE')
GROUP BY pi.supplier_party_id, pi.branch_id;

-- ★ NEW: Top Customers (by revenue, last 90 days, per branch)
CREATE MATERIALIZED VIEW mv_top_customers_90d AS
SELECT i.branch_id, i.customer_party_id,
       COUNT(DISTINCT i.id) AS invoice_count,
       SUM(i.total_amount)  AS revenue,
       MAX(i.invoice_date)  AS last_invoice_at
FROM invoices i
WHERE i.invoice_date >= CURRENT_DATE - INTERVAL '90 days'
  AND i.status = 'ISSUED'
GROUP BY i.branch_id, i.customer_party_id;

-- ★ NEW: Slow-moving products (≤ N sales per SKU over last 60 days)
CREATE MATERIALIZED VIEW mv_slow_moving_products AS
SELECT p.id AS product_id, p.sku, p.name,
       s.warehouse_id,
       s.quantity AS current_stock,
       COALESCE(sm.sales_qty, 0) AS sold_last_60d,
       s.quantity * s.avg_cost AS tied_up_value
FROM stock_items s
JOIN products p ON p.id = s.product_id
LEFT JOIN (
    SELECT product_id, warehouse_id, SUM(-quantity) AS sales_qty
    FROM stock_movements
    WHERE movement_type = 'SALE'
      AND created_at >= NOW() - INTERVAL '60 days'
    GROUP BY 1,2
) sm ON sm.product_id = s.product_id AND sm.warehouse_id = s.warehouse_id
WHERE s.quantity > 0;

-- ★ NEW: Dead stock (no movement in last 180 days)
CREATE MATERIALIZED VIEW mv_dead_stock AS
SELECT s.warehouse_id, s.product_id, p.sku, p.name,
       s.quantity, s.avg_cost, s.quantity * s.avg_cost AS value,
       MAX(sm.created_at) AS last_movement_at
FROM stock_items s
JOIN products p ON p.id = s.product_id
LEFT JOIN stock_movements sm
       ON sm.product_id = s.product_id
      AND sm.warehouse_id = s.warehouse_id
WHERE s.quantity > 0
GROUP BY s.warehouse_id, s.product_id, p.sku, p.name, s.quantity, s.avg_cost
HAVING MAX(sm.created_at) IS NULL
    OR MAX(sm.created_at) < NOW() - INTERVAL '180 days';

-- ★ NEW: Sales trends by product & region (for insights + LLM context)
CREATE MATERIALIZED VIEW mv_sales_trend_by_region AS
SELECT date_trunc('month', i.invoice_date) AS month,
       b.city AS region,
       ii.product_id,
       SUM(ii.quantity)   AS qty_sold,
       SUM(ii.line_total) AS revenue
FROM invoices i
JOIN invoice_items ii ON ii.invoice_id = i.id
JOIN branches b       ON b.id = i.branch_id
WHERE i.status = 'ISSUED'
GROUP BY 1,2,3;
```

**Refresh strategy:**
- `mv_sales_daily`, `mv_stock_valuation`, `mv_party_ledger` — `REFRESH MATERIALIZED VIEW CONCURRENTLY` nightly at 02:00 and on-demand from the dashboard.
- `mv_ar_aging`, `mv_ap_aging` — hourly (collections team relies on these).
- `mv_top_customers_90d`, `mv_sales_trend_by_region` — nightly.
- `mv_slow_moving_products`, `mv_dead_stock` — weekly (Sunday 03:00).

### 2.10 Entity Relationship Overview

```
                ┌──────────┐       ┌───────────┐
                │  users   │──────▶│   roles   │
                └─────┬────┘       └─────┬─────┘
                      │                  │
                      │              role_permissions
                      │                  │
                      │            ┌─────▼──────┐
                      │            │permissions │
                      │            └────────────┘
                      │
                      ▼
              ┌───────────────┐       ┌──────────┐
              │user_warehouse │──────▶│ branches │★
              └───────────────┘       └────┬─────┘
                                           │ owns
                                           ▼
              ┌──────────┐★    ┌────────────┐      ┌────────────┐
              │  parties │────▶│   orders   │─────▶│warehouses  │
              │(CUSTOMER/│     └──────┬─────┘      └─────┬──────┘
              │ SUPPLIER/│            │                  │
              │  BOTH)   │            ▼                  │
              └────┬─────┘     ┌────────────┐            │
                   │           │order_items │            │
                   │           └──────┬─────┘            │
                   │                  │                  │
                   │                  ▼                  │
                   │           ┌────────────┐      ┌─────▼──────┐
                   │           │  products  │◀────▶│stock_items │
                   │           └──────┬─────┘      └─────┬──────┘
                   │                  │                  │
                   │                  ▼                  ▼
                   │           ┌────────────┐    ┌─────────────────┐
                   │           │  barcodes  │    │ stock_movements │
                   │           └────────────┘    └─────────────────┘
                   │                                     ▲
                   │                                     │
                   │                           ┌─────────┴────────┐
                   │                           │ stock_transfers  │
                   │                           └──────────────────┘
                   │
         ┌─────────┴──────────────────────────┐
         │                                    │
         ▼                                    ▼
   ┌──────────┐★                        ┌──────────┐★
   │purchase_ │────▶┌──────────┐★       │ invoices │──▶┌──────────────┐
   │ orders   │     │ goods_   │        │ (sales)  │   │invoice_items │
   └──────────┘     │ receipts │        └────┬─────┘   └──────────────┘
                    └────┬─────┘             │
                         ▼                   │
                  ┌───────────────┐★         │
                  │  purchase_    │          │
                  │   invoices    │          │
                  └───────┬───────┘          │
                          │                  │
                          ▼                  ▼
            ┌──────────────────────────────────────┐
            │      journal_entries (branch_id)     │
            │                  │                   │
            │                  ▼                   │
            │      journal_lines (branch_id)       │
            │                  │                   │
            │                  ▼                   │
            │         chart_of_accounts            │
            └──────────┬──────────┬────────────────┘
                       │          │
              ┌────────▼───┐  ┌───▼──────────┐
              │  vouchers  │  │zakat_calc... │
              │(cash/bank/ │  └──────────────┘
              │  wallet)   │
              └──────┬─────┘
                     │
                     ▼
           ┌──────────────────────┐
           │voucher_invoice_alloc.│★
           └──────────────────────┘

          ┌────────────────┐★       ┌──────────────┐★
          │sms_notifications│◀─────▶│ sms_templates │
          └────────────────┘        └──────────────┘

          ┌─────────────┐★
          │ llm_queries │── (AI Assistant audit log)
          └─────────────┘

  ★ = new in v2.0
```

### 2.11 Parties (Unified Customers + Suppliers)

> **Why unified?** Many VIZO counter-parties are both customers (we sell finished goods to them) and suppliers (we buy raw materials or returns from them). Keeping them in a single `parties` table removes duplicate records, consolidates ledgers, and lets a single `party_id` flow through accounting. Existing `customers`/`suppliers` views are kept for backwards compatibility (see compatibility views at the bottom).

```sql
-- Core party table — one row per business counter-party
parties (
  id BIGINT PK,
  party_code VARCHAR(20) UNIQUE,                 -- "P-00001"
  type VARCHAR(20) NOT NULL,                      -- CUSTOMER, SUPPLIER, BOTH
  legal_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(150),
  phone VARCHAR(20),
  alt_phone VARCHAR(20),
  email CITEXT,
  website VARCHAR(200),

  -- Tax / compliance
  ntn VARCHAR(20),                                -- Pakistan NTN
  strn VARCHAR(20),                               -- Sales Tax Reg Number
  cnic VARCHAR(20),                               -- for sole proprietors
  tax_number VARCHAR(50),                         -- generic

  -- Addressing
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  country CHAR(2) DEFAULT 'PK',

  -- Categorisation
  category VARCHAR(30),                           -- RETAILER, WHOLESALER, DISTRIBUTOR,
                                                  -- MANUFACTURER, AGENT, END_CUSTOMER
  industry VARCHAR(50),

  -- ★ Credit control (applies when type in CUSTOMER/BOTH)
  credit_limit NUMERIC(18,4) DEFAULT 0,
  credit_days INT DEFAULT 0,                      -- payment terms (NET 30 → 30)
  credit_hold_policy VARCHAR(20) DEFAULT 'WARN',  -- NONE, WARN, BLOCK
  credit_rating CHAR(1),                          -- A, B, C, D
  current_balance NUMERIC(18,4) DEFAULT 0,        -- receivable if customer
  payable_balance NUMERIC(18,4) DEFAULT 0,        -- payable if supplier
  last_payment_at TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,                   -- last time they bought from us
  last_supply_at  TIMESTAMPTZ,                    -- last time we bought from them

  -- Relationships
  price_list_id FK price_lists,                   -- customer pricing
  default_payment_method VARCHAR(20),             -- CASH, BANK, EASYPAISA, ...
  sales_person_id FK users,
  default_branch_id FK branches,                  -- ★ which branch owns this party

  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by, updated_by, created_at, updated_at, deleted_at
)
-- Indexes:
--   (type, is_active), (phone), (ntn), (city, type),
--   gin(to_tsvector('simple', legal_name || ' ' || display_name))  for search

-- Parties can have multiple contact persons (relevant for B2B)
party_contacts (
  id, party_id FK,
  full_name, designation, phone, email, is_primary
)

-- Parties may have multiple billing / shipping addresses
party_addresses (
  id, party_id FK,
  label VARCHAR(30),                              -- BILLING, SHIPPING, WAREHOUSE
  address_line1, address_line2, city, province, postal_code, country,
  gps_lat NUMERIC(10,7), gps_lng NUMERIC(10,7),   -- ★ for route planning
  is_default BOOLEAN
)

-- Link a party to one or more GL accounts (useful when a single party
-- should be allocated to a specific sub-AR or sub-AP account)
party_gl_accounts (
  party_id FK, account_type VARCHAR(20),          -- AR, AP, ADVANCE, DEPOSIT
  account_id FK chart_of_accounts,
  PRIMARY KEY (party_id, account_type)
)

-- Backwards-compatible views (let legacy code keep running while we migrate)
CREATE VIEW customers AS
  SELECT p.* FROM parties p
  WHERE p.type IN ('CUSTOMER','BOTH') AND p.deleted_at IS NULL;

CREATE VIEW suppliers AS
  SELECT p.* FROM parties p
  WHERE p.type IN ('SUPPLIER','BOTH') AND p.deleted_at IS NULL;
```

### 2.12 Purchases (Suppliers → PO → GRN → Invoice → Return)

> **The most important new module in v2.0.** VIZO was previously missing a formal procurement workflow — stock could only enter via "opening stock" or stock adjustments, which prevented clean Accounts Payable, landed cost calculation, and supplier accountability. This module mirrors the sales pipeline in reverse.

**Workflow:**
```
  Supplier (party)
      │
      │ create PO
      ▼
  Purchase Order  ──────── approved ─────────▶ IN_PROGRESS
      │
      │ goods physically arrive
      ▼
  Goods Receipt (GRN)
      │   • stock ↑
      │   • JE:  DR Inventory  CR GR/IR (goods-received-not-invoiced)
      ▼
  Purchase Invoice
      │   • JE:  DR GR/IR      CR Accounts Payable
      ▼
  Payment Voucher
      │   • JE:  DR Accounts Payable  CR Cash/Bank/Wallet
      ▼
  (optionally) Purchase Return
      │   • stock ↓ from selected warehouse
      │   • JE:  DR Accounts Payable  CR Inventory (+ reverse tax)
```

```sql
-- PURCHASE ORDERS --------------------------------------------------------
purchase_orders (
  id, po_no VARCHAR(30) UNIQUE,                   -- "PO-{branch}-{YY}-{seq}"
  supplier_party_id FK parties,
  branch_id FK branches,
  warehouse_id FK warehouses,                     -- receiving warehouse
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  currency_code CHAR(3) DEFAULT 'PKR',
  fx_rate NUMERIC(18,6) DEFAULT 1,
  subtotal, discount_amount, tax_amount, shipping_amount,
  other_charges, total_amount NUMERIC(18,4),
  status VARCHAR(20),                              -- DRAFT, PENDING_APPROVAL,
                                                   -- APPROVED, PARTIALLY_RECEIVED,
                                                   -- RECEIVED, CANCELLED, CLOSED
  terms TEXT,
  notes TEXT,
  approved_by FK users, approved_at,
  created_by, created_at, updated_at
)

purchase_order_items (
  id, po_id FK,
  product_id FK,
  description TEXT,
  quantity_ordered NUMERIC(18,3),
  quantity_received NUMERIC(18,3) DEFAULT 0,       -- filled by GRNs
  unit_cost NUMERIC(18,4),
  discount_percent, discount_amount,
  tax_percent, tax_amount,
  line_total NUMERIC(18,4),
  expected_at DATE,
  sort_order
)

-- GOODS RECEIPT NOTES (GRN) ----------------------------------------------
-- Multiple GRNs can partially fulfill a single PO.
goods_receipts (
  id, grn_no VARCHAR(30) UNIQUE,
  po_id FK purchase_orders,
  supplier_party_id FK parties,
  warehouse_id FK warehouses,
  branch_id FK branches,
  receipt_date DATE NOT NULL,
  delivery_note_no VARCHAR(50),                    -- supplier's DN reference
  vehicle_no VARCHAR(20),
  received_by FK users,
  status VARCHAR(20),                              -- DRAFT, POSTED, REJECTED
  notes TEXT,
  journal_entry_id FK journal_entries,             -- DR Inventory / CR GR-IR
  created_by, created_at
)

goods_receipt_items (
  id, grn_id FK,
  po_item_id FK purchase_order_items,
  product_id FK,
  quantity_received NUMERIC(18,3),
  quantity_accepted NUMERIC(18,3),                 -- received − damaged
  quantity_damaged NUMERIC(18,3) DEFAULT 0,
  unit_cost NUMERIC(18,4),                         -- may differ from PO cost
  landed_cost_per_unit NUMERIC(18,4),              -- incl. freight share
  batch_no VARCHAR(50),
  expiry_date DATE,
  notes
)

-- PURCHASE INVOICES (Supplier bills we owe) ------------------------------
purchase_invoices (
  id, invoice_no VARCHAR(50) UNIQUE,               -- OUR internal number
  supplier_invoice_no VARCHAR(50),                 -- the paper bill from supplier
  supplier_party_id FK parties,
  branch_id FK branches,
  po_id FK purchase_orders,                        -- nullable (direct bill)
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,                          -- invoice_date + supplier.credit_days
  currency_code CHAR(3) DEFAULT 'PKR',
  subtotal, discount_amount, tax_amount, shipping_amount,
  other_charges, total_amount NUMERIC(18,4),
  paid_amount NUMERIC(18,4) DEFAULT 0,
  balance_amount NUMERIC(18,4) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  payment_status VARCHAR(20),                      -- UNPAID, PARTIAL, PAID, OVERDUE, VOID
  payment_method VARCHAR(20),                      -- CASH, BANK, EASYPAISA, JAZZCASH, CREDIT
  withholding_tax_amount NUMERIC(18,4) DEFAULT 0,  -- Pakistan withholding
  pdf_url TEXT,                                    -- scan of supplier bill
  journal_entry_id FK journal_entries,             -- DR GR-IR / CR AP
  status VARCHAR(20),                              -- DRAFT, POSTED, VOID
  notes TEXT,
  created_by, created_at
)

purchase_invoice_items (
  id, purchase_invoice_id FK,
  grn_item_id FK goods_receipt_items,              -- links back to receipt
  product_id FK,
  description TEXT,
  quantity NUMERIC(18,3),
  unit_cost NUMERIC(18,4),
  discount_amount NUMERIC(18,4),
  tax_percent, tax_amount,
  line_total NUMERIC(18,4)
)

-- PURCHASE RETURNS (Debit Note to supplier) ------------------------------
purchase_returns (
  id, return_no VARCHAR(30) UNIQUE,
  original_invoice_id FK purchase_invoices,
  supplier_party_id FK parties,
  warehouse_id FK warehouses,
  branch_id FK branches,
  return_date DATE,
  reason TEXT,                                     -- DAMAGED, EXPIRED, WRONG_ITEM, OVER_SUPPLIED
  total_amount NUMERIC(18,4),
  status VARCHAR(20),                              -- DRAFT, APPROVED, POSTED, REJECTED
  journal_entry_id FK journal_entries,             -- DR AP / CR Inventory
  created_by, approved_by, created_at
)

purchase_return_items (
  id, return_id FK,
  original_purchase_invoice_item_id FK purchase_invoice_items,
  product_id FK,
  quantity_returned NUMERIC(18,3),
  unit_cost NUMERIC(18,4),
  line_total NUMERIC(18,4),
  condition VARCHAR(20),                           -- DAMAGED, EXPIRED, WRONG_ITEM
  notes
)

-- Supplier ledger view (mirror of mv_party_ledger filtered for suppliers)
-- Already covered by mv_party_ledger (party_type='SUPPLIER').
```

**Accounting postings (automatic, per state transition):**

| Event | Debit | Credit |
|---|---|---|
| **GRN Posted** | Inventory (branch) | GR/IR (Goods-Received-Not-Invoiced) |
| **Purchase Invoice Posted** | GR/IR + Input Sales Tax | Accounts Payable (supplier) |
| **Direct Purchase Invoice (no PO)** | Inventory + Input Tax | Accounts Payable |
| **Payment Voucher** | Accounts Payable | Cash / Bank / Wallet |
| **Withholding on Payment** | Accounts Payable | WHT Payable |
| **Purchase Return Posted** | Accounts Payable | Inventory + Reverse Input Tax |

### 2.13 Branches & Multi-Branch Accounting

> **Why a dedicated branches table?** A warehouse is a *storage* location (Karachi DC, Lahore DC). A **branch** is a *legal/accounting* unit (Karachi Office, Lahore Office, North Region). One branch may operate multiple warehouses; one warehouse belongs to exactly one branch. All journal lines carry `branch_id`, which lets the system produce per-branch P&L / Balance Sheet **and** consolidate them into a single group report.

```sql
branches (
  id BIGINT PK,
  code VARCHAR(20) UNIQUE NOT NULL,           -- "KHI", "LHR", "ISB"
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(20),
  manager_id FK users,
  parent_branch_id FK self,                   -- for hierarchical / region structure
  currency_code CHAR(3) DEFAULT 'PKR',
  is_head_office BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  -- Document numbering sequences per branch
  invoice_sequence_prefix VARCHAR(10),        -- "KHI-INV"
  po_sequence_prefix VARCHAR(10),             -- "KHI-PO"
  voucher_sequence_prefix VARCHAR(10),        -- "KHI-VCH"
  created_at, updated_at
)

-- Warehouses now belong to a branch
ALTER TABLE warehouses ADD COLUMN branch_id FK branches NOT NULL;

-- User → branch scoping (in addition to user → warehouse)
user_branch_access (
  user_id FK users, branch_id FK branches,
  can_view_consolidated BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, branch_id)
)

-- Inter-branch transfer/contra accounts — used when a journal has multiple
-- branches on its lines so that each branch's books remain balanced.
inter_branch_accounts (
  id, from_branch_id FK branches, to_branch_id FK branches,
  receivable_account_id FK chart_of_accounts,   -- DR in source branch
  payable_account_id    FK chart_of_accounts,   -- CR in destination branch
  UNIQUE (from_branch_id, to_branch_id)
)
```

**Branch-aware reporting rules:**
1. Every query on `journal_lines` joins on `(branch_id IN :allowedBranches OR :isSuperAdmin)`.
2. Branch P&L = `SUM(debit − credit)` grouped by `account_type` WHERE `branch_id = :branch`.
3. Consolidated P&L = same aggregation with no branch filter, but inter-branch receivable/payable lines net out to zero by construction.
4. Users with `reports.finance.consolidated` permission can run consolidated reports; users without it are locked to `user_branch_access`.

### 2.14 Notifications (SMS / Email / Push)

> **v2.0 adds a notification abstraction** so the rest of the system can fire "send SMS to this customer" without knowing anything about gateway vendors. Pakistani SMS providers (Jazz BizSMS, Telenor Tameer, Twilio PK, Veevo, Branded SMS Pakistan) are pluggable behind a single interface.

```sql
-- Provider-agnostic template store
sms_templates (
  id, code VARCHAR(50) UNIQUE,                -- ORDER_CONFIRMED, DISPATCHED,
                                              -- INVOICE_ISSUED, PAYMENT_REMINDER,
                                              -- PAYMENT_RECEIVED, STATEMENT_READY
  name VARCHAR(100),
  language CHAR(2) DEFAULT 'en',              -- en, ur, roman-ur
  body_template TEXT,                         -- Handlebars: "Dear {{name}}, ..."
  variables JSONB,                            -- declared variable schema
  is_active BOOLEAN,
  max_length INT DEFAULT 160,
  approved_sender_id VARCHAR(20),             -- Mask/Sender ID (PTA approved)
  created_at, updated_at
)

-- Gateway registry (multi-provider, failover, weighted routing)
sms_gateways (
  id, code VARCHAR(30) UNIQUE,                -- JAZZ, TELENOR, TWILIO_PK, VEEVO
  name VARCHAR(100),
  base_url VARCHAR(300),
  auth_type VARCHAR(20),                      -- API_KEY, BASIC, OAUTH
  credentials JSONB,                          -- encrypted at rest (pgcrypto)
  priority INT DEFAULT 100,                   -- lower = preferred
  max_per_minute INT DEFAULT 300,             -- rate limit
  is_active BOOLEAN,
  last_health_check TIMESTAMPTZ,
  is_healthy BOOLEAN
)

-- Outbound queue (background worker drains this)
sms_notifications (
  id, template_code VARCHAR(50),
  to_number VARCHAR(20) NOT NULL,
  to_party_id FK parties,                     -- nullable
  body TEXT NOT NULL,                         -- rendered text
  language CHAR(2),
  ref_entity VARCHAR(30),                     -- ORDER, INVOICE, VOUCHER
  ref_id BIGINT,
  status VARCHAR(20),                         -- QUEUED, SENDING, SENT,
                                              -- DELIVERED, FAILED, REJECTED
  attempts INT DEFAULT 0,
  gateway_id FK sms_gateways,
  provider_message_id VARCHAR(100),
  provider_response JSONB,
  cost NUMERIC(10,4),                         -- per-message cost for reconciliation
  sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at
)
-- Partitioned by created_at monthly. Partial index on (status) WHERE status IN ('QUEUED','SENDING').

-- User opt-in / opt-out (honoured by worker)
sms_opt_outs (phone VARCHAR(20) PK, reason TEXT, opted_out_at TIMESTAMPTZ)
```

### 2.15 AI Assistant (LLM Query Log)

> **v2.0 reframes the AI module.** The previous design assumed only ML forecasting. v2.0 adds an **LLM-based AI Assistant** (Gemini or OpenAI) that answers natural-language questions against VIZO's data and generates plain-English report summaries. The ML forecasting module is kept as **optional Phase 11.5**.

```sql
-- Every LLM query is logged — auditability is non-negotiable
-- (cost control, hallucination review, PII monitoring).
llm_queries (
  id BIGINT PK,
  user_id FK users,
  session_id UUID,                            -- groups multi-turn conversations
  question TEXT NOT NULL,                     -- raw user text
  intent_classification VARCHAR(50),          -- SALES_INQUIRY, REPORT_SUMMARY,
                                              -- ANOMALY_DETECTION, EXPLAINER, OTHER
  resolved_sql TEXT,                          -- if the assistant translated to SQL
  resolved_tool_calls JSONB,                  -- structured function calls made
  provider VARCHAR(20),                       -- GEMINI, OPENAI, ANTHROPIC
  model VARCHAR(50),                          -- gemini-1.5-pro, gpt-4o, ...
  prompt_tokens INT, completion_tokens INT,
  cost_usd NUMERIC(10,4),
  response_text TEXT,                         -- the rendered answer
  rendered_at TIMESTAMPTZ,
  flagged BOOLEAN DEFAULT FALSE,              -- user flagged as wrong
  flag_reason TEXT,
  created_at
)

-- Curated "safe templates" — pre-approved natural-language patterns the
-- assistant is allowed to execute without regeneration. Prevents prompt
-- injection from running arbitrary SQL.
llm_safe_templates (
  id, name, pattern TEXT,                     -- "top {n} products last {days} days"
  parameterised_sql TEXT,                     -- uses named params
  required_permissions TEXT[],
  is_active BOOLEAN
)
```

---

## 3. API Design

### 3.1 Conventions

- Base URL: `https://api.vizo.app/api/v1`
- Versioning via URL (`/v1/`, `/v2/`)
- Auth: `Authorization: Bearer <JWT>`
- Error format: [RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807) `application/problem+json`
- Pagination: `?page=1&pageSize=20&sort=-createdAt`
- Filtering: `?filter[status]=pending&filter[warehouseId]=3`
- Idempotency: `Idempotency-Key` header on POST mutations
- All write endpoints require permission check via policy attribute

### 3.2 Identity & Auth

```
POST   /auth/login                       { email, password } → {accessToken, refreshToken}
POST   /auth/refresh                     { refreshToken }
POST   /auth/logout
POST   /auth/change-password
GET    /auth/me                          → current user + permissions[]

GET    /users            [users.read]
POST   /users            [users.create]
GET    /users/{id}
PUT    /users/{id}       [users.update]
DELETE /users/{id}       [users.delete]
POST   /users/{id}/roles [users.assign-role]
POST   /users/{id}/warehouses   (scope)

GET    /roles
POST   /roles
PUT    /roles/{id}
DELETE /roles/{id}
GET    /roles/{id}/permissions
PUT    /roles/{id}/permissions   { permissionIds[] }

GET    /permissions                       (full catalog — static)
```

### 3.3 Catalog

```
GET    /categories?tree=true
POST   /categories
PUT    /categories/{id}
DELETE /categories/{id}

GET    /products?search=&categoryId=&barcode=&page=
POST   /products
GET    /products/{id}
PUT    /products/{id}
DELETE /products/{id}
POST   /products/{id}/barcodes
POST   /products/import   (CSV/Excel)
GET    /products/{id}/stock                (per-warehouse stock — gated by permission)

GET    /brands
GET    /units-of-measure
GET    /price-lists
```

### 3.4 Inventory

```
GET    /warehouses
POST   /warehouses
PUT    /warehouses/{id}

GET    /inventory/stock?warehouseId=&productId=&belowReorder=true
GET    /inventory/movements?productId=&warehouseId=&from=&to=
POST   /inventory/adjustments                 (stock count adjustment)
GET    /inventory/valuation?warehouseId=
GET    /inventory/low-stock-alerts
```

### 3.5 Stock Transfers

```
GET    /transfers?status=&from=&to=
POST   /transfers                              (create DRAFT)
GET    /transfers/{id}
PUT    /transfers/{id}                         (edit DRAFT)
POST   /transfers/{id}/submit                  (DRAFT → PENDING_APPROVAL)
POST   /transfers/{id}/approve                 (PENDING → APPROVED, reserves stock)
POST   /transfers/{id}/ship                    (APPROVED → IN_TRANSIT, reduces source)
POST   /transfers/{id}/receive                 (IN_TRANSIT → RECEIVED, increases dest)
POST   /transfers/{id}/reject
POST   /transfers/{id}/cancel
```

### 3.6 Sales, Invoices & Returns

> **v2.0 note:** `/customers/*` endpoints are preserved as thin shims over `/parties?type=customer` (see §3.12) so mobile clients keep working. New endpoints add invoice, credit-check, and partial-return flows.

```
# Legacy customer endpoints (kept as aliases)
GET    /customers?search=
POST   /customers
GET    /customers/{id}
PUT    /customers/{id}
GET    /customers/{id}/ledger?from=&to=
GET    /customers/{id}/orders
GET    /customers/{id}/outstanding
GET    /customers/{id}/aging                   (★ new — bucketed outstanding)
GET    /customers/{id}/credit-status           (★ new — limit / days / overdue)

# Orders
GET    /orders?status=&customerId=&salesPersonId=&from=&to=&branchId=
POST   /orders                                 (Sales creates DRAFT)
GET    /orders/{id}
PUT    /orders/{id}                            (DRAFT only)
POST   /orders/{id}/submit                     (DRAFT → SUBMITTED, reserves stock,
                                                runs credit check → may set CREDIT_HOLD)
POST   /orders/{id}/override-credit            (★ CREDIT_HOLD → SUBMITTED,
                                                requires credit.override permission
                                                + mandatory reason)
POST   /orders/{id}/confirm                    (Order Dept: SUBMITTED → CONFIRMED)
POST   /orders/{id}/pack                       (→ PACKED)
POST   /orders/{id}/dispatch                   (→ DISPATCHED, posts JE, reduces stock,
                                                auto-generates an Invoice,
                                                queues DISPATCHED SMS to customer)
POST   /orders/{id}/deliver                    (→ DELIVERED, queues DELIVERED SMS)
POST   /orders/{id}/cancel
POST   /orders/{id}/return                     (create sales return — partial allowed)

# ★ Invoices (new resource in v2.0)
GET    /invoices?status=&customerId=&branchId=&overdueOnly=&from=&to=
POST   /invoices                               (direct invoice w/o order)
GET    /invoices/{id}
GET    /invoices/{id}/pdf                      (returns or regenerates PDF)
POST   /invoices/{id}/regenerate-pdf
POST   /invoices/{id}/send                     (email + SMS)
POST   /invoices/{id}/void                     (must post reversing JE)
POST   /invoices/{id}/mark-paid                (shortcut: create receipt voucher)
GET    /invoices/{id}/payments                 (list allocated voucher payments)
GET    /invoices/due-soon?days=7

# Sales Returns (partial + condition)
GET    /returns/sales?from=&to=&status=
POST   /returns/sales                          ({
                                                  invoiceId, reason,
                                                  lines: [{ invoiceItemId, qty,
                                                            condition, restockWarehouseId }]
                                                })
POST   /returns/sales/{id}/approve             (validates qty ≤ original,
                                                posts stock movements:
                                                RESALABLE → restock warehouse,
                                                DAMAGED   → damaged warehouse,
                                                posts reversing JE)
POST   /returns/sales/{id}/reject
GET    /returns/sales/{id}
```

### 3.7 Accounting

```
GET    /accounting/chart-of-accounts?tree=true
POST   /accounting/chart-of-accounts
PUT    /accounting/chart-of-accounts/{id}

GET    /accounting/journal-entries?from=&to=&type=
POST   /accounting/journal-entries             (create DRAFT JV)
GET    /accounting/journal-entries/{id}
POST   /accounting/journal-entries/{id}/post   [accounting.journal.post]
POST   /accounting/journal-entries/{id}/reverse

GET    /accounting/ledger/{accountId}?from=&to=
GET    /accounting/trial-balance?asOf=
GET    /accounting/profit-loss?from=&to=
GET    /accounting/balance-sheet?asOf=
GET    /accounting/cash-flow?from=&to=

POST   /accounting/transfers                    (account-to-account)
POST   /accounting/expenses
GET    /accounting/expenses
```

### 3.8 Vouchers & Payments

> **v2.0** adds `paymentMethod` on every voucher (CASH / BANK / EASYPAISA / JAZZCASH / CHEQUE / ONLINE) and lets a single receipt voucher be allocated to multiple invoices.

```
GET    /vouchers?type=&from=&to=&branchId=&paymentMethod=
POST   /vouchers                     ({
                                         voucherType, partyType, partyId,
                                         amount, paymentMethod,
                                         paymentProvider,             (★)
                                         cashAccountId|bankAccountId|walletAccountId,
                                         walletTxnId, mobileNumber,   (★ for EP/JC)
                                         referenceNo, narration,
                                         allocations: [{ invoiceId, amount }]  (★)
                                      })
GET    /vouchers/{id}
POST   /vouchers/{id}/post
POST   /vouchers/{id}/cancel
POST   /vouchers/{id}/reconcile       (★ mark as reconciled against bank statement)
POST   /vouchers/{id}/allocations     (★ attach/detach invoices post-hoc)

# Payment methods catalog (for UI dropdowns)
GET    /payment-methods                (★ lists enabled methods per branch)
```

### 3.9 Zakat

```
GET    /zakat/periods
POST   /zakat/periods
POST   /zakat/calculations                      (snapshot assets & compute)
GET    /zakat/calculations/{id}
POST   /zakat/calculations/{id}/finalize
POST   /zakat/calculations/{id}/pay             (posts JE debiting Zakat expense)
```

### 3.10 Reporting & AI

```
# Standard reports (existing + new)
GET    /reports/sales-summary?from=&to=&groupBy=&branchId=
GET    /reports/top-products?limit=20&from=&to=&branchId=
GET    /reports/sales-by-salesperson
GET    /reports/inventory-valuation?warehouseId=
GET    /reports/customer-statement/{id}?from=&to=

# ★ NEW business-critical reports (v2.0)
GET    /reports/aging/customer?branchId=&asOf=        (AR buckets: 0,1-30,31-60,61-90,90+)
GET    /reports/aging/supplier?branchId=&asOf=        (AP buckets)
GET    /reports/top-customers?limit=20&days=90&branchId=
GET    /reports/slow-moving?warehouseId=&thresholdDays=60
GET    /reports/dead-stock?warehouseId=&thresholdDays=180
GET    /reports/sales-trends?product=&region=&from=&to=
GET    /reports/profit-by-product?from=&to=
GET    /reports/profit-by-region?from=&to=
GET    /reports/overdue-invoices?branchId=
GET    /reports/branch-pnl?branchId=&from=&to=
GET    /reports/consolidated-pnl?from=&to=            (requires consolidated perm)

# Report export
GET    /reports/{reportKey}/export?format=pdf|excel|csv

# ML-based intelligence (optional Phase 11.5)
POST   /intelligence/forecast/demand           { productId, horizonDays }
GET    /intelligence/insights/sales-trends
GET    /intelligence/alerts/smart-reorder      (ML-driven reorder suggestions)
```

### 3.11 Mobile-Specific (GPS + Visits)

```
POST   /mobile/sync/pull                       (delta since lastSyncAt)
POST   /mobile/sync/push                       (offline orders batch,
                                                each order may include gps / visit)
GET    /mobile/catalog/search?barcode=
POST   /mobile/orders/quick                    (one-shot create, can include GPS)

# ★ NEW: field sales tracking (v2.0)
POST   /mobile/visits                          ({
                                                   partyId, purpose,
                                                   checkInLat, checkInLng,
                                                   checkInAccuracy, photoUrls[],
                                                   notes
                                                })
POST   /mobile/visits/{id}/checkout            ({ lat, lng, outcome })
GET    /mobile/visits?salesPersonId=&from=&to=
GET    /mobile/visits/route-today              (planned + completed visits)
GET    /parties/{id}/last-visit                (who was here, when, outcome)
GET    /parties/{id}/visit-history?limit=20
```

> **Visit tracking schema** (placed in Sales module, referenced here for API context):
> `customer_visits(id, party_id, sales_person_id, check_in_at, check_in_lat, check_in_lng, check_in_accuracy_m, check_out_at, check_out_lat, check_out_lng, outcome VARCHAR(20) -- ORDER_PLACED, NO_ORDER, FOLLOWUP, PAYMENT_COLLECTED --, notes, photo_urls TEXT[], order_id FK orders, created_at)`

### 3.12 Parties (Unified)

```
GET    /parties?type=CUSTOMER|SUPPLIER|BOTH&search=&city=&isActive=&page=
POST   /parties                                ({ type, legalName, ... })
GET    /parties/{id}
PUT    /parties/{id}
DELETE /parties/{id}                           (soft delete)
PATCH  /parties/{id}/convert                   ({ targetType: 'BOTH' }) ★

GET    /parties/{id}/contacts
POST   /parties/{id}/contacts
GET    /parties/{id}/addresses
POST   /parties/{id}/addresses

GET    /parties/{id}/ledger?from=&to=
GET    /parties/{id}/balance                   (separates AR, AP, advance)
GET    /parties/{id}/credit-status             (limit, days, overdue, holds)
PUT    /parties/{id}/credit                    ({ creditLimit, creditDays, holdPolicy })

GET    /parties/{id}/transactions              (orders, invoices, POs, GRNs, vouchers)
```

### 3.13 Purchases

```
# Purchase Orders
GET    /purchases/orders?status=&supplierId=&branchId=&from=&to=
POST   /purchases/orders                       (creates DRAFT)
GET    /purchases/orders/{id}
PUT    /purchases/orders/{id}                  (DRAFT/PENDING_APPROVAL only)
POST   /purchases/orders/{id}/submit           (→ PENDING_APPROVAL)
POST   /purchases/orders/{id}/approve          (→ APPROVED)
POST   /purchases/orders/{id}/cancel
POST   /purchases/orders/{id}/close            (force-close when fully received
                                                or abandoned)
GET    /purchases/orders/{id}/pdf

# Goods Receipts (GRN)
GET    /purchases/grns?poId=&warehouseId=&from=&to=
POST   /purchases/grns                         ({
                                                   poId, warehouseId, receiptDate,
                                                   deliveryNoteNo, vehicleNo,
                                                   lines: [{ poItemId, qtyReceived,
                                                             qtyAccepted, qtyDamaged,
                                                             batchNo, expiryDate }]
                                                })
POST   /purchases/grns/{id}/post               (stock ↑ + journal DR Inv / CR GR-IR)
POST   /purchases/grns/{id}/reject

# Purchase Invoices
GET    /purchases/invoices?supplierId=&overdueOnly=
POST   /purchases/invoices                     (attach to GRN or direct bill)
GET    /purchases/invoices/{id}
POST   /purchases/invoices/{id}/post           (JE DR GR-IR / CR AP)
POST   /purchases/invoices/{id}/pay            ({ paymentMethod, amount, walletTxnId })
POST   /purchases/invoices/{id}/void

# Purchase Returns (debit notes)
GET    /purchases/returns
POST   /purchases/returns                      ({ invoiceId, lines, reason })
POST   /purchases/returns/{id}/approve         (stock ↓ + reversing JE)

# Supplier ledger convenience
GET    /purchases/suppliers/{partyId}/ledger?from=&to=
GET    /purchases/suppliers/{partyId}/outstanding
```

### 3.14 Notifications (SMS)

```
GET    /sms/templates
POST   /sms/templates                          (SuperAdmin)
PUT    /sms/templates/{code}
POST   /sms/templates/{code}/test              ({ toNumber, variables })

GET    /sms/notifications?status=&from=&to=&templateCode=
POST   /sms/notifications                      ({
                                                   templateCode, toNumber|partyId,
                                                   variables, refEntity, refId,
                                                   scheduledAt
                                                })
GET    /sms/notifications/{id}
POST   /sms/notifications/{id}/retry           (only for FAILED)
POST   /sms/notifications/bulk                 (campaigns — opt-out honoured)

GET    /sms/gateways                           (admin only)
POST   /sms/gateways                           (configure provider)
POST   /sms/gateways/{id}/health-check

POST   /sms/opt-out                            ({ phone })
POST   /sms/opt-in                             ({ phone })
```

### 3.15 AI Assistant (LLM)

> **Design note:** this endpoint is intentionally minimal and stateful via `sessionId`. The server builds the prompt from the question + schema metadata + role-scoped data context. The LLM is not allowed to emit raw SQL — it either picks a `llm_safe_template` or calls pre-registered tool functions (`get_sales`, `get_top_customers`, etc.). Every call is logged to `llm_queries`.

```
POST   /ai/ask                                 ({
                                                   question,
                                                   sessionId,
                                                   context: { branchId, dateRange }
                                                })
                                               → {
                                                   answer,
                                                   chartSpec?,
                                                   tables?,
                                                   sources: [{ tool, args }],
                                                   tokensUsed, costUsd,
                                                   queryId
                                                 }

POST   /ai/summarise-report                    ({ reportKey, filters })
                                               → { summary, keyMetrics, anomalies }
POST   /ai/summarise-invoice                   ({ invoiceId })
POST   /ai/explain-variance                    ({ metric, from, to })

POST   /ai/query/{queryId}/flag                ({ reason })  (user feedback)
GET    /ai/sessions/{sessionId}                (conversation history)
GET    /ai/usage?from=&to=                     (token / cost dashboard)
```

---

## 4. Role & Permission System

### 4.1 Model: RBAC + Attribute Filters

```
User ──► Roles ──► Permissions (permission_key, e.g. "orders.create")
                ▲
                │
         User-Warehouse scoping (attribute) restricts WHICH records the user sees
```

### 4.2 Permission Catalog (Sample)

| Module | Keys |
|---|---|
| Identity | `users.read` `users.create` `users.update` `users.delete` `roles.manage` `permissions.assign` `branches.manage` ★ |
| Catalog | `products.read` `products.create` `products.update` `products.delete` `categories.manage` |
| Inventory | `stock.read` `stock.adjust` `stock.view-total` (controls the `hide_stock` override) |
| Transfers | `transfers.read` `transfers.create` `transfers.approve` `transfers.ship` `transfers.receive` |
| Parties ★ | `parties.read` `parties.create` `parties.update` `parties.delete` `parties.merge` |
| Sales | `customers.read` `customers.create` `customers.update` `orders.read` `orders.create` `orders.update` `orders.confirm` `orders.dispatch` `orders.cancel` `returns.create` `returns.approve` ★ `credit.override` ★ |
| Invoices ★ | `invoices.read` `invoices.create` `invoices.void` `invoices.email` `invoices.print` |
| Purchases ★ | `purchases.read` `purchases.order.create` `purchases.order.approve` `purchases.grn.create` `purchases.grn.post` `purchases.invoice.create` `purchases.invoice.post` `purchases.invoice.pay` `purchases.return.create` `purchases.return.approve` |
| Accounting | `accounting.read` `accounting.journal.create` `accounting.journal.post` `accounting.journal.reverse` `coa.manage` `expenses.create` `period.close` ★ |
| Vouchers | `vouchers.create` `vouchers.post` `vouchers.reconcile` ★ |
| Zakat | `zakat.calculate` `zakat.finalize` `zakat.pay` |
| Reports | `reports.sales` `reports.inventory` `reports.finance` `reports.finance.consolidated` ★ `reports.aging` ★ `reports.slow-moving` ★ |
| Notifications ★ | `sms.read` `sms.send` `sms.templates.manage` `sms.gateways.manage` `sms.bulk.send` |
| AI Assistant ★ | `ai.ask` `ai.usage.read` `ai.templates.manage` |
| Mobile ★ | `mobile.visits.log` `mobile.visits.read-all` (managers) |
| Backup ★ | `backup.run` `backup.restore` `backup.download` |
| Settings | `settings.manage` |

### 4.3 Default Role Mappings

> **New roles in v2.0:** `Purchase Officer`, `Branch Manager`, `Collections Officer`. Existing four roles retain backwards compatibility.

| Permission | SuperAdmin | Accountant | Order Dept | Sales | Purch. Officer | Branch Mgr | Collect. |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| users.* / roles.* / permissions.* | ✅ | — | — | — | — | — | — |
| branches.manage | ✅ | — | — | — | — | — | — |
| products.read / categories.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| products.create/update/delete | ✅ | — | — | — | — | — | — |
| stock.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| stock.view-total | ✅ | ✅ | ✅ | `hide_stock` | ✅ | ✅ | — |
| stock.adjust | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| transfers.* | ✅ | — | ✅ | — | ✅ | ✅ | — |
| parties.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| parties.create/update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| parties.merge / delete | ✅ | — | — | — | — | ✅ | — |
| orders.create | ✅ | — | ✅ | ✅ | — | ✅ | — |
| orders.confirm / dispatch | ✅ | — | ✅ | — | — | ✅ | — |
| credit.override | ✅ | ✅ | — | — | — | ✅ | — |
| returns.create / approve | ✅ | ✅ | ✅ | create | — | ✅ | — |
| invoices.create / void | ✅ | ✅ | create | create | — | ✅ | — |
| invoices.email / print | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| purchases.order.create | ✅ | — | — | — | ✅ | ✅ | — |
| purchases.order.approve | ✅ | — | — | — | — | ✅ | — |
| purchases.grn.* | ✅ | — | — | — | ✅ | ✅ | — |
| purchases.invoice.* | ✅ | ✅ | — | — | ✅ | ✅ | — |
| purchases.invoice.pay | ✅ | ✅ | — | — | — | ✅ | — |
| purchases.return.* | ✅ | ✅ | — | — | ✅ | ✅ | — |
| accounting.* | ✅ | ✅ | — | — | — | read | — |
| period.close | ✅ | ✅ | — | — | — | — | — |
| vouchers.create / post | ✅ | ✅ | — | — | — | ✅ | ✅ |
| vouchers.reconcile | ✅ | ✅ | — | — | — | — | — |
| zakat.* | ✅ | ✅ | — | — | — | — | — |
| reports.sales | ✅ | ✅ | ✅ | own | — | own-branch | own-branch |
| reports.finance | ✅ | ✅ | — | — | — | own-branch | — |
| reports.finance.consolidated | ✅ | ✅ | — | — | — | — | — |
| reports.aging | ✅ | ✅ | — | — | — | own-branch | ✅ |
| sms.send | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| sms.bulk.send | ✅ | — | — | — | — | ✅ | — |
| sms.templates.manage | ✅ | — | — | — | — | — | — |
| ai.ask | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ai.usage.read | ✅ | — | — | — | — | — | — |
| mobile.visits.log | ✅ | — | — | ✅ | — | — | — |
| mobile.visits.read-all | ✅ | — | ✅ | — | — | ✅ | — |
| backup.* | ✅ | — | — | — | — | — | — |

### 4.4 Implementation (ASP.NET Core)

```csharp
// Startup
services.AddAuthorization(o =>
{
    foreach (var p in PermissionCatalog.All)
        o.AddPolicy(p, pb => pb.Requirements.Add(new PermissionRequirement(p)));
});
services.AddScoped<IAuthorizationHandler, PermissionHandler>();

// Handler: reads user claims (baked into JWT on login)
public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, PermissionRequirement req)
    {
        if (ctx.User.HasClaim("perm", req.Permission))
            ctx.Succeed(req);
        return Task.CompletedTask;
    }
}

// Controller usage
[HttpPost]
[Authorize(Policy = "orders.create")]
public async Task<IActionResult> CreateOrder(CreateOrderCommand cmd) { ... }
```

### 4.5 Warehouse Scoping (Attribute-Based Filter)

Every query involving `warehouse_id` is filtered through an `ICurrentUser.AllowedWarehouseIds`. EF Core global query filters automatically apply it:

```csharp
modelBuilder.Entity<Order>()
    .HasQueryFilter(o => _currentUser.IsSuperAdmin
                         || _currentUser.AllowedWarehouseIds.Contains(o.WarehouseId));
```

### 4.6 Dynamic Permission Assignment Flow

```
SuperAdmin → /roles/{id}/permissions PUT { permissionIds: [12, 45, 67] }
          → service updates role_permissions
          → publishes PermissionsChanged event
          → all refresh tokens for users with this role get flagged
          → next API call → token refresh → new JWT with updated claims
```

---

## 5. Detailed Development Plan

### Phase 0 — Foundation (Week 0)
- Monorepo: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared-types`
- CI/CD: GitHub Actions → build, test, lint, Docker image → staging
- PostgreSQL + EF Core migrations baseline
- Serilog + Seq, OpenTelemetry scaffolding
- Environment configs (dev/staging/prod), secrets in `.env` + Azure Key Vault / AWS SM

### Phase 1 — Identity & Access Control
- Users, roles, permissions, JWT auth, refresh tokens
- Permission catalog seeded
- Audit logging middleware (before/after snapshots for every write)
- **Web**: Login page, user management screen
- **Deliverable**: SuperAdmin can create users, assign roles, manage permissions

### Phase 2 — Master Data
- Catalog: categories, brands, UoM, products, barcodes, images
- **Branches** table + branch hierarchy + document-number prefixes ★
- Warehouses + user-warehouse scoping + warehouse-to-branch mapping ★
- **Parties (unified)** table with contacts, addresses, GL mapping ★
  - Backwards-compatible `customers` / `suppliers` views
  - Credit fields (`credit_limit`, `credit_days`, `credit_hold_policy`) wired in
- Price lists
- **Web**: Product CRUD, catalog search, bulk import (CSV),
  party management with tabbed UI (Overview / Credit / Ledger / Visits / Orders)
- **Deliverable**: Master data management complete, including branches & parties

### Phase 3 — Inventory Core
- `stock_items` + `stock_movements` (append-only)
- Stock adjustment flow
- Opening stock import
- Low-stock alert job (nightly + live flag)
- **Hide total stock** enforced by `products.hide_stock` + `stock.view-total` permission
- **Deliverable**: Real-time per-warehouse stock with audit trail

### Phase 4 — Stock Transfers
- Transfer state machine (DRAFT → … → RECEIVED)
- Stock reservation on approval
- Discrepancy handling on receipt
- **Deliverable**: Karachi → Lahore transfer flow works end-to-end

### Phase 5 — Sales, Credit Control & Invoicing
- Order creation (web + mobile), pricing rules, tax computation
- Order state machine with **CREDIT_HOLD** state ★
- **Credit check service** ★: checks limit, overdue count, holds policy
  - `NONE` → pass; `WARN` → log and allow; `BLOCK` → set CREDIT_HOLD
  - Override flow with mandatory reason + `credit.override` permission
- Stock reservation on submission
- Order-to-delivery workflow
- **Invoice generation** on dispatch (unique branch-prefixed number) ★
- **PDF invoice rendering** (QuestPDF) → stored in MinIO ★
- Invoice → accounting entry linkage + multi-invoice voucher allocation
- **Partial sales returns** with condition tracking (resalable / damaged / expired) ★
- GPS tagging on mobile-created orders (see Phase 10)
- **Deliverable**: Sales creates → credit check → Order Dept processes → Dispatch + Invoice PDF

### Phase 5.5 — Purchases Module ★ (NEW in v2.0)
- Purchase Order state machine (DRAFT → APPROVED → RECEIVED → CLOSED)
- **Goods Receipt Notes (GRN)** with multi-GRN-per-PO, partial receipt, damaged/accepted split
- Weighted-average cost update on GRN posting
- **Purchase Invoices** (linked to GRN or direct bill)
- Auto-posting rules: DR Inventory / CR GR-IR on receipt → DR GR-IR / CR AP on invoice
- Supplier withholding tax support (Pakistan)
- **Purchase Returns** with condition codes
- Supplier ledger + AP aging report
- **Web**: Purchase dashboard, PO wizard, GRN receipt screen, supplier statement
- **Deliverable**: Full procure-to-pay cycle with clean AP books

### Phase 6 — Accounting Core (longest, most care needed)
- Chart of accounts seeding (standard Pakistani COA) — **branch-aware** ★
- Journal entries (draft → posted → reversed), all lines tagged with `branch_id` ★
- **Inter-branch** contra logic + dedicated inter-branch receivable/payable accounts ★
- Accounting periods + period lock table ★
- **Automated postings from events**:
  - Order dispatched → DR: AR, CR: Sales, CR: Output Tax, DR: COGS, CR: Inventory
  - Sales return → reverse (partial supported)
  - Purchase GRN posted → DR: Inventory, CR: GR-IR ★
  - Purchase invoice posted → DR: GR-IR + Input Tax, CR: AP ★
  - Purchase payment → DR: AP, CR: Cash/Bank/Wallet ★
  - Voucher posted → DR/CR per voucher type, respecting `payment_method` ★
  - Expense → DR: Expense, CR: Cash/Bank/Wallet
- Ledger queries, trial balance, P&L, balance sheet — with optional `branchId` filter
- **Consolidated reports** for users with `reports.finance.consolidated` ★
- **Deliverable**: Books auto-balance on every transaction; per-branch and group reports work

### Phase 7 — Vouchers, Payments, Expenses, Bank Transfers
- Cash receipt / payment vouchers
- Bank receipt / payment vouchers
- **Mobile wallet vouchers** (Easypaisa, JazzCash, SadaPay, NayaPay) ★
- `wallet_accounts` setup + merchant id management ★
- Wallet transaction id capture for reconciliation ★
- **Invoice-to-voucher allocation** (one voucher → N invoices, FIFO/manual) ★
- Journal vouchers (multi-line)
- Account-to-account transfers
- **Deliverable**: Day-to-day treasury operations across all payment methods

### Phase 8 — Zakat Module
- Period + nisab configuration (gold/silver rates)
- Snapshot of zakatable assets from COA tags
- Calculation engine (2.5% × net zakatable if ≥ nisab)
- Finalization → auto JE posting
- **Deliverable**: Annual zakat calculation with audit trail

### Phase 9 — Advanced Reporting
- Materialized views: sales daily, stock valuation, party ledger
- **New v2.0 MVs**: AR aging, AP aging, top customers, slow-moving, dead stock, sales trends by region ★
- Reports with filters, CSV/PDF/Excel export (ClosedXML, QuestPDF)
- Dashboard widgets: today's sales, top products, low stock, outstanding, **overdue invoices**, **dead stock value** ★
- Branch-scoped and consolidated views
- Saved report presets per user
- **Deliverable**: All standard + advanced operational reports including aging and stock health

### Phase 10 — Mobile App (React Native) + Field Intelligence
- Auth + offline-capable catalog cache
- Barcode scanning (Expo Barcode Scanner)
- Order creation offline, sync on reconnect (per-device outbox)
- Sales rep dashboard, customer lookup
- **GPS tagging on orders** (`orders.gps_lat/lng/accuracy`) ★
- **Customer visit tracking** ★ (`customer_visits` table):
  - Check-in / check-out with GPS & photo
  - Link visit → order if one was placed
  - "Last visit" badge on party screen
- **Route planning** view: today's planned visits on a map ★
- **Deliverable**: Field sales can create orders offline and every rep interaction is logged with location

### Phase 10.5 — SMS Integration & Notifications ★ (NEW in v2.0)
- Provider abstraction layer (`ISmsGateway`)
- Adapters for Pakistan providers: Jazz BizSMS, Telenor Tameer, Twilio PK, Veevo
- Template engine (Handlebars) + approval workflow
- Hangfire queue for background dispatch with retries and failover
- Opt-out registry + PTA sender-id management
- Event-driven dispatch:
  - `OrderConfirmed` → SMS "Your order {orderNo} is confirmed..."
  - `OrderDispatched` → SMS with tracking / delivery eta
  - `InvoiceIssued` → SMS with amount and due date
  - `InvoiceOverdueN days` → reminder (daily job scanning `mv_ar_aging`)
  - `PaymentReceived` → thank-you SMS
  - Zakat period ready, stock alert (for SuperAdmin/managers)
- Cost & delivery reports
- **Deliverable**: Reliable customer-facing SMS across order, invoice, and collection lifecycle

### Phase 11 — AI Assistant (LLM) ★
- **LLM integration layer** (`ILLMProvider`) with Gemini and OpenAI adapters (fallback)
- **Tool-calling architecture**: assistant cannot emit raw SQL — it calls registered
  functions like `get_top_customers(branch, days)`, `get_aging(partyId)`,
  `get_sales_trend(productId, months)`, `explain_variance(metric)`.
- **Safe SQL templates** catalog (`llm_safe_templates`) for common patterns
- Controlled system prompt that includes schema metadata **and the caller's branch scope**
- `llm_queries` audit log (every call, every cost)
- **Use cases implemented**:
  - Natural language Q&A ("Which product sold most in Karachi last month?")
  - Report summarisation ("Summarise this month's P&L for me")
  - Anomaly explanations ("Why did COGS spike in March?")
  - Smart suggestions ("Which customers should I call for collections today?")
- Web chat widget embedded in dashboard
- Token & cost dashboard for SuperAdmin
- **Deliverable**: Conversational AI assistant grounded in VIZO data

### Phase 11.5 — Optional ML Forecasting (advanced)
- Python FastAPI service alongside main API (deferred until data volume justifies it)
- **Demand forecasting**: Prophet or SARIMAX on `stock_movements` per SKU × warehouse
- **Smart reorder**: dynamic reorder level based on lead time × forecasted demand + safety stock
- **Sales insights**: customer churn risk, product affinity (market basket via FP-Growth)
- Exposed through `/intelligence/*` endpoints; web dashboard visualizes
- **Deliverable**: Data-driven alerts and forecasts (when historical data is sufficient)

### Phase 12 — Hardening, Backups & Launch
- Load testing (k6 / Bombardier)
- Security audit (OWASP ZAP, dependency scan, secrets scan)
- **Automated daily backups** — PITR with `pg_basebackup` + WAL-G to S3/MinIO ★
- **Manual export**: Superadmin can trigger on-demand full DB dump (encrypted) ★
- **Restore drill** runbook executed monthly — *actually restore to staging and diff* ★
- Disaster recovery runbook
- User training, data migration, go-live

---

## 6. Risks & Challenges

### 6.1 Accounting Integrity (the #1 risk)

| Risk | Mitigation |
|---|---|
| Unbalanced journal entries | DB `CHECK (total_debit = total_credit)` + application-level invariant in aggregate |
| Race on simultaneous postings | Use `SERIALIZABLE` or advisory locks per account for period close |
| Retrospective edits to posted entries | **Forbidden** — posted = immutable. Corrections only via reversing JE |
| COA deletion corrupting history | Soft delete + enforcement that accounts with `journal_lines` can only be deactivated |
| Wrong period postings | Period lock table: `accounting_periods(is_closed)`; posting to closed period rejected |
| Rounding drift in taxes | Calculate tax per line, bank-rounding, final adjustment line if needed |
| Negative stock from over-selling | Check `available_quantity` under `SELECT ... FOR UPDATE` before reservation |

### 6.2 Inventory Consistency

| Risk | Mitigation |
|---|---|
| Lost updates on concurrent stock changes | Row-level locks on `stock_items` during movement creation |
| Stock / accounting mismatch | Every stock movement happens in SAME transaction as matching journal entry (outbox pattern) |
| Transfer in-flight visibility | Shipped stock is `OUT` from source immediately but only `IN` at destination on receipt — items sitting in "goods in transit" account |
| Inventory valuation drift (avg cost) | Weighted-average recomputed atomically inside the movement transaction |

### 6.3 Performance

| Risk | Mitigation |
|---|---|
| Ledger queries slow at scale | Partition `stock_movements` and `journal_lines` by month; materialized views for reports |
| N+1 queries from EF Core | Explicit `.Include` / projection; enable EF logging in dev |
| Dashboard bottlenecks | Redis cache on dashboard endpoints (30s TTL); nightly rollup jobs |

### 6.4 Security

| Risk | Mitigation |
|---|---|
| Stolen JWT | Short access token (15 min) + rotating refresh tokens stored hashed |
| Privilege escalation | All permission checks server-side; frontend permissions are UX only |
| SQL injection | EF Core parameterization only; no dynamic SQL |
| Mass assignment | DTOs separate from entities; map explicitly |
| PII exposure in logs | Serilog destructuring with `[Redact]` attribute on sensitive properties |
| Brute force | Rate limit + account lockout after 5 failed attempts |

### 6.5 Business & Operational

| Risk | Mitigation |
|---|---|
| Mobile offline sync conflicts | Last-write-wins only for drafts; confirmed orders are immutable on server |
| Multi-city latency | Single primary DB + read replica; CDN for static; API servers regional (only if required) |
| User error in postings | Everything is reversible via reversing journal entries, never hard delete |
| Data migration from old system | Dedicated import module with dry-run + reconciliation report |

### 6.6 Credit Control & Collections ★ NEW

| Risk | Mitigation |
|---|---|
| Over-reliance on override flow (sales team bypasses blocks) | `credit.override` is a separate permission and usage is reported to SuperAdmin weekly; mandatory reason captured on every override |
| Stale `current_balance` on parties (drift vs ledger) | Nightly reconciliation job: `SUM(journal_lines WHERE party_id=X)` must equal `parties.current_balance`; alerts on mismatch |
| Customer disputes on ageing buckets | `mv_ar_aging` is derived from `invoices` which are immutable once issued; bucketing rules versioned and documented |
| Credit limit raised informally without auditing | All changes to `credit_limit` / `credit_days` go through `parties_audit` and require `parties.update` permission |

### 6.7 Purchases Module ★ NEW

| Risk | Mitigation |
|---|---|
| GRN without PO leaves inventory uncosted | GRN form requires either `po_id` OR explicit cost override with `purchases.grn.post` permission |
| Duplicate supplier invoices (same paper bill keyed twice) | Unique index on `(supplier_party_id, supplier_invoice_no, invoice_date)` |
| Landed cost (freight, duty) not allocated | `landed_cost_per_unit` column + optional landed-cost JV adjustment before avg_cost recomputation |
| Withholding tax mis-calculated | Dedicated WHT config per supplier + posting rule; posted as a separate journal line tagged `WHT` |
| Stock mis-valued when purchase invoice price differs from GRN cost | Post a price-variance JE against `Purchase Price Variance` account; avg_cost unchanged |

### 6.8 SMS & Notifications ★ NEW

| Risk | Mitigation |
|---|---|
| Gateway downtime drops customer-facing messages | Multi-gateway failover via `sms_gateways.priority`; queue retries with exponential backoff (3 attempts × 3 gateways) |
| PTA non-compliant sender IDs get rejected | Approved sender-id list per template; pre-send validation |
| Spam complaints → blacklisted number | Honour `sms_opt_outs`; worker checks before sending |
| Cost blow-up from runaway loops | Rate limiter per-minute per-gateway; daily cost cap with alert |
| PII leaking in SMS body | Template approval workflow; no raw SQL fields in templates |

### 6.9 AI Assistant (LLM) ★ NEW

| Risk | Mitigation |
|---|---|
| Hallucinated answers misleading finance team | LLM cannot emit raw SQL — only calls pre-registered tools; every answer carries `sources` metadata so user can verify |
| Prompt injection via customer-supplied data (e.g. a product name) | Treat all retrieved data as data, never as instructions; use structured tool outputs rather than raw text in the prompt |
| Data exfiltration via the LLM provider | Branch / permission scoping enforced **before** tool calls; no PII such as CNIC ever included in prompts; use private/regional endpoints where available |
| Token cost runaway | Per-user daily token cap; cost dashboard; cache frequent answers |
| Model deprecation | `llm_providers` abstraction — swap Gemini ↔ OpenAI ↔ Anthropic without business-logic changes |
| Non-deterministic reports | Financial numbers always come from the tool result (SQL), never from the LLM's own arithmetic |

### 6.10 Backup & Disaster Recovery ★ NEW

| Risk | Mitigation |
|---|---|
| Backups exist but have never been restored | Monthly automated restore drill to a staging DB + integrity check (`pg_dumpall` diff) |
| Offsite backup destination compromised | Backup encryption with separate KMS key; separate credentials; append-only bucket policy |
| PITR window too short | WAL-G continuous archiving → 7 days of PITR + nightly base backup for 30 days |
| Single-region dependency | Secondary backup location in a different cloud region/provider |

---

## 7. Optimization Suggestions

### 7.1 Database
- **Indexes**: composite on `(warehouse_id, product_id)`, `(customer_id, order_date)`, `(entry_date)` on journal, partial index on `orders(status)` for active orders
- **Partitioning**: `stock_movements` and `journal_lines` monthly partitions (PostgreSQL native)
- **Materialized views** refreshed nightly + `REFRESH MATERIALIZED VIEW CONCURRENTLY` for hot ones
- **Connection pooling**: PgBouncer transaction mode
- **Read replica**: reports hit replica; writes go to primary

### 7.2 Application
- **CQRS**: separate write model (EF Core, domain-rich) from read model (Dapper, fast queries)
- **Caching**:
  - Static master data (categories, UoM, COA) in Redis, invalidated on change
  - Permission catalog cached for entire session
  - Product search results with 60s TTL
- **Background jobs** (Hangfire):
  - Low stock alerts (every 30 min)
  - Nightly MV refresh
  - Monthly accounting period rollup
  - AI forecast retraining (weekly)
- **Outbox pattern**: domain events survive crashes, guarantee cross-module consistency

### 7.3 Frontend
- Next.js server components for read-heavy dashboards
- Virtualized tables (`@tanstack/react-virtual`) for 10k+ rows
- React Query with stale-while-revalidate
- Code splitting per module
- Accessibility (WCAG AA)

### 7.4 Mobile
- SQLite local cache (WatermelonDB or expo-sqlite)
- Delta sync with `lastSyncAt` watermark
- Offline-first order creation with local draft ids → replaced on sync
- Image compression before upload

### 7.5 Security
- HTTPS only, HSTS, CSP headers
- Argon2id for passwords (memory cost 64MB, iterations 3)
- JWT signed with RS256; public key distributed
- CSRF tokens on session cookies (if used)
- CORS whitelist
- Input validation everywhere (FluentValidation)
- Rate limiting per user + per IP (AspNetCoreRateLimit)
- Regular dependency scanning (Dependabot, `dotnet list package --vulnerable`)
- Encrypted backups; encrypted columns for tax numbers / bank account numbers (`pgcrypto`)

### 7.6 DevOps
- Docker multi-stage builds
- Database migrations via EF Core + CI gate (migration bundle shipped with build)
- Blue-green deployment
- Automated daily backups + weekly restore drill
- Monitoring alerts: API p99 > 500ms, error rate > 1%, DB connections > 80%, disk > 85%

---

## 8. System Flowcharts

### 8.1 Order Flow (Sales → Credit Check → Invoice → Ledger)

```
┌──────────┐
│  Sales   │ (web/mobile)
│   Rep    │ — logs in, browses catalog, selects party (customer)
└────┬─────┘  ★ mobile: captures GPS lat/lng on save
     │ POST /orders (DRAFT)
     ▼
┌──────────────────────────────────────┐
│   Order = DRAFT                      │
│   • pricing computed                 │
│   • tax computed                     │
│   • stock NOT reserved yet           │
└────┬─────────────────────────────────┘
     │ POST /orders/{id}/submit
     ▼
┌──────────────────────────────────────┐
│  ★ CREDIT CHECK SERVICE              │
│    reads party.credit_limit,         │
│    credit_days, hold_policy, +       │
│    mv_ar_aging.days_over_{party.     │
│    credit_days}                      │
│                                      │
│    PASS  → continue                  │
│    WARN  → continue, log             │
│    BLOCK → set CREDIT_HOLD, notify   │
└────┬────────────┬────────────────────┘
     │BLOCK       │PASS/WARN
     ▼            ▼
┌─────────┐   ┌──────────────────────────────────┐
│CREDIT_  │   │  Order = SUBMITTED                │
│ HOLD    │   │  • reserve stock                  │
│         │   │  • if available_qty < 0 → REJECT  │
│Override │   │  • notify Order Dept              │
│requires │   └──────┬────────────────────────────┘
│credit.  │          │
│override │          ▼
│perm +   │       ┌──────────┐
│reason   │       │  Order   │
└────┬────┘       │   Dept   │ reviews
     │ approved   └────┬─────┘
     └────────────────►│
                       │
                       ├── POST /orders/{id}/cancel ──► CANCELLED
                       │
                       │ POST /orders/{id}/confirm
                       ▼
             ┌──────────────────────────────────────┐
             │   Order = CONFIRMED → PROCESSING →   │
             │   PACKED                             │
             └────┬─────────────────────────────────┘
                  │ POST /orders/{id}/dispatch
                  ▼
       ┌──────────────────────────────────────────┐
       │   Order = DISPATCHED                     │
       │   ┌──── TRANSACTION BEGIN ───────┐       │
       │   │ 1. stock_items: qty -= x     │       │
       │   │    reserved_qty -= x         │       │
       │   │ 2. stock_movement: SALE      │       │
       │   │ 3. ★ INSERT invoices (ISSUED)│       │
       │   │      invoice_no = branch seq │       │
       │   │      due_date   = today +    │       │
       │   │                 credit_days  │       │
       │   │ 4. journal_entry POSTED      │       │
       │   │    branch_id = order.branch: │       │
       │   │    DR  Accounts Receivable   │       │
       │   │    CR  Sales Revenue         │       │
       │   │    CR  Output Tax Payable    │       │
       │   │    DR  COGS                  │       │
       │   │    CR  Inventory Asset       │       │
       │   │ 5. party.current_balance++   │       │
       │   │ 6. ★ enqueue SMS notification│       │
       │   │      (ORDER_DISPATCHED)      │       │
       │   │ 7. ★ enqueue PDF render job  │       │
       │   └──── COMMIT ───────────────────┘      │
       └────┬─────────────────────────────────────┘
            │ POST /orders/{id}/deliver
            ▼
       DELIVERED  ──► ★ enqueue DELIVERED SMS
            │
            │ customer pays later via voucher
            ▼
┌────────────────────────────────────────────────┐
│  Cash/Bank/Wallet Receipt Voucher              │
│   DR  Cash/Bank/Wallet                         │
│   CR  Accounts Receivable                      │
│   + voucher_invoice_allocations rows (FIFO)    │
│   → invoices.paid_amount += allocated          │
│   → if fully paid → ★ enqueue PAYMENT_RECEIVED │
└────────────────────────────────────────────────┘
```

### 8.2 Inventory Flow

```
         ┌─────────────────┐
         │ Purchase / Open │
         │ Stock / Return  │
         └────────┬────────┘
                  │  (+qty, cost)
                  ▼
        ┌─────────────────────┐          ┌────────────────────┐
        │   stock_items       │◀─────────│ append-only        │
        │   quantity ↑        │          │ stock_movements    │
        │   avg_cost recalc'd │─────────▶│ (ledger of truth)  │
        └────────┬────────────┘          └────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐      ┌───────────┐
   │ Orders  │      │ Transfers │  (see transfer flow)
   │ consume │      │           │
   └─────────┘      └───────────┘
        │                 │
        ▼                 ▼
    quantity ↓        quantity ↓ src
                      quantity ↑ dest
        │
        ▼
 ┌───────────────────┐
 │ Nightly Job:      │
 │  • recompute MV   │
 │  • low stock alert│
 │  • AI reorder calc│
 └───────────────────┘
```

### 8.3 Stock Transfer Flow

```
         Karachi Warehouse                    Lahore Warehouse
         ─────────────────                    ────────────────

  [Order Dept / SuperAdmin]
           │
           │ POST /transfers  (DRAFT)
           ▼
      ┌────────┐
      │ DRAFT  │
      └───┬────┘
          │ submit
          ▼
   ┌─────────────┐
   │  PENDING_   │  ──► [Manager reviews]
   │  APPROVAL   │
   └──────┬──────┘
          │ approve
          ▼
   ┌─────────────┐
   │  APPROVED   │
   │   • reserve │
   │     source  │
   │     stock   │
   └──────┬──────┘
          │ ship
          ▼
  ┌──────────────────┐
  │   IN_TRANSIT     │
  │                  │
  │  TRANSACTION:    │
  │  src.qty -= x    │
  │  src.reserved -=x│
  │  stock_movement  │
  │   TRANSFER_OUT   │
  │  JE:             │
  │   DR Goods-in-   │
  │      Transit     │
  │   CR Inventory-  │
  │      Karachi     │
  └──────┬───────────┘
         │
         │  (physical shipment …)
         │
         │               receive with actual qty
         │◀──────────────────────────────────────
         ▼
  ┌──────────────────────────────────┐
  │        RECEIVED                  │
  │  TRANSACTION:                    │
  │   dest.qty += received           │
  │   stock_movement TRANSFER_IN     │
  │   recompute dest avg_cost        │
  │   JE:                            │
  │    DR Inventory-Lahore           │
  │    CR Goods-in-Transit           │
  │   if received < sent:            │
  │     JE: DR Shrinkage Expense     │
  │         CR Goods-in-Transit      │
  │   audit log + stock_transfer_    │
  │      history                     │
  └──────────────────────────────────┘
```

### 8.4 Accounting Flow (Unified)

```
                ┌─────────────────────────────────────────┐
                │   TRIGGERING EVENTS                     │
                ├─────────────────────────────────────────┤
                │ • Order dispatched                      │
                │ • Sales return                          │
                │ • Stock transfer ship/receive           │
                │ • Purchase receipt                      │
                │ • Expense recorded                      │
                │ • Voucher posted                        │
                │ • Manual JV                             │
                │ • Period close                          │
                │ • Zakat finalized                       │
                └──────────────┬──────────────────────────┘
                               │ publishes domain event
                               ▼
              ┌────────────────────────────────────┐
              │  Accounting Posting Service        │
              │  (event handler per event type)    │
              │  • builds JournalEntry draft       │
              │  • validates debits == credits     │
              │  • selects accounts per COA rules  │
              └──────────────┬─────────────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │  journal_entries (DRAFT)   │
                │  journal_lines              │
                └──────────────┬─────────────┘
                               │ auto-post OR require manual approval
                               ▼
                ┌────────────────────────────┐
                │  journal_entries (POSTED)  │
                │  • immutable               │
                │  • update account_balances │
                │  • update customer/supplier│
                │    balances                │
                │  • publish Posted event    │
                └──────┬────────┬────────────┘
                       │        │
           ┌───────────▼──┐   ┌─▼────────────────┐
           │  Ledger View │   │ Reporting MVs    │
           │  (per acct)  │   │ refresh async    │
           └──────┬───────┘   └──────────────────┘
                  │
       ┌──────────┼──────────┬──────────┐
       ▼          ▼          ▼          ▼
  Trial      P & L      Balance     Customer
  Balance               Sheet       Statement

  ──────── CORRECTION ────────
  POSTED entry can only be fixed by
  posting a REVERSING entry (same
  lines, debit ↔ credit) linked via
  reversed_by_entry_id. Original
  remains in history forever.
```

### 8.5 Permission Check Flow

```
 Request ──► JWT Middleware ──► Extract claims (userId, perm[])
                                       │
                                       ▼
                               ┌──────────────┐
                               │ Policy check │
                               │ [Authorize   │
                               │  Policy=".."]│
                               └──────┬───────┘
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
                 Has permission?               Missing permission?
                      │                               │
                      ▼                               ▼
               Continue to handler           403 Forbidden (RFC 7807)
                      │
                      ▼
            Warehouse scoping filter
           (EF Core HasQueryFilter)
                      │
                      ▼
           Execute business logic
                      │
                      ▼
            Audit log entry
                      │
                      ▼
                 Response
```

### 8.6 Zakat Calculation Flow

```
 ┌────────────────────┐
 │ Accountant creates │
 │ zakat_period       │
 │ (Hijri year,       │
 │  nisab rates)      │
 └────────┬───────────┘
          │
          ▼
 ┌────────────────────────────────┐
 │ POST /zakat/calculations       │
 │ Snapshot at date:              │
 │  • Sum of Cash accounts        │
 │  • Sum of Bank accounts        │
 │  • Sum of Receivables          │
 │  • Inventory (market value)    │
 │  − Short-term Payables         │
 │  − Accrued expenses            │
 │  = Net zakatable assets        │
 └────────┬───────────────────────┘
          │
          ▼
 ┌────────────────────────────────┐
 │ net >= nisab_value?            │
 └────────┬──────────────┬────────┘
          │ yes          │ no
          ▼              ▼
  zakat = net × 0.025   zakat = 0
          │
          ▼
 ┌────────────────────────────────┐
 │ Accountant reviews, adjusts    │
 │ inclusion flags per item       │
 └────────┬───────────────────────┘
          │ finalize
          ▼
 ┌────────────────────────────────┐
 │ Auto journal entry:            │
 │  DR  Zakat Expense / Equity    │
 │  CR  Zakat Payable             │
 └────────┬───────────────────────┘
          │ payment voucher
          ▼
 ┌────────────────────────────────┐
 │  DR  Zakat Payable             │
 │  CR  Cash / Bank               │
 └────────────────────────────────┘
```

### 8.7 Mobile Offline Sync Flow (with GPS)

```
  Mobile App (offline)                       API
  ──────────────────                         ───
  Login ─────────────────────────────▶
  ◀────── JWT + catalog snapshot ──────

  Browse / add to cart            [local SQLite]
  Create order (draft)            [local + GPS tag captured]
  Scan barcode                    [local lookup]
  Check in at customer            [local visit record]
    ↳ photo + GPS + notes
   ...

  (back online)
  POST /mobile/sync/push
    {
      lastSyncAt,
      orders[ { ..., gpsLat, gpsLng, gpsAccuracy, deviceId } ],
      visits[ { partyId, checkInLat/Lng, photoUrls, outcome } ],
      returns[]
    } ──────────────────────────────────▶
                                           validate,
                                           dedupe by clientId,
                                           run credit check,
                                           create on server,
                                           capture GPS metadata
  ◀── { serverIds[], conflicts[],
         creditHolds[] } ────────────

  POST /mobile/sync/pull?since=lastSyncAt ─▶
                                           delta: catalog changes,
                                           stock updates,
                                           my orders status,
                                           today's planned visits
  ◀── { delta } ──────────────────────
  Apply delta to local DB
```

### 8.8 Purchase Flow (Supplier → PO → GRN → Invoice → Payment)

```
    Purchase Officer
          │
          │ POST /purchases/orders  (DRAFT)
          ▼
     ┌────────┐
     │ DRAFT  │  pick supplier (party), items, quantities, expected date
     └───┬────┘
         │ submit
         ▼
  ┌──────────────┐
  │  PENDING_    │  ──► Branch Manager reviews terms / budget
  │  APPROVAL    │
  └──────┬───────┘
         │ approve
         ▼
   ┌─────────────┐
   │  APPROVED   │  — PO pdf emailable to supplier
   └──────┬──────┘
          │  (supplier delivers — fully or partially)
          ▼
  ┌──────────────────┐
  │ POST /grns       │
  │                  │
  │  goods_receipts  │ —► may partially fulfill PO
  │    + items (incl.│
  │    qtyDamaged)   │
  │                  │
  │  TRANSACTION:    │
  │   stock_items.qty│
  │          += good │
  │   stock_movement │
  │    (PURCHASE)    │
  │   avg_cost recalc│
  │   JE:            │
  │     DR Inventory │
  │     CR GR-IR     │
  └──────┬───────────┘
         │
         │  (supplier's commercial invoice arrives)
         ▼
 ┌───────────────────────────┐
 │ POST /purchases/invoices  │
 │    invoice_no (ours)      │
 │    supplier_invoice_no    │
 │    links to GRN(s)        │
 │                           │
 │  TRANSACTION:             │
 │   JE:                     │
 │     DR GR-IR              │
 │     DR Input Sales Tax    │
 │     CR Accounts Payable   │
 │         (supplier party)  │
 │   supplier balance++      │
 └──────┬────────────────────┘
        │
        │ later, pay the bill
        ▼
 ┌───────────────────────────┐
 │ POST .../pay              │
 │   paymentMethod =         │
 │   CASH / BANK /           │
 │   EASYPAISA / JAZZCASH    │
 │                           │
 │  Voucher (CP/BP/WP):      │
 │   DR Accounts Payable     │
 │   CR Cash/Bank/Wallet     │
 │   DR/CR WHT if applicable │
 │  invoice.paid_amount ↑    │
 └───────────────────────────┘
        │
        ▼                                     (if defective goods)
 ┌───────────────────────────┐        ┌────────────────────────┐
 │  FULLY PAID / CLOSED      │        │ POST /purchases/returns│
 └───────────────────────────┘        │                        │
                                      │  stock ↓ (warehouse)   │
                                      │  JE: DR AP / CR Inv.   │
                                      │      + reverse tax     │
                                      └────────────────────────┘
```

### 8.9 Credit Control Flow

```
            ┌────────────────────────┐
            │  Order /submit arrives │
            └───────────┬────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │  Credit Check Service  │
            │                        │
            │  Inputs:               │
            │   • party.credit_limit │
            │   • party.credit_days  │
            │   • party.hold_policy  │
            │   • mv_ar_aging        │
            │   • order.total_amount │
            └───┬──────────┬─────────┘
                │          │
                │          ▼
                │  Compute:
                │    outstanding = party.current_balance
                │    overdue_amt = aging.days_over_credit_days
                │    projected   = outstanding + order.total
                │
                ▼
  ┌──────────────────────────────────────────────────┐
  │ Rule Engine                                       │
  ├──────────────────────────────────────────────────┤
  │  projected > credit_limit?                        │
  │  overdue_amt > 0 AND hold_policy == BLOCK?        │
  │  party.is_active = false?                         │
  └───────────┬──────────┬──────────┬─────────────────┘
              │          │          │
              │PASS      │WARN      │BLOCK
              ▼          ▼          ▼
        ┌─────────┐ ┌────────┐ ┌────────────────┐
        │ continue│ │ log +  │ │ order.status = │
        │         │ │ toast  │ │  CREDIT_HOLD   │
        └────┬────┘ │ user   │ │                │
             │      └───┬────┘ │ SMS internal:  │
             │          │      │  "Sales X:     │
             │          │      │   order on     │
             │          │      │   credit hold" │
             │          │      └──────┬─────────┘
             │          │             │
             │          │             │ Override flow:
             │          │             │ accountant/mgr
             │          │             │ POST /orders/X/
             │          │             │   override-credit
             │          │             │ { reason }
             │          │             │
             │          │             ▼
             │          │    ┌────────────────┐
             │          │    │ credit_override│
             │          │    │ _by / _reason  │
             │          │    │ credit_check_  │
             │          │    │  result =      │
             │          │    │  OVERRIDDEN    │
             │          │    │ → SUBMITTED    │
             │          │    └────────────────┘
             ▼          ▼
       reserve stock, notify Order Dept
```

### 8.10 SMS Notification Flow

```
  Domain Event published by core module
    (OrderDispatched / InvoiceIssued /
     InvoiceOverdueN / PaymentReceived)
               │
               ▼
  ┌────────────────────────────────┐
  │  Notifications module listens  │
  │  pick template_code            │
  │  render body with Handlebars   │
  │  resolve party phone           │
  │  check sms_opt_outs            │
  └───────────────┬────────────────┘
                  │
                  ▼
  ┌────────────────────────────────┐
  │  INSERT sms_notifications      │
  │    status = QUEUED             │
  └───────────────┬────────────────┘
                  │
                  ▼
   ┌────────────────────────────────┐
   │  Hangfire worker (cron 30s)    │
   │   SELECT FOR UPDATE SKIP LOCKED│
   │    WHERE status = QUEUED       │
   │      AND scheduled_at <= NOW() │
   └───────────────┬────────────────┘
                   │
                   ▼
   ┌────────────────────────────────┐
   │  SmsGatewayRouter              │
   │   pick highest-priority        │
   │   healthy gateway              │
   │                                │
   │   Try → JAZZ                   │
   │     fail → TELENOR             │
   │       fail → TWILIO_PK         │
   │         fail → mark FAILED     │
   └───────────────┬────────────────┘
                   │
                   ▼
   ┌────────────────────────────────┐
   │  UPDATE sms_notifications      │
   │   status, provider_message_id, │
   │   cost, sent_at                │
   └───────────────┬────────────────┘
                   │
                   ▼
  ┌────────────────────────────────┐
  │  Delivery webhook (if supported)│
  │   status → DELIVERED / FAILED   │
  └────────────────────────────────┘
```

### 8.11 AI Assistant (LLM) Query Flow

```
   User types:
   "Which wholesalers in Karachi haven't paid in 30 days?"
               │
               ▼
  POST /ai/ask { question, sessionId }
               │
               ▼
  ┌────────────────────────────────┐
  │  Intent Classifier             │
  │  → AGING_INQUIRY               │
  └───────────────┬────────────────┘
                  │
                  ▼
  ┌────────────────────────────────┐
  │  Permission Filter             │
  │   user's branch scope +        │
  │   data sensitivity rules       │
  │   (user cannot access branches │
  │    they're not assigned to)    │
  └───────────────┬────────────────┘
                  │
                  ▼
  ┌────────────────────────────────┐
  │  Template Matcher              │
  │   try llm_safe_templates first │
  │   fall back to tool-calling    │
  └──────────┬────────────┬────────┘
             │            │
             │safe match  │no match
             ▼            ▼
  ┌─────────────────┐ ┌────────────────────┐
  │ Parameterised   │ │  LLM call          │
  │ SQL executed    │ │  system prompt =   │
  │ directly        │ │   schema summary + │
  │                 │ │   branch scope +   │
  │                 │ │   tool catalog     │
  │                 │ │  model returns     │
  │                 │ │   tool call e.g.   │
  │                 │ │   get_ar_aging(    │
  │                 │ │     branch='KHI',  │
  │                 │ │     bucketDays=30, │
  │                 │ │     category=      │
  │                 │ │     'WHOLESALER')  │
  └───────┬─────────┘ └──────────┬─────────┘
          │                       │
          └───────────┬───────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │  Execute registered tool     │
       │  (typed C# function)         │
       │  returns { rows, totals }    │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │  LLM renders natural answer  │
       │  + chart spec (Vega-Lite)    │
       │  + cites sources             │
       └──────────────┬───────────────┘
                      │
                      ▼
       ┌──────────────────────────────┐
       │  INSERT llm_queries          │
       │  (question, tokens, cost,    │
       │   resolved_tool_calls, ...)  │
       └──────────────┬───────────────┘
                      │
                      ▼
                 Response to user
```

---

## 9. Backup, Disaster Recovery & Data Safety

> **Principle:** backups that have never been restored are not backups — they're hope. Every component below is monitored and drilled.

### 9.1 Daily Automated Backups

| Item | Method | Frequency | Retention |
|---|---|---|---|
| **Full PostgreSQL base backup** | `pg_basebackup` → encrypted tar → MinIO (primary region) + S3 (secondary) | Nightly 01:00 | 30 days |
| **WAL continuous archive** | WAL-G → MinIO | Every 60 seconds | 7 days (PITR window) |
| **Logical dump (for app-level recovery)** | `pg_dump --format=custom` → MinIO | Nightly 02:30 | 14 days |
| **MinIO object store (product images, invoice PDFs)** | `mc mirror` → secondary MinIO | Nightly | 30 days |
| **Application config / secrets** | Sealed secrets → git + KMS-encrypted | On change | Indefinite |

### 9.2 Manual Export (on-demand)

- `POST /backup/run` (permission `backup.run`) — triggers a one-off encrypted dump uploaded to a dated folder. Returns a signed download URL valid for 15 minutes.
- `GET /backup/list?days=30` — lists available backups with integrity hash + size.
- SuperAdmin can also export per-module CSVs (products, parties, invoices) for auditors via the Reporting API.

### 9.3 Restore Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  RTO = 2 hours (target)   •   RPO = 5 minutes (target)      │
└─────────────────────────────────────────────────────────────┘
```

1. **Latest full** is restored to a clean PostgreSQL instance (`pg_basebackup` → restore).
2. **WAL files** are replayed up to the desired point in time (PITR).
3. **MinIO mirror** is attached so invoice PDFs and product images are accessible.
4. **Smoke tests** run automatically: row-count checks, checksum verification, sample invoice render.
5. **DNS cutover** via load balancer (if production-facing restore).

### 9.4 Monthly Restore Drill (mandatory)

- Automated pipeline: pull yesterday's backup → restore to `staging-dr` cluster → run schema diff + record count diff against prod → alert if discrepancy > 0.01%.
- Output report emailed to SuperAdmin and saved in Seq.

### 9.5 Data Retention & Archival

- **Hot data** (last 12 months): primary DB.
- **Warm data** (12-60 months): same DB, older partitions, queried via read replica.
- **Cold data** (60+ months): logical export to Parquet on S3, queryable via Duckdb if ever needed; dropped from primary.
- Retention respects Pakistan's Sales Tax record-keeping requirements (6 years minimum).

---

## 10. SMS Integration Strategy (Pakistan)

### 10.1 Gateway Providers (Priority Order)

| Priority | Provider | Why | Notes |
|---|---|---|---|
| 1 | **Jazz BizSMS** | Largest mobile operator in PK; enterprise API; low cost per SMS; PTA-registered sender IDs | Requires masked sender ID approval |
| 2 | **Telenor Tameer Business SMS** | Reliable delivery in rural areas | Similar PTA requirements |
| 3 | **Twilio (Pakistan route)** | International fallback; best delivery telemetry | More expensive per SMS |
| 4 | **Veevo / Branded SMS Pakistan** | Cheap for bulk marketing campaigns | Lower delivery guarantees |

Multi-provider routing gives ~99.5%+ effective delivery during partial outages.

### 10.2 Service Abstraction Layer

```csharp
public interface ISmsGateway
{
    string Code { get; }                                    // "JAZZ"
    int Priority { get; }                                   // lower = preferred
    Task<SendResult> SendAsync(SmsMessage msg, CancellationToken ct);
    Task<bool> HealthCheckAsync(CancellationToken ct);
}

public sealed class JazzBizSmsGateway : ISmsGateway { ... }
public sealed class TelenorSmsGateway : ISmsGateway { ... }
public sealed class TwilioPkSmsGateway : ISmsGateway { ... }

public sealed class SmsRouter
{
    private readonly IEnumerable<ISmsGateway> _gateways;    // DI-injected, ordered

    public async Task<SendResult> SendAsync(SmsMessage msg, CancellationToken ct)
    {
        foreach (var gw in _gateways.OrderBy(g => g.Priority))
        {
            if (!await gw.HealthCheckAsync(ct)) continue;
            var result = await gw.SendAsync(msg, ct);
            if (result.Success) return result;
            // log failure, try next
        }
        throw new SmsAllGatewaysFailedException();
    }
}
```

### 10.3 Queue-Based Dispatch (Background Jobs)

- Core modules **do not** call gateways directly. They publish a domain event or call `INotificationQueue.Enqueue(...)`.
- `sms_notifications` row inserted with `status=QUEUED`.
- Hangfire recurring job (`*/30 * * * * *`) drains the queue:
  - Picks `status=QUEUED AND scheduled_at <= NOW()` with `FOR UPDATE SKIP LOCKED`.
  - Routes through `SmsRouter` with retries (3 attempts × exponential backoff).
  - Updates row with `provider_message_id`, `cost`, `delivered_at`.
- Separate job consumes provider webhooks for delivery receipts and updates status.
- Dead-letter handling: > 3 failed attempts → `status=FAILED`, surfaced on admin dashboard.

### 10.4 Use Cases & Templates (v2.0 launch set)

| Trigger | Template Code | Audience | Timing |
|---|---|---|---|
| Order confirmed | `ORDER_CONFIRMED` | Customer | Immediate |
| Order dispatched | `ORDER_DISPATCHED` | Customer | On dispatch |
| Delivered | `ORDER_DELIVERED` | Customer | On delivery confirmation |
| Invoice issued | `INVOICE_ISSUED` | Customer | On dispatch |
| Invoice due tomorrow | `PAYMENT_DUE_TOMORROW` | Customer | Daily 09:00 (scan `mv_ar_aging`) |
| Invoice overdue | `PAYMENT_OVERDUE` | Customer | Every 3 days until paid |
| Payment received | `PAYMENT_THANK_YOU` | Customer | On voucher posting |
| Low stock alert | `LOW_STOCK` | Branch Manager / Purchase Officer | On alert job |
| Purchase Order approved | `PO_APPROVED` | Supplier | On approval |

### 10.5 Pakistan-Specific Compliance

- Honor PTA's mandatory working hours (09:00 – 21:00 local) for promotional SMS.
- Respect do-not-disturb registry (`sms_opt_outs`).
- Sender ID must be PTA-registered via the provider.
- Content must be in the approved language (English, Urdu, or Roman Urdu as configured).

---

## 11. AI Strategy — LLM Insights + Optional ML Forecasting

### 11.1 Two-Track Design

VIZO's AI capability is split into two tracks. Track A is the primary capability; Track B is deferred.

| Track | Tech | Purpose | Phase |
|---|---|---|---|
| **A. LLM Assistant** | Gemini 1.5 Pro / GPT-4o | Conversational insights, summaries, natural-language queries, anomaly explanations | 11 (primary) |
| **B. ML Forecasting** | Python FastAPI + Prophet / SARIMAX / FP-Growth | Demand forecasts, smart reorder levels, customer churn prediction | 11.5 (optional, needs ≥ 6 months of historical data) |

### 11.2 LLM Architecture

```
┌─────────────┐    ┌────────────────────────┐    ┌─────────────────┐
│ User / Web  │───▶│  Vizo.Api /ai/ask       │───▶│ LLM Provider    │
│ chat widget │    │                         │    │ (Gemini/OpenAI) │
└─────────────┘    │  1. Classify intent     │    └─────────┬───────┘
                   │  2. Load user scope     │              │
                   │  3. Load tool catalog   │              │
                   │     (~20 typed C# fns)  │              │
                   │  4. Build system prompt │              │
                   │  5. Send to LLM ────────┼──────────────┘
                   │  6. Receive tool call   │
                   │  7. Execute tool in DB  │
                   │  8. Feed result back    │
                   │  9. Render final answer │
                   │ 10. Log to llm_queries  │
                   └─────────────────────────┘
```

### 11.3 Guard Rails

1. **No raw SQL from the model.** The LLM is only allowed to emit **function calls** to a fixed catalog of typed C# tools. This catalog is small (~20 functions) and permission-scoped.
2. **Branch scoping enforced in the tool, not in the prompt.** Even if the LLM asks for "all branches", the tool reads the current user's scope and filters accordingly.
3. **No PII in prompts.** CNIC, full address, and phone numbers are never sent to the LLM.
4. **Every call audited.** `llm_queries` logs the question, tool calls, tokens, and cost. Flagged queries surface on a SuperAdmin review page.
5. **Financial numbers are authoritative from tools.** The LLM may phrase them, but never computes arithmetic on them.
6. **Daily token / cost cap** per user and per tenant. Soft warning at 80%, hard stop at 100%.

### 11.4 Example Tool Catalog

```csharp
[LLMTool("get_sales_summary")]
public async Task<SalesSummary> GetSalesSummary(
    [Description("ISO date")] DateOnly from,
    [Description("ISO date")] DateOnly to,
    [Description("Optional branch code")] string? branch = null) { ... }

[LLMTool("get_top_customers")]
public async Task<TopCustomers> GetTopCustomers(int days = 90, int limit = 20, string? branch = null) { ... }

[LLMTool("get_ar_aging")]
public async Task<ArAgingReport> GetArAging(string? branch = null, string? category = null) { ... }

[LLMTool("get_slow_moving")]
public async Task<SlowMovingReport> GetSlowMoving(int thresholdDays = 60, long? warehouseId = null) { ... }

[LLMTool("get_dead_stock")]
public async Task<DeadStockReport> GetDeadStock(int thresholdDays = 180) { ... }

[LLMTool("explain_variance")]
public async Task<VarianceExplanation> ExplainVariance(string metric, DateOnly from, DateOnly to) { ... }
```

### 11.5 User-Facing Use Cases

- "Which product sold the most in Karachi last month?"
- "Give me a one-paragraph summary of this month's P&L."
- "Who should I call today to collect overdue payments?"
- "Why did COGS jump in March?"
- "Show me customers I haven't sold to in 60 days."
- "Draft a polite payment reminder for invoice INV-KHI-26-0142."

### 11.6 Clarifying the LLM ↔ ML boundary

> **LLM is for insights and explanations** — it answers *what happened* and *why*, in plain language, grounded in current data. It never predicts the future.
>
> **ML forecasting** is for *what will happen* — demand forecasts, reorder levels, churn risk. Because it requires 6-12 months of quality history, it is deliberately deferred to Phase 11.5 and only switched on when justified by data volume and business need.

---

## 12. Immediate Next Steps (Recommended Kickoff)

1. **Confirm tech stack** (ASP.NET Core vs Node.js) — I recommend **ASP.NET Core 8** for accounting precision.
2. **Set up the monorepo** with empty `apps/api`, `apps/web`, `apps/mobile`.
3. **Scaffold database** with migrations for Phase 1 tables (identity, branches). ★
4. **Seed the permission catalog** (including all new v2.0 permissions) — this is the foundation everything else checks against.
5. **Build the auth flow end-to-end** (login, refresh, logout, user CRUD, role assignment, branch scoping) before touching any business feature.
6. **Get Umer to validate the COA structure** for VIZO's accounting needs before Phase 6 — customizing the chart of accounts after posting is very expensive.
7. **Confirm the branch list** (Karachi, Lahore, Islamabad, …) so invoice/PO/voucher numbering prefixes can be locked in before go-live. ★
8. **Decide credit-control default policy** per customer category: `WARN` or `BLOCK`? Sales and Accountant will disagree; align early. ★
9. **Select SMS gateway vendor(s)** and complete PTA sender-ID registration paperwork — this typically takes 2-3 weeks and is the critical path for Phase 10.5. ★
10. **Pick LLM provider** (Gemini vs OpenAI) and provision API keys under a budgeted project; decide whether customer data can leave Pakistan jurisdiction. ★
11. **Confirm mobile wallet merchant accounts** (Easypaisa, JazzCash) so Phase 7 can integrate real transaction-id reconciliation. ★
12. **Collect a master data sample** (products, parties, opening stock, open POs, open invoices) from VIZO's current system to drive realistic testing from day one.
13. **Agree on backup destination and retention** with Umer (MinIO on-prem + S3 offsite is the recommended default) and schedule the first restore drill for week 3. ★

---

*End of Document — VIZO ERP System Design v2.0*
*v2.0 adds Purchases, Credit Control, Invoices, Payment Methods, Multi-Branch Accounting, Advanced Returns, Unified Parties, Advanced Reporting, Mobile GPS/Visits, Backup & DR, SMS Integration and the LLM AI Assistant — ~3,200 lines of production-grade blueprint.*
