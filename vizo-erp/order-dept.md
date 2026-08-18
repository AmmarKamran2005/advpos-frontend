# Order Department Portal

Read `plan.md` for overall scope, `flow.md` for the daily chain, `sales-portal.md`
for the sales side and the delivery-channel decoding.

**Status: built.** Claims, reminders, counter sale, the work-queue dashboard,
packing and dispatch are all in. Claim-out batching is the remaining piece.

---

## Client ke jawab — jo naya pata chala

### 1. Order Dept khud bhi bech sakta hai

> "G order depart say direct cash ya credit sales ho sakti hay"

Matlab har sale sales rep ke zariye nahi aati. Koi dukaandar seedha office aa jata
hai ya phone kar deta hai. Is liye **Counter Sale** ka alag screen bana:
item add karo, Cash/Bank/Wallet/Credit chuno, paisa lo, invoice. Sales rep beech
mein nahi.

**Ek control jo maine daala:** walk-in customer par **Credit ka button band** hai.
Jiska koi khaata hi nahi, uske naam udhaar kaise chadhega? Credit ke liye pehle
shop ka account chunna padega.

### 2. Claims — "humari business ki backbone"

> "Claim department ka stock tu update hoga lakin usko rakhna humy claim depart k
> stock may hay aur hum pending work aur problems ko notifications aur reminder par
> rakhain gay taky staff ka kaam unko remind khud software he karwa day"

Do alag baatein hain, dono ban gayin:

**Alag stock** — `LOC-04 Claim Stock` naya location hai, `excludeFromSellable: true`.
Kharab maal ka hisaab poora rehta hai, lekin shelf ke sellable figure mein kabhi
nahi ginta. Warna aap wo cheez bech dete jo tooti hui hai.

**Software khud yaad dilaye** — `data/reminders.ts`. Reminders **kahin save nahi
hote**, tareekhon se khud nikalte hain:

| Kis cheez par | Kab shuru | Kis ko |
|---|---|---|
| Claim shelf par para hai, supplier ko nahi gaya | 3 din | Order Dept |
| Supplier ne 14 din se jawab nahi diya | 14 din | Order Dept |
| Delivery confirm nahi hui | channel ka timer | Rep ya Order Dept |
| Order pack nahi hua | 1 din | Order Dept |

Kaam khatam karo, row khud ghayab. Na koi tick karna, na kuch purana pada rehna.

### 3. Customer portal — mobile number hi ID

> "usko apna mobile number dalna zarori hay jo uska id hoga… agar hum sales k larky
> ko nikal dety hain tu us sales person ko offline ya holiday mode par kardain gay"

Ye abhi **nahi bana** — pehle andar ka system mukammal hona chahiye. Lekin design
mein jagah rakhi hai. Do baatein note kar li hain:

- Customer ka **mobile = login ID**, simple generated password
- Rep nikal jaye tou uska account **offline/holiday mode** — uske customers company
  ke seedhe khaate mein chale jate hain, aur uski commission ka hisaab us tareekh
  par band ho jata hai

### 4. Ledger WhatsApp par — accounts wale ke 3-4 din bachane hain

> "Webpush say log apna ladger nhi dekh sakain gay, log local market k bhtt he alsi
> type k log hain… Humara accounts ka larka 3 4 din laga deta hay is kam may"

Bilkul sahi baat hai — dukaandar portal khol kar ledger nahi dekhega. Statement
usi ke paas jana chahiye jahan wo pehle se hai: **WhatsApp**.

Statement page par ab: **Print / Save PDF** aur **WhatsApp**. Message mein wahi
teen cheezein jo unhone maangi thin —

```
Last order: 13 Aug 2026
Last payment: 09 Aug 2026

Aap ki aakhri adaigi ko 6 din ho gaye hain.
Baraye meharbani adaigi karwa dein.

PKR 45,000 90 din se zyada purana hai.
```

Text edit ho sakta hai bhejne se pehle, ya bilkul hata bhi sakte hain.

---

## Claims par mere mashware — jo unhone maange the

> "apko agar koi acha better idea ho tu batain"

Claim desk ko sirf kharch ka khaata na banayein. Us mein do numbers chhupe hain jo
**kharidari ka faisla** badal dete hain. Dono bana diye:

### 1. Supplier kaisa settle karta hai

Har supplier ke saamne: kitne claim bheje, kitne refuse hue, **kitne percent
honour kiye**, aur **jawab dene mein average kitne din**.

Abhi ke data par hi farq saaf hai — ek supplier 100% honour karta hai, doosra 0%.
**Ye number purchase order banate waqt saamne hona chahiye.** Jo supplier sasta hai
lekin aadhe claim refuse karta hai, wo sasta nahi hai.

### 2. Kaunsi cheez sab se zyada wapis aati hai

Har item ka claim record — kitni baar, kitne pieces, kitne ka nuqsan.

**Ye sab se ahem number hai.** Jo line achhi bikti hai lekin 8% wapis aati hai, wo
chup chaap paisa kha rahi hai. Ye pata chalte hi wo line kharidna band ho jati hai.
Isi se claim desk kharch ka khaata nahi rehta — kharidari ki aqal ban jata hai.

### 3. Claim detail par: "ye cheez pehle bhi aa chuki hai"

Har claim ke neeche usi item ke purane claim dikhte hain. Agar teesri baar wahi
battery aa rahi hai, tou masla us piece ka nahi — us line ka hai.

### Do aur idea, abhi nahi banaye

- **Customer ka claim pattern** — jo dukaandar औsat se bohot zyada claim kare, wo
  apna purana kharab maal shayad aap ke through badal raha hai. Flag karne layak hai.
- **Claim par photo** — jo reasons supplier aam taur par refuse karta hai (damaged,
  burnt), un par bhejte waqt tasveer lazmi ho. Abhi screen par warning aa jati hai.

---

## Kya bana

| Cheez | Kahan |
|---|---|
| Claim Stock location (sellable se bahar) | `data/settings.ts` |
| Claim reasons + policy (window, timers, write-off account) | `data/settings.ts` |
| Claims data + supplier scorecard + worst items | `data/claims.ts` |
| Reminders — tareekhon se derive hote hain | `data/reminders.ts` |
| Claims list — 4 stat cards, scorecard, worst items, 6 tabs | `claims/page.tsx` |
| Claim detail — progress, settle actions, same-item history | `claims/[id]/page.tsx` |
| Receive Claim dialog | `dialogs/claim-in-dialog.tsx` |
| Reminder list widget | `widgets/reminder-list.tsx` |
| Order Dept dashboard — work queue | `dashboards/order-dept-dashboard.tsx` |
| Counter Sale | `sales/direct/page.tsx` |
| Statement: last order/payment + reminder text | `parties/[id]/statement/page.tsx` |
| Packing bench — pick list, short lines, packet counts | `packing/page.tsx` |
| Dispatch — route, carrier, tracking/bilty | `dispatch/page.tsx` |
| Per-location stock + deterministic order lines | `data/products.ts`, `data/sales.ts` |

### Packing

Queue on the left, the order being packed on the right. The line that matters is
the **short** one: jab shelf poora cover na kar sake, line par hi likh deta hai
kitna kam hai **aur baqi kis location par para hai** — "Warehouse: 6 · Shop 2: 2".
Wahin se Move Stock ka button hai.

Packet ke hisaab se bhi dikhata hai (`3 pkt + 4`), kyunki bande dabbe ginte hain,
pieces nahi.

Adha packed karna mana nahi — lekin **reason lazmi** hai, aur baqi order par
outstanding reh jata hai. Warna dabba chup chaap adhoora chala jata hai.

### Dispatch

Yahan wo chaar routes asal mein kaam aate hain. Route chunte hi teen cheezein
khud badal jati hain:

| Route | Carrier list | Reference | Kaun confirm karega |
|---|---|---|---|
| Karachi — own team | Own rider, Sales rep | — | **us order ka apna rep** (naam se) |
| Online courier | PostEx, TCS, Leopards, M&P, Trax | tracking (optional) | ye desk |
| Local cargo | Pak Intl, Rehman, Mehran Railway | **bilty lazmi** | cargo desk |
| Heavy — logistics | Pak Intl, NLC, Daewoo | **bilty lazmi** | cargo desk |

Karachi ka pata ho tou route khud "own team" par set ho jata hai.

**Bilty freight par lazmi hai** aur screen wajah bhi batati hai: freight ka koi
tracking feed nahi hota, bilty hi wahid saboot hai.

Button dabane se pehle neeche saaf likha hota hai ke **iske baad kis se poocha
jayega aur kab** — "Zara Malik confirms this one… reminders start today, then
repeat every 6 hours". Yehi wo cheez hai jo client ne poochi thi.

---

## Aage kya baqi hai

1. **Packing screen** — order uthao, items pick karo, kam pade tou transfer banao
2. **Dispatch screen** — channel chuno (local / online / cargo / heavy), carrier,
   tracking ya bilty, phir invoice
3. **Claim Out batch** — kai claim ek saath ek supplier ko bhejna, ek slip par
4. **Stock Received (GRN)** ko Order Dept ki zabaan mein dhaalna

## Client se abhi bhi poochna hai

1. Online orders kaun leta hai — website se aate hain ya banda daalta hai?
2. PostEx ke ilawa aur kaun se courier?
3. Cargo ki list mukammal hai?
4. Reminder 3 din baad upar wale ko bhi jaye?
5. Claim ki koi warranty window hai? (abhi 180 din rakha hai)
6. Refuse hua claim — customer se paisa wapis lete hain ya company bardasht karti hai?
