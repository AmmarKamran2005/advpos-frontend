# Session A — purchase pricing, stock lots, purchase vouchers, purchases for the Super Admin only

26 Sep 2026. Branch `feat/a-purchases` in both repos. Tested against `advpos_a`,
a local copy of live taken the same day. **Nothing pushed, nothing run on live.**

## OWNER MUST SEE

1. **The accountant can still work out an item's cost from the ledger.** You chose
   "the accountant sees supplier balances, payments and the purchase vouchers in
   the ledger" (question 4a). A goods voucher reads, for example,
   `VIZO T9 Power Bank × 50 @ 1,500.00 — Dr Inventory 75,000`. Every screen that
   shows cost directly is now closed to him (see below), but the vouchers
   themselves carry it: the amount divided by the quantity is the cost. To hide
   that too, the accountant would have to lose the purchase vouchers in the
   ledger, or they would have to post one total per voucher instead of a line per item.
2. **Stock is now carried in the books at its full selling value, and nothing
   takes it off when it is sold.** Each purchase debits Inventory with cost +
   duty + FS + Margin 1 + Margin 2, crediting the supplier, the logistics
   company and three reserves. The books have never posted the cost of goods
   sold (HANDOFF D7), so Inventory and the reserves only ever grow.
   *Example:* buy 50 at 1,400 → Inventory +70,000 (of which 20,000 sits in the FS
   and Margin reserves); sell all 50 → Inventory still +70,000. The fix is a
   cost-of-sales posting at dispatch that releases the lot's parts. The lots
   needed for that now exist (each unit knows its purchase). It needs your
   accountant's word on which accounts the FS and margin parts go to once sold.

## What was built

**Database — `backend/database/26_purchase_pricing_and_batches.sql`**
- `Product.FsPrice`, `Product.Margin2Price`. `MarginPrice` is Margin 1.
- `PurchaseOrderItem`: `DutyPrice`, `FsPrice`, `Margin1Price`, `Margin2Price`,
  `DutyAccountId` (the logistics company) and a reason for each extra box.
  `PurchaseOrder.SupplierBillNo`.
- **Stock lots:** `StockBatch` (one per purchase-order line, plus one OPENING lot
  per product for today's stock at today's price), `StockBatchBalance` (lot ×
  location) and `StockBatchMovement` (which lots each stock movement touched).
  Rule: lots add up to the shelf for every product and place. The migration
  aborts if they don't.
- `PurchaseOrderEntry`: which vouchers a purchase order posted, and for which part.
- **Accounts:** 2150 Logistics Companies (a group; each company becomes 2151,
  2152, …), 2160 Fi Sabilillah Reserve, 2161 Margin 1 Reserve, 2162 Margin 2 Reserve.
- **Section 2** (commented out; run after the deploy) drops
  `PurchaseOrder.ExpectedDate`, `StatusId` and `ApprovedByUserId`.

**API (backend)**
- `PurchasesController`, rebuilt, **Super Admin only**. Creating a purchase order
  does all of this in one transaction:
  - the PO and its lines, each with the five parts
  - a lot per line
  - stock onto the chosen location, recorded as a stock movement
  - the **purchase invoice (supplier's bill)**
  - **five vouchers**:
    - GOODS: Dr Inventory per item / Cr Accounts Payable (the supplier)
    - DUTY: Dr Inventory / Cr each logistics company
    - FS: Dr Inventory / Cr 2160
    - MARGIN1: Dr Inventory / Cr 2161
    - MARGIN2: Dr Inventory / Cr 2162
  - the **price decision** for each line: keep the price, or average this purchase with the ticked earlier lots
  Also here:
  - `GET /purchases/products/{id}/lots` feeds the popup.
  - `GET/POST/PUT/DELETE /purchases/logistics`. A company that has been used is switched off, not deleted.
  - The lookups leave out every claim-kind location.
- `SupplierPayablesController`: `/purchases/summary` and `/purchases/payables`
  at the same URLs, open to the accountant. They show bill totals only.
- `Services/StockBatches.RecordAsync`: every stock change in Sales/Inventory now
  goes through it, and it moves the matching lots:
  - out: oldest first
  - a transfer's arrival: back into the same lots that left
  - a rejected return: out of the lots the return went into
  - new stock found on a count: into the newest lot
  - a shortfall: taken from the newest lot, which may go negative, as the shelf itself may
- **Products:** "Opening Pricing" has five parts, and the sale price is their sum,
  computed by the server. The price is locked once a purchase order has bought
  the item. The five parts are returned to the Super Admin only.
- **Cost hidden from every other role:** product list/detail/export, product
  history, movements, the stock ledger and its workbook, Stock in Hand and stock
  corrections (valued at the selling price for them, and labelled so), and the
  inventory lookups. The purchasing events are left out of product history for them.
- **Documents:** the purchase-order PDF (the supplier's copy) shows cost only,
  with no status. New `purchase-vouchers` document: the "overall JV", every
  voucher of one order on one sheet. The eight PDFs of an order are stored
  after the response, so saving takes about 0.5 s instead of 10+ s.

**Web (vizo-erp)**
- `/inventory/products/new`: an "Opening Pricing" card, no Margin %.
  `/inventory/products/{id}`: the pricing is locked after the first purchase
  order, and the Pricing tab lists "Stock by purchase".
- `/purchases/orders/new`, rebuilt:
  - supplier and receiving location (no Claim Stock)
  - the PO date: today by default, can be earlier, never later
  - the supplier's bill no.
  - item lines with quantity and the five parts
  - "Duty paid to" beside Duty, with **Manage** to add, rename, delete or switch off a company
  - reasons for each extra part
  - the selling price per line
  - **Set price** (the popup) on every line
  - totals: owed to the supplier, and the selling value
- The popup (`components/purchases/price-decision-dialog.tsx`) shows:
  - every earlier purchase with its price parts, where its units sit, and "N of M left"
  - ticked lots averaged by what is left of each; this purchase is always included
  - the final price, which can be overtyped (the difference goes into Margin 1)
  - "Keep current price"
  - "All N units will sell at X"
- The order list and detail have no statuses. The detail shows the parts and
  reasons, what is left of each line, the bill, the five vouchers and the
  overall sheet. An order made before 26 Sep says so and links its old GRNs.
- Removed: the GRN list and "new" screens, and the purchase-invoice "new"
  screen. Old records stay readable. New `/purchases/logistics`.
- The sidebar and `proxy.ts` give `/purchases` to the Super Admin only. The
  accountant's dashboard, the reminders and the Reports links point to Suppliers,
  whose cards are now "Open Bills" and "Overdue Bills".

## Decisions taken (your "recommended" answers, and where I had to choose)

- **Average:** weighted by what is left of each ticked lot, claim locations not
  counted, and this purchase always included. The average sale price is taken
  whole, so 10 × 1,400 + 50 × 2,000 over 60 = exactly 1,900. Each part is averaged
  the same way, and Margin 1 absorbs the rounding and any hand-typed difference,
  so the parts always add up.
- **Old purchase orders** (the 9 never received): kept as history, with no stock added.
  After section 2 their old statuses are gone; the screen calls them
  "written before 26 Sep".
- **PO date:** any date up to today (it needs an open fiscal period; there are
  periods for 2026–27).
- **"Overall JV":** a printable sheet of the five vouchers, not a sixth posting.
  A sixth would count everything twice.
- **Tax:** a PO line has no tax % any more (tax is 0 everywhere since 22 Sep). A
  discount is still allowed; it reduces the bill and Inventory.
- **Claims** keep their value at cost for the accountant. That is his accounting
  work, and the order desk lost Claims on 23 Sep.

## What you must do by hand (deploy order)

1. Run **section 1** of `26_purchase_pricing_and_batches.sql` on live. It is safe
   while the old API runs. It prints nothing and aborts if lots and shelves disagree.
2. Deploy the API, then the web app.
3. Run **section 2** (the three `DROP COLUMN`s at the bottom).
4. Add your logistics companies: Purchases → Logistics Companies, or "Manage" on a PO.
5. Everyone signs out and back in (the accountant's menu changes).

## Found and not changed

- A supplier-payment voucher's detail page links each bill to
  `/purchases/invoices/{id}`, which the accountant can no longer open (it goes
  to the forbidden page). The link text is still useful. Change it to plain
  text if it bothers him.
- Two shelves were negative on 26 Sep (product 13 at −1 and product 32 at −975,
  both at Karachi Warehouse). Their OPENING lots carry the same negatives.
- `PurchaseOrderStatus` (the lookup table) is left in place, unused.
  Dropping lookups here cascades (HANDOFF trap 24).
- `Models/AppDbContext.cs` (Talha's) lost exactly the two relationship blocks
  of the dropped columns (`fk_po_approved_by`, `fk_po_status`), and the matching
  navigations were removed from `PurchaseOrder.cs`, `PurchaseOrderStatus.cs` and
  `Employee.cs`. Nothing else in his files changed.

## How it was verified (local copy of live)

- **The owner's example** through the API: 50 at 1,400, 40 leave, 10 left, then
  50 at 2,000 averaged with the 10 = **1,900.00**. Five balanced vouchers per order;
  bill raised; lots = shelves everywhere.
- **Hand-typed final 1,950:** the parts became 1,250 / 150 / 150 / 325 / 75 and
  still add to 1,950.
- **Lots follow the stock:**
  - A transfer of 15 took July's 10 + September's 5 and landed the same lots at Shop 2.
  - A counter sale of 12 took the oldest first.
  - A return landed in the newest lot, and rejecting it took the same 2 back out.
  - Lots = shelves after every step.
- **Browser** (127.0.0.1:3001, Super Admin):
  - Opening Pricing 1,000 + 100 + 100 + 100 + 100 = 1,400.
  - A full order through the UI: the popup averaged 10 + 48 left with 1 new unit to 1,999.15. Saving posted the vouchers and showed the detail page.
  - No sideways scroll at 375 px on the detail page, the new-order form, a line card or the popup.
- **Per role:** accountant and order desk see no cost field on 9 endpoints, get
  403 on purchase orders, and the accountant still gets `/purchases/summary`.
- **Gate:** backend build 0 errors; `tsc` clean; `eslint` 0 errors (no new warnings).
