# AdvPOS — Daily Flow

Roz ka kaam kis tarteeb se chalta hai, aur har qadam par **kaun** kya karta hai aur **kaunsi screen** par.

Read `plan.md` for scope decisions, `context.md` for the stack.

---

## Ek nazar mein

```
SALES              ORDER DEPT             ACCOUNTANT            SUPER ADMIN
  │                    │                       │                     │
  ├─ Order lo ────────►│                       │                     │
  │                    ├─ Stock check          │                     │
  │                    ├─ Transfer + pack      │                     │
  │                    ├─ Invoice + delivery ─►│                     │
  │                    │                       ├─ Paisa receive      │
  │                    │                       ├─ COD settle         │
  │                    │                       ├─ Books update ─────►│
  └─ Status dekho ◄────┴───────────────────────┴──── Nazar rakho ────┘
```

**Sign in:** password sab ka `advpos1234`
`sales@advpos.pk` · `order@advpos.pk` · `accounts@advpos.pk` · `admin@advpos.pk`

---

## 1. SALES — order leta hai

**Kaun:** Zara Malik · **Location:** Shop 2

| # | Kaam | Screen | Banta kya hai |
|---|---|---|---|
| 1 | Customer chuno | Sales → Customer Orders → New | — |
| 2 | Balance aur limit dekho | usi screen ke header par | — |
| 3 | Items add karo | line grid | — |
| 4 | Save karo | | **ORD-26-0143** |
| 5 | Customer ko bhejo | "Share on WhatsApp" | formatted message |

**Sales ko kya dikhta hai:**
- Har item ka **live stock** — taake customer ko ghalat commitment na de
- Customer ka **current balance**, **per-invoice limit** aur **ledger limit**
- Apne saare orders ka live status

**Sales ko kya NAHI dikhta:**
- **Cost price** (`cost.view` permission nahi hai)
- Purchases, Money, Ledgers, Setup — sidebar mein ye options hain hi nahi

**Agar limit cross ho jaye:** order `Limit Cross` status ke saath ruk jata hai. Aage nahi badhta jab tak Accountant ya Super Admin approve na kare.

**Order ka status:** `Draft` → **`Sent to Order Dept`**

---

## 2. ORDER DEPARTMENT — maal tayyar karta hai

**Kaun:** Bilal Ahmed · **Location:** Order Department

| # | Kaam | Screen | Banta kya hai |
|---|---|---|---|
| 1 | Naya order dekho | Sales → Customer Orders | — |
| 2 | Stock check karo | Stock → Stock in Hand | — |
| 3 | Maal mangwao (agar zarurat ho) | Stock → Transfers → New | **TRF-26-3671** |
| 4 | Pack karo | order detail par | status `Packed` |
| 5 | Invoice banao | order detail → Invoice | **INV-26-8868** |
| 6 | Delivery book karo | Delivery → Book Delivery | **DLV-26-0218** |

**Stock in Hand** par teen columns hain — Warehouse, Order Department, Shop 2 — plus Total. Agar maal Warehouse mein hai aur bhejna Order Dept se hai, to pehle **Transfer** banega.

**Delivery book karte waqt:** courier chuno (TCS / Leopards / M&P / Trax / apna rider), tracking number daalo, aur agar COD hai to amount.

**Order ka status:** `Sent to Order Dept` → `Being Prepared` → `Packed` → `Invoiced` → **`Dispatched`**

---

## 3. ACCOUNTANT — paisa aur khaate

**Kaun:** Hassan Raza

| # | Kaam | Screen | Banta kya hai |
|---|---|---|---|
| 1 | Customer se paisa mila | Money → Money Received | **RV-26-0512** |
| 2 | Invoice ke saath jodo | usi voucher par | — |
| 3 | COD courier se aaya | Delivery → COD settled | — |
| 4 | Kharcha likho | Money → Expenses | **EXP-26-0025** |
| 5 | Supplier ko paisa diya | Money → Money Paid | **PV-26-0388** |
| 6 | Kuch aur adjust karna ho | Money → Manual Entries | **JV-26-0180** |

**Har entry ke baad khud ba khud update hota hai:**
Ledgers · Trial Balance · Income Statement · Balance Sheet · Recovery Report

**COD ka hisaab:** jo maal COD par gaya, uska paisa courier ke paas hota hai. Delivery screen par `COD with couriers` ka total dikhta hai. Jab courier settle karta hai, wo amount `COD with Couriers` account se nikal kar bank/cash mein aata hai.

**Accountant ko kya nahi milta:** stock ko haath lagana (transfers, corrections). Setup mein sirf Activity History dikhti hai.

---

## 4. SUPER ADMIN — sab par nazar

**Kaun:** Umer Memon

| Kaam | Screen |
|---|---|
| Limit cross wale orders approve karo | Sales → Limit Alerts |
| Kaun kitna deta hai, kitna purana | Reports → Recovery — Customers |
| Kya nahi bik raha | Reports → Not Selling / Slow Selling |
| Kis ne kya kiya | Setup → Activity History |
| Locations add/edit | Setup → Locations |
| Users aur roles | Setup → Users, Roles |
| Document numbering | Setup → Numbering |
| Courier list aur rates | Setup → Couriers |
| Backup | Setup → Backup & Restore |

Super Admin ko **sab kuch** dikhta hai — baaki teenon ka poora view plus Setup.

---

## Doosra flow — maal andar aana

Ye alag chain hai, Order Dept aur Accountant ke darmiyan:

| # | Kaun | Kaam | Screen | Banta kya hai |
|---|---|---|---|---|
| 1 | Order Dept | Kam stock dekha | Stock → Stock in Hand (Low) | — |
| 2 | Accountant | Supplier ko order | Purchases → Orders to Supplier | **PO-26-0062** |
| 3 | Order Dept | Maal aaya, receive kiya | Purchases → Stock Received | **GRN-26-0090** |
| 4 | Accountant | Supplier ka bill | Purchases → Purchase Invoices | **PI-26-2029** |
| 5 | Accountant | Supplier ko paisa | Money → Money Paid | **PV-26-0389** |

Stock **GRN par** barhta hai, purchase invoice par nahi — maal pehle aata hai, bill baad mein.

---

## Wapsi (returns)

| Kis taraf | Kaun | Screen | Banta kya hai |
|---|---|---|---|
| Customer se wapis | Order Dept | Sales → Sales Returns | **SR-26-0041** |
| Supplier ko wapis | Accountant | Purchases → Purchase Returns | **PR-26-0009** |

---

## Rozana ka naqsha

| Waqt | Kaun | Kya |
|---|---|---|
| Subah | Sales | Kal ke pending orders ka status dekho, customers ko call |
| Subah | Order Dept | Raat ke naye orders ki queue, low-stock list |
| Din bhar | Sales | Orders lena |
| Din bhar | Order Dept | Pack, invoice, delivery book |
| Shaam | Accountant | Din ki wasooli, kharche, COD settlements |
| Shaam | Super Admin | Recovery report, limit approvals |
| Hafte mein | Super Admin | Not-selling stock, activity history |

---

## Jo abhi nahi bana

- **Claims / warranty** — client se sawaal pending hain (`plan.md` §6.3). WARRANTY account maujood hai, module nahi.
- **Delivery screen draft hai** — asli courier process confirm hona baaki hai (`plan.md` §6.2). Screen par banner laga hua hai.
- **Order approval abhi manual hai** — status haath se badalta hai, koi automatic gate nahi.
- **Kuch bhi save nahi hota** — backend nahi hai, reload par sab reset.

---

## Demo dikhane ka sabse chhota rasta

1. `sales@advpos.pk` se sign in → Customer Orders → New → order banao
2. Top bar → "Viewing as" → **Order Department** → wahi order kholo → Stock in Hand dekho → Delivery book karo
3. "Viewing as" → **Accountant** → Money Received → Ledgers
4. "Viewing as" → **Super Admin** → Setup → Locations (nayi location add kar ke dikhao ke kuch fix nahi hai)

Har switch par sidebar badalta hai — yahi sab se saaf farq hai jo client ko dikhana chahiye.
