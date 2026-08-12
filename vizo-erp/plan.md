# AdvPOS — Final Phase Plan (Client Fit)

Status: **Phases 1–9 built. Claims (10) blocked; Logistics (11) shipped as a draft.**
Written: 2026-08-12 · Revised 2026-08-13 after the 2nd screenshot batch and the first build pass.
Read `context.md` for stack/conventions, `handoff.md` for current state.

---

## 0. Scope aur guiding principles

Client abhi **CSD Program Manager** (FoxPro-era accounting app) use kar raha hai. Screenshots sirf **fields ke reference** ke liye hain — UI bilkul modern hogi, purani jaisi nahi.

Ye phase ka output: **final, click-through mockup** (frontend prototype). Backend baad mein.

**Principles:**

1. **Kuch bhi hardcode nahi.** Locations, account types, categories, document prefixes, roles, FY start, company info — sab Settings se aayen. Aaj 3 locations hain, kal 6 ho sakti hain. Code mein koi literal list nahi.
2. **Subtract before you add.** Jo screen client use nahi karega, delete.
3. **Client ki zabaan bolo.** Terms wahi jo wo bolta hai.
4. **Keyboard-first.** Purane user F-keys aur Enter par udte hain. Ye optional feature nahi, requirement hai.
5. **Accountant ko jargon do, baaki sab ko plain language.**

---

## 1. Locked decisions

| # | Decision | Impact |
|---|---|---|
| 1 | **1 branch only** | Branch module delete, branch selector har jagah se nikle |
| 2 | **Warehouse → Locations** | `LOC-01`, `LOC-02`, `LOC-03` — **Settings se add/edit/delete** |
| 3 | Transfers = Warehouse ↔ Order Dept ↔ Shop-2 | Location-to-location, hardcoded pairs nahi |
| 4 | **SMS system remove** | Notifications module delete, invoice se SMS buttons hatao |
| 5 | **Brands remove** | ⚠️ **Ek sawaal pehle** — section 6.1 dekho, ye simple nahi hai |
| 6 | **LLM usage remove** | `admin/llm-usage` delete |
| 7 | **4 roles** | Super Admin, Accountant, Order Dept, Sales |
| 8 | **Chain: Sales → Order Dept → Accountant** | Order approval workflow |
| 9 | **Terms simplify** | Void → Delete, poori dictionary section 4 |
| 10 | **Data dummy hai — migration baad mein** | Ab risk nahi, blocker nahi |
| 11 | **Print = standard modern format** | Client ka purana format match karne ki zaroorat nahi |
| 12 | **Keyboard-first entry — CONFIRMED** | Phase 9 → ab core scope |
| 13 | **Sab kuch configurable** | Principle #1 |

---

## 2. Naya data model — screenshots se nikla

### 2.1 Account types (Accounts Manager dropdown ki poori list)

Ye exact taxonomy hai jo client abhi use kar raha hai. Current app ka CoA isse match nahi karta — karna padega.

| Group | Types |
|---|---|
| **Assets** | Assets, Current Assets, Cash & Bank, Inventory, Acc Receivables, Fixed Assets |
| **Capital** | Capital, Owners Profit & Loss |
| **Expenses** | Expenses |
| **Liabilities** | Liabilities, Current Liabilities, Acc Payables, Fixed Liabilities |
| **Revenue** | Revenue |

**Account code prefix type se aata hai:**

| Prefix | Type | Example |
|---|---|---|
| `ACR` | Acc Receivables | `ACR01178` — customer |
| `E` | Expenses | `E0000005` |
| `R` | Revenue | `R0000004` — SALE |

→ Prefix scheme bhi **Settings se configurable** hona chahiye, hardcoded nahi. 1,504 accounts hain.

**Account fields:** A/c Type · A/c Code · A/c Name · **B/F Date** · **B/F Amount** (opening balance) · $ rate · Telephone

### 2.2 Product master (Stock Manager)

Current app ka product model kaafi chhota hai. Ye fields chahiye:

| Field | Note |
|---|---|
| Category | dropdown — ACCESSORIES etc. |
| Brand | ⚠️ section 6.1 |
| **Code / Serial** | `05050906` — item code |
| **BarCode / ShortName** | plus ek **alag grid** jisme multiple barcodes per item |
| Description | `VIZO CLAMP V6000 CHARGER 2026` |
| **B/F Qty** | opening stock |
| **Packing** | pieces per packet |
| **Pkt Qty** | packet count |
| **MIN Qty** | reorder level → low-stock alert |
| **MAX Qty** | over-stock ceiling |
| **Op. Cost** | opening cost |
| **Cost** | current cost |
| **Retail** | sale price |

**Per-location stock grid** — har item ke saamne har location ki row: `OpQty · QtyIn · QtyOut · StockIn · StockOut`. Ye seedha hamare stock-levels page ka design hai.

### 2.3 Expense accounts — do cheezein confirm ho gayin

Expenses Ledger mein ye accounts mile:

- **`WARRANTY` — 1,313,558** → **Claim/warranty system pakka chahiye.** Ab ye "shayad" nahi raha.
- **`COMMITION DEALERS` — 2,988,663** → Dealer/salesman commission real hai. Sales role ke liye commission tracking chahiye.
- `DISCOUNT LOSS` — discount ko expense treat karte hain
- `SHOP 2 EXP` — Shop-2 location confirm
- Baaki: RENT, SALARY, FOOD EXP, TRAVLING, MARKETING, REPARING, PERSONAL, TRUST ACCOUNT

### 2.4 Negative stock allowed hai

Stock Ledger mein: `I10 VIZO BATTARY` qty **-1**, `KEYCHAIN GIFTING` qty **-975**.

Legacy negative stock rokta nahi. Faisla chahiye — aur ye **Settings toggle** hona chahiye:
`[ ] Stock se zyada bechne par rokein` / `[✓] Warning dikhayein lekin rokein nahi`

---

## 3. Route disposition

99 routes → target **~60**.

### 3.1 DELETE (confirmed)

```
(app)/admin/llm-usage
(app)/admin/branches + /[id] + /new
(app)/notifications/sms + /[id]
(app)/notifications/gateways
(app)/notifications/templates
(app)/inventory/brands          ← section 6.1 ke jawab ke baad
```

### 3.2 DELETE / MERGE (recommend — confirm karna hai)

| Route | Kyun | |
|---|---|---|
| `ai-assistant` | Mock chat, "LLM wagera hatao" | ❓ |
| `inventory/uom` | UoM ki jagah product par `Packing` field | ➡️ |
| `accounting/cash-flow` | Legacy ke 4 statements mein nahi | ❓ |
| `accounting/reconciliation` | Legacy mein nahi dikhta | ❓ |
| `zakat/*` | Legacy mein nahi + abhi **toota hua** (`/zakat` = 404) | ❓ |
| `parties/visits` | Sales role ke liye rakhein ya delete | ❓ |
| `profile/sessions` | `profile/security` mein merge | ➡️ |

### 3.3 BIG CONSOLIDATION — ek Ledger screen, paanch nahi

Legacy mein Assets/Expenses/Liabilities/Revenue/Capital/Stock **saare Ledger Summary ek hi screen hain**, sirf `SEL TYP:` dropdown badalta hai. Same columns, same search, same buttons.

→ Hamare paas bhi **ek** `accounting/ledgers` page ho: type filter + search + `[ ] Zero-balance accounts dikhayein` toggle. Paanch alag pages banane ki zaroorat nahi.

Ye toggle bhi carry karna hai — 1,504 accounts mein se zyadatar zero hain, unhe chhupana asli feature hai.

### 3.4 RENAME / REPURPOSE

| Abhi | Naya |
|---|---|
| `inventory/warehouses` | `setup/locations` |
| `parties` (unified) | `customers` + `suppliers` alag |
| `purchases/grns` | `purchases/received` |
| `accounting/coa` | `accounting/accounts` |
| `accounting/journal-entries` | `accounting/manual-entries` |
| `inventory/adjustments` | `inventory/corrections` |
| `inventory/movements` | `inventory/history` |
| `sales/credit-holds` | `sales/limit-alerts` |
| `admin/audit-log` | `setup/activity` |
| `accounting/period-close` | `accounting/year-end` |

### 3.5 NEW

| Module | Status |
|---|---|
| **Claims** | ✅ Confirmed (WARRANTY account mil gaya) — details section 6.3 |
| **Delivery / Logistics** | ❌ Blocked — section 6.2 |
| **Order queue (Order Dept)** | ✅ |
| **Mobile order entry (Sales)** | ✅ |
| **Settings → Locations / Account Types / Prefixes** | ✅ Principle #1 |

---

## 4. Terminology dictionary

**Rule:** Sales/Order Dept screens par plain language. Accountant/Admin par standard terms.

| Abhi | Naya |
|---|---|
| Void | **Delete** |
| Post / Posting | **Confirm** |
| Unpost / Reverse | **Undo Confirm** |
| GRN | **Stock Received** |
| Journal Entry / Voucher | **Manual Entry** |
| Chart of Accounts | **Account List** |
| Aging / Aged Trial Balance | **Recovery Report** |
| Reconciliation | **Bank Matching** |
| Period Close | **Year End** |
| Debit Note | **Purchase Return** |
| Credit Note | **Sales Return** |
| UoM | **Packing** |
| Adjustment | **Stock Correction** |
| Stock Movement | **Stock History** |
| Party | **Customer** / **Supplier** |
| Payable | **We Owe** |
| Receivable | **They Owe** |
| Credit Hold | **Limit Cross** |
| Purchase Order | **Order to Supplier** |
| Sales Order | **Customer Order** |
| Receipt Voucher | **Money Received** |
| Payment Voucher | **Money Paid** |
| Dead Stock | **Not Selling** |
| Slow Moving | **Slow Selling** |
| Audit Log | **Activity History** |
| SKU | **Item Code** |
| Warehouse / Branch | **Location** |
| B/F | **Opening** (Opening Balance / Opening Stock) |
| Zeroed / Non-Zeroed | **Zero-balance accounts chhupayein** |

**Rakho jaise hain:** Trial Balance, Balance Sheet, Ledger, Expense, Invoice, Transfer, Income Statement.
Plus har jargon term par chhota `ⓘ` tooltip.

---

## 5. Roles aur workflow

### 5.1 Chain

```
SALES                ORDER DEPT              ACCOUNTANT
  ├─ Customer order ─►│                      │
  │                   ├─ Stock check         │
  │                   ├─ Pack / Transfer     │
  │                   ├─ Invoice ───────────►│
  │                   │                      ├─ Payment receive
  └─ Status dekhe ◄───┴──────────────────────┴─ Ledger post
```

### 5.2 Permission matrix

| Action | Super Admin | Accountant | Order Dept | Sales |
|---|:---:|:---:|:---:|:---:|
| Customer order banana | ✅ | — | ✅ | ✅ |
| Order approve / pack | ✅ | — | ✅ | — |
| Sale invoice | ✅ | ✅ | ✅ | — |
| Purchase invoice | ✅ | ✅ | — | — |
| Stock received | ✅ | — | ✅ | — |
| Transfers | ✅ | — | ✅ | — |
| Stock correction | ✅ | — | ✅ | — |
| Money received / paid | ✅ | ✅ | — | — |
| Manual entry | ✅ | ✅ | — | — |
| Ledgers, TB, P&L, BS | ✅ | ✅ | — | — |
| **Cost price dekhna** | ✅ | ✅ | ✅ | ❌ |
| Customer balance | ✅ | ✅ | ✅ | ✅ own |
| Credit limit set | ✅ | ✅ | — | — |
| Claims process | ✅ | ✅ | ✅ | ➕ raise only |
| Users / Settings / Backup | ✅ | — | — | — |
| Delete | ✅ | ✅ own | ❌ | ❌ |

Matrix **data-driven** hoga — ek config object, na ke code mein bikhre `if (role === "sales")`.

### 5.3 Role-specific dashboard

- **Sales** → mere aaj ke orders, pending status, mere customers ke balances, **meri commission**
- **Order Dept** → naye orders ki queue, packing pending, low stock (MIN Qty se neeche), aaj ke transfers, pending claims
- **Accountant** → aaj ki receipts/payments, unconfirmed vouchers, overdue recovery, cash/bank position
- **Super Admin** → sab kuch

Sidebar role-filtered — disabled nahi, **gayab**.

---

## 6. Open questions

### 6.1 ⚠️ "Brand" ka masla — ye simple delete nahi hai

Aap ne kaha brands hata do kyunki ek hi brand hai. Lekin Stock Manager ke dropdown mein brand values ye hain:

```
01 SAMSUNG   02 MOTOROLA   03 L.G   04 I PHONE   05 CHINA
```

Ye **product brand nahi hai** — ye **phone compatibility** hai (accessory kis phone ke liye hai). Saara maal VIZO ka apna hai, isliye client kehta hai "ek hi brand".

Aur item code isi se bana lagta hai: `05050906` ka `05` = CHINA.

> **Client se poochein:** Kya customer poochta hai "Samsung wala charger hai?" / "iPhone ka cable?" — yaani kya aap ko item ko **phone ke hisaab se filter** karna hota hai?
>
> - **Agar HAAN** → field delete mat karo, **rename** karo: "Brand" → **"Compatible With"** ya **"Model"**
> - **Agar NAHI** → delete kar do, lekin item code ka `05` prefix scheme bhi tootega — naya coding scheme decide karna hoga

### 6.2 Logistics — ye sawaal client ko bhejein

Legacy purchase invoice par `CHRG:` field hai → freight/labour charge.

> 1. Maal customer tak kaise jata hai — apna rider/gaari, courier (TCS/Leopards/M&P/Trax), bus cargo, ya customer khud uthata hai?
> 2. Courier hai tou tracking number software mein save karna hai? Invoice par print ho?
> 3. Delivery charge kaun bharta hai — aap ya customer? Invoice mein add ya alag?
> 4. **COD** hota hai? Courier se paisa kab milta hai, aur "kitna COD bheja / kitna wapis aaya" ka hisaab chahiye?
> 5. Ek gaari mein kai invoices jaate hain? **"Delivery Run / Load Sheet"** chahiye (10-15 invoices, driver ka naam, wapsi par tick)?
> 6. **Bilty** number record karna hai?
> 7. Delivery proof chahiye — signature ya photo?
> 8. Return pickup kaise hota hai?
> 9. Out-of-city customers ka process alag hai?

### 6.3 Claims — ab confirmed, sirf details chahiye

`WARRANTY` expense account (13 lakh) mil gaya, tou module pakka banega. Sirf design details chahiye:

> 1. Warranty claim hai (kharab piece replacement) ya damage/shortage bhi?
> 2. Customer ko **turant naya** dete hain ya company se replacement ka wait?
> 3. **Kharab maal alag jagah rakhte hain?** → agar haan tou ek aur location: `LOC-04 Claim Stock`
> 4. Company/supplier ko claim bhejte hain? Record chahiye — bheje / wapis aaye / reject / pending?
> 5. Time limit? (7 din / 1 mahina / 6 mahine)
> 6. Paisa wapis ya sirf replacement?
> 7. **Claim wala maal sellable stock mein count hota hai ya nahi?** (critical)
> 8. Claim par customer ka ledger adjust hota hai?
> 9. Serial/IMEI se track hota hai?

**Assumed design jab tak jawab na aaye:**
```
Claim In (customer se) → Claim Stock location
   ├─ Option A: turant replacement issue
   └─ Option B: Claim Out (supplier ko) → Pending → Received / Rejected
Accounting: WARRANTY expense account hit
```

### 6.4 Baaki confirms

| # | Cheez | Sawaal |
|---|---|---|
| 1 | **Dollar rate `$: 1.00`** | Purchases USD mein hoti hain? Conversion chahiye? |
| 2 | **SERIAL dropdown** (sale invoice) | IMEI tracking hai ya invoice series (A/B/C)? |
| 3 | **INV LIMIT vs LEDGER LIMIT** | Do alag limits — per-invoice cap + total balance cap. Confirm? |
| 4 | **Multiple barcodes per item** | Stock Manager mein alag barcode grid tha — ek item ke kai barcode hote hain? |
| 5 | **Op. Cost vs Cost vs Retail** | Teen price. Retail ke ilawa wholesale/dealer rate bhi hai? |
| 6 | **Negative stock** | Rokein ya warning? (Settings toggle propose kiya) |
| 7 | **FY Oct–Sep** | Report defaults isi par? Confirm |
| 8 | **Account codes visible** | `ACR01178` UI mein dikhta rahe? (recommend: haan) |
| 9 | **Auto Insert / No History** checkboxes | Ye kya karte hain? |
| 10 | **MIN/MAX Qty alerts** | Low stock alert MIN Qty par? MAX ka kya use hai? |

---

## 7. Keyboard-first design (confirmed scope)

Legacy users mouse ko haath nahi lagate. Ye poori tarah build hoga:

**Line-item grid (invoice / transfer / voucher):**
| Key | Action |
|---|---|
| `Enter` | Agle cell par |
| `Tab` / `Shift+Tab` | Next / previous field |
| `↓` on last row | Nayi row insert |
| `Ctrl+D` | Row delete |
| `Esc` | Cancel edit |
| Item code type karo | Instant search dropdown, `Enter` = select |

**Global shortcuts** (legacy toolbar ke barabar — `First / Prev / Next / Last / Insert / Edit / Delete / Post / List / Print / Exit`):

| Key | Action |
|---|---|
| `F2` | Save & Confirm (Post) |
| `F3` | Search |
| `F4` | Nayi entry (Insert) |
| `F5` | Refresh |
| `F9` | Print |
| `Esc` | Exit / back |
| `Ctrl+←` / `Ctrl+→` | Pichla / agla record — **detail page par record navigation** |
| `Ctrl+K` | Command palette (pehle se maujood) |

Har screen par ek `?` shortcut sheet. Detail page header mein prev/next record arrows — muscle memory bachegi.

---

## 8. Settings — "kuch bhi fix nahi" wala hissa

Naya `setup/` section, sab kuch yahan se control:

| Setting | Abhi ki value | Editable |
|---|---|---|
| **Locations** | `LOC-01` Warehouse · `LOC-02` Order Dept · `LOC-03` Shop 2 | ✅ add / edit / delete |
| **Account types** | Section 2.1 ki 14 types | ✅ |
| **Code prefixes** | ACR / E / R … | ✅ |
| **Document prefixes** | INV / PI / TRF / JV … | ✅ |
| **Categories** | ACCESSORIES … | ✅ (page maujood) |
| **Compatibility / Model** | Samsung, Motorola, LG, iPhone, China | ✅ (6.1 ke baad) |
| **Financial year start** | October | ✅ |
| **Currency + $ rate** | PKR, 1.00 | ✅ |
| **Negative stock** | warning / block | ✅ |
| **Roles & permissions** | 4 roles | ✅ matrix editable |
| **Company info** | naam, address, NTN, logo | ✅ (print header) |

Code mein koi hardcoded array nahi — sab `src/data/settings.ts` se, aur UI se editable (mock state).

---

## 9. WhatsApp se andar laana

Abhi: Sales WhatsApp par order leta hai → WhatsApp par Order Dept ko bhejta hai → Order Dept manually enter karta hai. Teen jagah, koi record nahi.

**WhatsApp se ladna nahi, replace karna:**

1. **Mobile-first order screen (Sales)** — bada search (naam ya code), qty stepper, customer picker jismein balance + limit dikhe. Phone par ek haath se chale.
2. **Live stock visibility** — Sales ko qty dikhe (cost nahi), taake ghalat commitment na de.
3. **Order status timeline** — Placed → Order Dept ne dekha → Packed → Invoiced → Dispatched → Delivered → Paid. "Bhai order ka kya bana?" wali call khatam.
4. **"Share on WhatsApp"** — order/invoice ka formatted text ya PDF, ek click. Client ki aadat support karo. **SMS ka behtar replacement — aur muft.**
5. **In-app bell** — "Naya order aaya", "Order approve hua", "Payment mila".

---

## 10. Execution phases — where we are

| Phase | Kaam | Status |
|---|---|---|
| **1 — Strip** | LLM usage, notifications (4), branches (3), UoM, AI assistant, profile/sessions deleted | ✅ done |
| **2 — Settings foundation** | `src/data/settings.ts` — locations, account types, prefixes, document series, couriers, roles, policies, shortcuts | ✅ done |
| **3 — Locations** | Branch concept gone from data model. Warehouse → Location everywhere. ReportToolbar filters by location. Stock in Hand shows a column per location | ✅ done |
| **4 — Terminology** | `src/lib/labels.ts` — statuses, payment methods, glossary. Void → Delete. Nav relabelled | ✅ done |
| **5 — Ledger consolidation** | 5 ledger screens → one `/accounting/ledgers` with type filter + hide-zero toggle | ✅ done |
| **6 — Data model** | Chart of accounts rebuilt on the client's real account list. Items got packing / min / max / opening cost. Brand kept | ✅ done |
| **7 — Roles** | 4 roles, permission matrix in settings, role-filtered sidebar, role switcher in the top bar | ✅ done |
| **8 — Keyboard** | Shortcut map in settings + `?` sheet. Grid-level key handling still to wire per screen | 🟡 partial |
| **9 — WhatsApp** | SMS module replaced by `WhatsAppShareDialog` on orders and invoices | ✅ done |
| **10 — Claims** | Not started | ❌ **needs §6.3 answers** |
| **11 — Logistics** | `/delivery` + `/admin/couriers` built as a **draft** on the standard courier flow, banner asking for correction | 🟡 draft |
| **12 — Polish** | Lint down to 15 errors (below the 18 baseline). Print layouts still default | 🟡 partial |

### Still open

- **Per-screen keyboard handling** — the shortcut sheet documents F2/F3/F4/Enter-to-next-cell; the line-item grids do not implement them yet.
- **Cost-price hiding for Sales** — `cost.view` exists in the matrix but the stock screens don't gate on it yet.
- **Claims** — blocked.
- **Delivery** — needs the client's real process before it stops being a guess.

## 11. Risks

1. **Speed regression** — Legacy FoxPro data entry web se tez hai. Order Dept isay foran mehsoos karega. Phase 8 (keyboard) skip nahi ho sakta.
2. **Scope from logistics** — Abhi ek lafz hai. 6.2 ke jawab tak estimate nahi ho sakta.
3. **Brand ka faisla** (6.1) — agar "Compatible With" chahiye tou item coding scheme bhi affect hoti hai.
4. **Settings-driven sab kuch** — thoda extra kaam upfront, lekin baad mein har cheez badalna asaan. Ye trade-off jaan-boojh kar liya hai.
5. **No backend** — ye poora plan frontend mockup ka hai. Real deployment alag faisla.

~~Data migration~~ — dummy data hai, baad mein.
~~Print format~~ — standard modern layout kaafi hai.

---

## 12. Next step

1. **6.1 (brand)** ka jawab lo — ye sabse quick aur sabse zyada asar wala hai
2. **6.2 (logistics)** + **6.3 (claims)** ke sawaal client ko bhejo
3. **6.4** ke 10 confirms lo
4. Jawab ke intezaar mein **Phase 1, 2, 4** chal sakte hain
