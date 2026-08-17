# Sales Portal — Final Plan

**Status: PART B built and verified.** Part A (delivery channels) is wired into the data
and settings; the Order Dept side of it comes next.

Scope: **Sales portal ko mukammal karna** (UI/UX final). Saath mein client ke delivery wale message ki decoding, jo aage Order Dept phase mein kaam aayegi.

Read `plan.md` for overall scope, `flow.md` for the daily chain.

---

## PART A — Client ke message se kya samajh aaya

Client ka sawaal ek hi hai: **"humein kaise pata chale ke maal pohanch gaya?"**

Aur jawab ye nikla ke maal chaar alag raston se jata hai, aur har raste par confirm karne wala banda alag hai. Yehi asal design hai.

### Chaar delivery channels

| # | Channel | Kaun bhejta hai | Kaun "Delivered" click karega | Kaise pata chalega |
|---|---|---|---|---|
| 1 | **Karachi — apni team** | Karachi ka stock, Karachi ka customer | **Karachi ka sales banda** | Usay baar baar pending ka signal/popup milta rahega jab tak click na kare |
| 2 | **Online** | PostEx ya koi aur courier | Jis ko order assign hua | **Auto behtar hai** — courier ke portal se khud delivered ho jaye |
| 3 | **Local cargo** | Pak International · Rehman Cargo · Mehran Railway Cargo | Sindh/Punjab handle karne wala banda | Customer se phone par confirm kar ke mark karega. **Har 24 ghante popup** |
| 4 | **Heavy — logistics** | Bhaari parcels | ❓ client ne humse poocha — jawab neeche | — |

### Cargo ka timer — client ne jo bataya

> "Aaj Monday bheja, tou Wednesday aur Thursday notice aayega ke mark to delivery karen. Aur agar delivered nahi hua tou 'pending / on its way' ya 'return' par click karen, reason daal dain."

Yaani:

```
Din 0  — maal bheja (Dispatched)
Din 2  — pehla reminder: "abhi tak delivered mark nahi hua"
Din 3  — dusra reminder
         har 24 ghante repeat, jab tak koi jawab na aaye

Teen jawab:
  ✅ Delivered              → khatam
  🚚 Abhi raaste mein hai   → timer reset, kal phir poocho
  ↩️ Wapis aa gaya          → reason likhna zaroori
```

Ye teen buttons har un-confirmed delivery par honge. `Delivered / Still on the way / Returned` — teesre par reason lazmi.

### Ek ahem baat jo client ne guzarte hue kahi

> "Portal bana kar diya hai un logon ne mujhe lekin use nahi kiya"

Courier ka portal maujood hai, use nahi hota. Iska matlab **auto-delivery aage chal kar mumkin hai** (API mil sakti hai), lekin **abhi bharosa manual par hi karna hoga**. Is liye design aisa ho ke manual pehle chale, aur auto baad mein sirf ek switch on karne se aa jaye — poora system dobara na banana pade.

### Heavy logistics — aap ne pucha, mera mashwara

**Manual rakhein, auto nahi.** Teen wajah:

1. **API hai hi nahi.** Online courier ka portal hota hai, goods transport ka nahi. Auto kis cheez se hoga? Koi source hi nahi.
2. **Sab se mehngi consignment yehi hoti hai.** Jahan ghalat "delivered" ka nuqsan sab se zyada hai, wahan andaza lagana sab se bura faisla hai.
3. **Bilty pehle se proof hai.** Heavy maal bilty par jata hai — receiving ki copy aati hai. Manual confirm karne wale ke paas kaghaz maujood hota hai, wo bas click karta hai.

**Lekin timer alag rakhein.** Cargo ka reminder 2 din baad shuru ho, heavy ka **4-5 din baad** — kyunki truck ko Karachi se Lahore pohanchne mein hi itna lagta hai. Har channel ka apna timer, Settings se badalne wala.

Aur ek cheez add karein: heavy par **bilty number** aur **transporter ka naam** lazmi ho. Wahi asli tracking hai.

---

## PART B — Sales portal ka final plan

### Guiding thought

Sales banda din bhar **do hi kaam** karta hai: order leta hai, aur paise ka peechha karta hai. Portal mein sirf yehi do cheezein saaf dikhni chahiye. Baaki sab shor hai.

### B1. Sidebar — final

```
Dashboard
Orders            ← "Customer Orders" se sirf "Orders"
Customers
Sales Summary
```

`Sales Trends` — **page aur nav dono delete**.

### B2. Dashboard — order-focused

**Hatana hai:**
- Revenue ka bada chart
- Sales by Location
- Top Products
- Cash Position
- Stock Alerts
- Daily Briefing banner

**Rakhna / banana hai:**

| Block | Kya dikhega |
|---|---|
| **4 counters** | Aaj ke orders · Order Dept ke paas pending · Raaste mein · **Aap ki confirmation ka intezaar** |
| **⚠️ Aap ke zimme** | Wo deliveries jinka reminder chal raha hai — teen button ke saath (Delivered / On the way / Returned) |
| **Recent orders + tracking** | Har order ka chhota status track: Draft → Sent → Packed → Dispatched → Delivered |
| **Paise** | Is mahine kitna collect kiya · kitna Accounts ne confirm kiya · kitna baqi hai |

### B3. Orders list

Status tabs upar: **All · Draft · Sent · In Progress · Dispatched · Delivered · Returned**

Har row par:
- Order no, customer, amount, date
- **Order status** pill
- **Payment status** pill — Unpaid / Part Paid / Paid (amount ke saath)
- Quick action button jo status ke hisaab se badle

### B4. Order detail — action buttons

Status ke hisaab se:

| Status | Buttons |
|---|---|
| **Draft** | Edit · **Send to Order Dept** · Delete |
| **Sent / In Progress** | Share on WhatsApp · Print · Cancel (reason ke saath) |
| **Dispatched** | **Delivered** · **Still on the way** · **Returned** (reason) |
| **Delivered** | **Record Payment** · Print · Share |
| Kisi bhi waqt | Record Payment (agar baqi hai) |

Plus: delivery channel ka card — kis raste se gaya, kis courier/cargo se, tracking/bilty number, kab bheja, kab tak pohanchna chahiye.

### B5. Record Payment — asal duniya wala tareeqa

Sales banda customer ke paas jata hai aur cash/cheque leta hai. Ye haqeeqat hai, ise mana nahi kar sakte. Lekin **ledger foran nahi hilna chahiye.**

```
Rep collect karta hai  →  "Awaiting Accounts"  →  Accountant confirm karta hai  →  Ledger update
```

**Kyun:** agar rep ki entry se customer ka balance foran kam ho jaye, to rep chaar din cash apne paas rakh sakta hai aur kaghaz par sab theek dikhega. Isi liye rep ki entry **pending** rehti hai. Rep ko credit foran mil jata hai (uska collection number barh jata hai), lekin khaate baad mein chalte hain.

**Dialog mein:**
- Amount
- Method — Cash · Cheque · Bank transfer · JazzCash/Easypaisa
- Cheque ho tou: cheque no, bank, date
- Kis invoice ke against (purani pehle, default) — ya "on account"
- Note
- Save → toast: *"Accounts ko bhej diya — confirm hone par khaate mein aayega"*

### B6. Customer Statement — print + WhatsApp

Rep customer ke paas jata hai paise mangne. Uske haath mein ye hona chahiye:

- Opening balance
- Tareekh ke hisaab se har invoice aur har payment, **running balance** ke saath
- Closing balance
- Neeche **kitna kitna purana hai**: 0–30 din · 31–60 · 61–90 · 90+
- **Print** button + **WhatsApp par bhejo** button

### B7. Credit limit — poora hatao

Sales ki nazar se limit ka koi zikr nahi rahega:
- Customer picker se limit/balance ka warning hatao
- Order form se "limit cross" ka alert hatao
- Nav se Limit Alerts pehle hi gaya hua hai

Limit ka faisla Accounts ka hai, aur Order Dept ko dikhega. Rep ko us se koi lena dena nahi.

---

## PART C — Kaam ki tarteeb

| # | Kaam | Nayi files |
|---|---|---|
| 1 | Delivery channels + cargo companies settings mein | `settings.ts` |
| 2 | Order data mein: payment status, delivery channel, confirmation timer | `sales.ts` |
| 3 | Collections data (rep ki pending entries) | `collections.ts` |
| 4 | `Sales Trends` page + nav delete | — |
| 5 | Sidebar: "Customer Orders" → "Orders" | `nav-config.ts` |
| 6 | Sales dashboard — naya, order-focused | `dashboard/page.tsx` |
| 7 | Orders list — status tabs + payment pill | `sales/orders/page.tsx` |
| 8 | Order detail — action buttons + delivery card | `sales/orders/[id]/page.tsx` |
| 9 | Record Payment dialog (pending flow) | `record-collection-dialog.tsx` |
| 10 | Customer statement — print + share | `parties/[id]/statement/page.tsx` |
| 11 | Credit limit ka har nishan sales se hatao | order form, pickers |

### Kya ban gaya

| Kaam | Kahan |
|---|---|
| Delivery channels + timers | `data/settings.ts` |
| Order par payment + delivery fields | `data/sales.ts` |
| Rep ki collections (pending flow) | `data/collections.ts` |
| Sales Trends page + nav | **deleted** |
| Sidebar "Orders" | `lib/nav-config.ts` |
| Order-focused dashboard | `components/dashboards/sales-dashboard.tsx` |
| Orders list — 7 stage tabs + payment pill | `sales/orders/page.tsx` |
| Delivery card (3 confirm buttons) | `components/widgets/order-delivery-card.tsx` |
| Payment card (paid / due / receipts) | `components/widgets/order-payment-card.tsx` |
| Record Collection dialog | `components/dialogs/record-collection-dialog.tsx` |
| Customer statement — print + WhatsApp + aging | `parties/[id]/statement/page.tsx` |
| Credit limit hataya | customers list, party form, order detail |

Build clean (79 pages), `tsc` clean, ESLint **9 errors** — pehle 18 the, kyunki
raaste mein `rules-of-hooks` ke 6 asli bugs bhi theek ho gaye.

---

## Team ka dhaancha — confirm ho gaya

> Sales ek hi role hai. Sales team **poore mulk mein** phaili hai. Warehouse, Order Dept aur Accounts **sab Karachi se** chalte hain.

Yaani Karachi wala bhi ek aam sales banda hai — bas farq ye hai ke uske shehar ka maal wo khud haath se pohanchata hai, is liye "Delivered" bhi wahi click karta hai. Baqi shehron ke rep ka maal cargo ya courier se jata hai, aur us ki confirmation Karachi ka back-office banda karta hai.

**Delivery confirm karne ka haq channel se aata hai, banday se nahi:**

| Channel | Confirm kaun karega |
|---|---|
| Karachi local | **Us order ka apna sales rep** — usi ne pohanchaya hai |
| Online courier | Back office (Order Dept) — aage chal kar auto |
| Local cargo | Karachi ka cargo handler |
| Heavy logistics | Karachi ka cargo handler |

Rep ko **apne saare orders ka status hamesha dikhega** (chahe confirmation uske haath mein na ho), taake wo customer ko jawab de sake. Buttons sirf wahan milenge jahan zimmedari uski hai.

Is se role ka dhaancha nahi badla — **Sales ab bhi ek hi role hai.** Rep ke record par sirf ek `territory` field add hogi (Karachi / Lahore / Multan …), taake pata chale kis ka maal local hai.

---

## Jo abhi bhi client se poochna hai

1. **Online orders kaun leta hai?** Website se aate hain ya koi banda daalta hai?
2. **PostEx ke ilawa aur kaun se online courier?**
3. **Cargo ki list mukammal hai?** (Pak International, Rehman Cargo, Mehran Railway Cargo)
4. **Reminder kis ko jaye** — sirf zimmedar banday ko, ya 3 din baad uske upar wale ko bhi?
5. **Rep "customer kehta hai nahi mila" report kar sake?** Doosre shehar ka rep sab se pehle jaanta hai — usay flag karne ka button dena chahiye?
