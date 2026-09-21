/**
 * Where a product name should take somebody.
 *
 * The Items pages (the list, one item's own screen, and "new item") are
 * limited to the people who hold `products.view`. The Order Department does
 * NOT: the owner's rule, 21 September, is that the order desk works the Stock
 * section without ever seeing the item catalogue -- they see Stock in Hand,
 * make Transfers, do Stock Correction and read Stock History, and that is all.
 *
 * But every one of those screens has a product name on it, and every name used
 * to be a link to the item's own screen. Left as it was, the order desk would
 * click a product in Stock in Hand and land on "Forbidden".
 *
 * So a name links to the item's screen for people who may open it, and to the
 * item's STOCK HISTORY for people who may not -- which is the thing they came
 * to look at, and a page they are allowed.
 */
export function itemHref(can: (permission: string) => boolean, id: number | string): string {
  return can("products.view") ? `/inventory/products/${id}` : `/inventory/products/${id}/history`;
}

/** The breadcrumb that stands for "the item list" -- or for Stock History, when the list is not theirs. */
export function itemsCrumb(can: (permission: string) => boolean): { label: string; href: string } {
  return can("products.view")
    ? { label: "Products", href: "/inventory/products" }
    : { label: "Stock History", href: "/inventory/movements" };
}
