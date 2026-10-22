"use client";

import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   WHAT EACH PLACE HOLDS OF AN ORDER'S ITEMS

   GET /sales/orders/{id}/stock -- every line beside its quantity at Shop 2,
   the Warehouse and the Order Department (the owner, 21 Oct). Read by:

     * the Confirm dialog, where the Order Department column decides whether
       the order may be confirmed (the API refuses it too);
     * both dispatch screens, where the column that matters is the place the
       goods are being sent from.

   Never shown to a salesperson -- the API answers them 403. They are told the
   most they may order instead (StockAvailability on the API).
   ─────────────────────────────────────────────────────────────────────────── */

export type OrderStockPlace = { id: number; name: string; kind: string };

export type OrderStockLine = {
  productId: number;
  sku: string | null;
  name: string;
  imageUrl: string | null;
  ordered: number;
  stock: { locationId: number; qty: number }[];
  orderDept: number;
  orderDeptShort: number;
};

export type OrderStock = {
  orderNo: string;
  places: OrderStockPlace[];
  lines: OrderStockLine[];
  orderDeptCovers: boolean;
};

export async function fetchOrderStock(orderId: number): Promise<OrderStock> {
  const res = await axios.get<OrderStock>(`${API_BASE_URL}/sales/orders/${orderId}/stock`, {
    headers: authHeader(),
  });
  return res.data;
}

/** What one place holds of one line. */
export function qtyAt(line: OrderStockLine, locationId: number) {
  return line.stock.find((s) => s.locationId === locationId)?.qty ?? 0;
}

/** The lines a place cannot cover, in the shape the API's own shortages use. */
export function shortAt(stock: OrderStock, locationId: number) {
  return stock.lines
    .map((l) => ({ sku: l.sku, name: l.name, needed: l.ordered, onHand: qtyAt(l, locationId) }))
    .filter((x) => x.onHand < x.needed)
    .map((x) => ({ ...x, shortBy: x.needed - x.onHand }));
}

/**
 * The table: one row per item, Ordered, then one column per place. Columns
 * named in `watch` are the ones that must cover the order -- a cell there
 * that is under what was ordered is drawn red.
 */
export function OrderStockTable({
  stock,
  watch,
}: {
  stock: OrderStock;
  /** Location ids whose shortfall matters here. */
  watch: number[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-700">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 dark:bg-navy-800 text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Item</th>
            <th className="text-right font-semibold px-3 py-2 whitespace-nowrap">Ordered</th>
            {stock.places.map((p) => (
              <th key={p.id}
                className={cn(
                  "text-right font-semibold px-3 py-2 whitespace-nowrap",
                  watch.includes(p.id) && "text-navy-900 dark:text-white"
                )}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stock.lines.map((l) => (
            <tr key={l.productId} className="border-t border-slate-100 dark:border-navy-700">
              <td className="px-3 py-2">
                <div className="font-medium text-navy-900 dark:text-white line-clamp-2">{l.name}</div>
                {l.sku && <div className="text-2xs tabular text-slate-400">{l.sku}</div>}
              </td>
              <td className="px-3 py-2 text-right tabular font-semibold text-navy-900 dark:text-white">
                {l.ordered}
              </td>
              {stock.places.map((p) => {
                const q = qtyAt(l, p.id);
                const short = watch.includes(p.id) && q < l.ordered;
                return (
                  <td key={p.id}
                    className={cn(
                      "px-3 py-2 text-right tabular",
                      short ? "text-danger font-bold bg-danger/5"
                        : watch.includes(p.id) ? "font-semibold text-success"
                        : "text-slate-600 dark:text-slate-300"
                    )}>
                    {q}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
