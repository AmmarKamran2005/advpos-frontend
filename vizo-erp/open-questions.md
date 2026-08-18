# Open Questions — Orders & Sales Flow

Sirf wo sawaal jo **order lene se le kar paisa aane tak** ke flow se juday hain.
Setup/accounting wale sawaal `plan.md` §6.4 mein alag hain.

🔴 = iske baghair aage ka design pakka nahi ho sakta · 🟡 = behtar ho jayega

---

## 1. Order kaise banta hai

| | Sawaal |
|---|---|
| 🔴 | **Online order kaun daalta hai** — website se khud aata hai, ya koi banda haath se daalta hai? |
| 🔴 | **Har customer ka apna rate hota hai, ya sab ka same?** (distribution mein aam taur par har dukaan ka alag rate hota hai) |
| 🔴 | **Rep discount de sakta hai?** Kitne percent tak? Us se upar approval chahiye? |
| 🟡 | Order submit karne ke baad rep khud edit kar sakta hai, ya sirf Order Dept badle? |
| 🟡 | Order cancel kaun kar sakta hai, aur kis stage tak? |

## 2. Limit aur udhaar

| | Sawaal |
|---|---|
| 🔴 | **Do alag limit hain?** Legacy mein `INV LIMIT` (ek invoice ki had) aur `LEDGER LIMIT` (kul balance ki had) dono the — confirm karein |
| 🔴 | Limit cross ho jaye tou **order ruk jaye ya warning ke saath chalta rahe?** |
| 🟡 | Limit override kaun kar sakta hai — Accounts, ya sirf Super Admin? |

## 3. Packing aur dispatch

| | Sawaal |
|---|---|
| 🔴 | **Adha maal ja sakta hai?** Ya poora order rukega jab tak sab items na ho jayein? |
| 🟡 | Ek hi order do alag raston se ja sakta hai (kuch local hath se, kuch cargo se)? |
| 🟡 | Ek gaari/booking mein kai orders jate hain? Load sheet chahiye? |

## 4. Delivery aur confirmation

| | Sawaal |
|---|---|
| 🔴 | **Reminder sirf zimmedar banday ko jaye, ya 3 din baad uske upar wale ko bhi?** (warna banda ignore karta rahega) |
| 🔴 | **Delivery charge customer se lete hain?** Invoice mein add hota hai ya alag? |
| 🟡 | PostEx ke ilawa aur kaun se online courier? |
| 🟡 | Cargo ki list mukammal hai — Pak International, Rehman, Mehran Railway? |
| 🟡 | Doosre shehar ka rep "customer kehta hai maal nahi mila" flag kar sake? (usay sab se pehle pata chalta hai) |

## 5. Paisa

| | Sawaal |
|---|---|
| 🔴 | **Rep ka collect kiya paisa Accounts confirm kare — ye theek hai?** Abhi aisa hi banaya hai: rep ki entry "Awaiting Accounts" par rukti hai, ledger baad mein chalta hai |
| 🔴 | Order ke waqt **advance** lete hain? |
| 🟡 | Cheque bounce ho jaye tou kya hota hai — customer ka balance wapis barh jaye aur usay bataya jaye? |

## 6. Wapsi aur claim

| | Sawaal |
|---|---|
| 🔴 | **Refuse hua claim — customer se paisa wapis lete hain ya company bardasht karti hai?** (abhi Warranty account mein write-off rakha hai) |
| 🟡 | **Sales return aur claim alag cheezein hain?** (sahi maal wapis vs kharab maal wapis) |
| 🟡 | Claim ki warranty window kitni hai? (abhi 180 din rakha hai) |

---

## Client ko bhejne ke liye — chhoti shakal

```
1.  Online order website se aata hai ya koi banda daalta hai?
2.  Har customer ka apna rate hota hai ya sab ka same rate?
3.  Sales wala discount de sakta hai? Kitna? Us se upar kis se poochna hoga?
4.  Customer ki do limit hain — ek invoice ki, aur kul udhaar ki? Dono chalti hain?
5.  Limit cross ho jaye tou order ruk jaye ya warning de kar chalne dein?
6.  Adha maal bhej sakte hain ya poora order tayyar hone ka intezaar?
7.  Delivery ka kharcha customer se lete hain? Bill mein add hota hai?
8.  Delivery confirm na ho tou reminder sirf usi banday ko jaye, ya 3 din baad
    uske sahab ko bhi?
9.  Doosre shehar ka sales wala "customer kehta hai maal nahi mila" likh sake?
10. Order ke waqt advance lete hain?
11. Sales wala jo cash le kar aaye, wo Accounts confirm kare tab khaate mein chade
    — theek hai?
12. Cheque bounce ho jaye tou kya karte hain?
13. Claim company refuse kar de tou nuqsan customer se lete hain ya khud bardasht?
14. Sales return aur claim alag hain ya ek hi cheez?
15. PostEx ke ilawa aur kaun se courier? Cargo ki list poori hai?
```
