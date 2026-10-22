/**
 * Keyboard shortcuts and Quick Create -- the ONE list both the handlers and the
 * help sheet read, so the sheet can never again advertise a key that does
 * nothing.
 *
 * WHY THIS FILE EXISTS. The shortcut sheet used to list F2 / F3 / F4 / F5 / F9,
 * Ctrl+arrows and Ctrl+D, and Quick Create printed ⌘O ⌘I ⌘P ⌘V ⌘C ⌘R beside
 * its items. Not one of them was wired to anything. Worse, the Quick Create
 * letters could never have been wired as printed: Ctrl+C and Ctrl+V are copy
 * and paste, Ctrl+P prints, Ctrl+R reloads, Ctrl+O opens a file -- taking any
 * of those over in a data-entry app would break the thing people do most.
 *
 * So Quick Create uses a two-key SEQUENCE instead: press N, then the letter
 * (N then O = new order). The same idea as Gmail's and GitHub's "g i". It
 * collides with nothing the browser or the OS owns, and it never fires while
 * the cursor is in a text box, because in a text box N is just the letter N.
 *
 * Imported by the top bar, which is on every screen, so it is kept to plain
 * data: no icons, no React. The icon for each item is chosen where it is drawn.
 */

/** The letter pressed after N for each Quick Create item. */
export type QuickCreateKey = "o" | "i" | "p" | "v" | "c" | "r";

export type QuickCreateItem = {
  label: string;
  /** Icon name, mapped to a lucide component where the list is drawn. */
  icon: "shopping-cart" | "file-text" | "truck" | "banknote" | "user-plus" | "box";
  href: string;
  key: QuickCreateKey;
  /** Only offered to people holding this permission (the API checks it too). */
  perm: string;
  /**
   * Roles the SCREEN is open to, where that is narrower than the permission.
   * proxy.ts closes /purchases to everyone but the Super Admin by role, with no
   * permission escape hatch -- offering it to anybody else would be a shortcut
   * straight to /forbidden.
   */
  roles?: string[];
};

export const QUICK_CREATE: QuickCreateItem[] = [
  { label: "Customer Order",    icon: "shopping-cart", href: "/sales/orders/new",        key: "o", perm: "orders.create" },
  { label: "Sale Invoice",      icon: "file-text",     href: "/sales/invoices/new",      key: "i", perm: "invoices.create" },
  { label: "Order to Supplier", icon: "truck",         href: "/purchases/orders/new",    key: "p", perm: "purchases.manage", roles: ["super-admin"] },
  { label: "Money Received",    icon: "banknote",      href: "/accounting/vouchers/new", key: "v", perm: "money.manage",     roles: ["super-admin", "accountant"] },
  { label: "Customer",          icon: "user-plus",     href: "/parties/new",             key: "c", perm: "customers.manage" },
  { label: "Item",              icon: "box",           href: "/inventory/products/new",  key: "r", perm: "products.manage" },
];

/** The Quick Create items this person may actually open. */
export function quickCreateFor(can: (perm: string) => boolean, role: string | undefined) {
  return QUICK_CREATE.filter((q) => can(q.perm) && (!q.roles || (role !== undefined && q.roles.includes(role))));
}

/** How a Quick Create key is written on screen: "N O". */
export const quickCreateHint = (key: QuickCreateKey) => `N ${key.toUpperCase()}`;

/* ──────────────────────────── the help sheet ──────────────────────────── */

export type Shortcut = {
  /** Each entry is one key cap; a sequence is several caps. */
  keys: string[];
  label: string;
  group: "Anywhere" | "Create" | "Expense sheet" | "Dialogs";
};

/**
 * Only shortcuts that really work, and where each one is handled:
 *   Anywhere      -- components/layout/global-shortcuts.tsx and shortcut-sheet.tsx
 *   Create        -- global-shortcuts.tsx, from QUICK_CREATE above
 *   Expense sheet -- accounting/expenses/_components/expense-grid.tsx (Enter,
 *                    Shift+Enter, arrows) and sheets/[id]/page.tsx (Ctrl+S)
 *   Dialogs       -- Radix, which every dialog here is built on
 */
export const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], label: "Search and command palette", group: "Anywhere" },
  { keys: ["/"],         label: "Search",                     group: "Anywhere" },
  { keys: ["?"],         label: "This list",                  group: "Anywhere" },

  { keys: ["Enter"],          label: "Next cell",                  group: "Expense sheet" },
  { keys: ["Shift", "Enter"], label: "Previous cell",              group: "Expense sheet" },
  { keys: ["↑"],              label: "Same cell, row above",       group: "Expense sheet" },
  { keys: ["↓"],              label: "Same cell, row below",       group: "Expense sheet" },
  { keys: ["Ctrl", "S"],      label: "Save the sheet",             group: "Expense sheet" },

  { keys: ["Esc"], label: "Close the dialog or palette", group: "Dialogs" },
];

/**
 * True when a key press belongs to whatever the person is typing into. Every
 * global shortcut checks this first -- "/" or "N" pressed in a customer's name
 * must type the character, not jump somewhere.
 */
export function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/* ─────────────────────── opening the palette from anywhere ─────────────────────── */

/**
 * The palette's open state lives in GlobalShortcuts, next to the key handler.
 * The top bar's search box is a sibling far away in the tree, so rather than
 * lift that state into a context -- which would re-render the whole shell on
 * every open and close (AGENTS.md rule 6) -- the box fires a window event.
 */
export const OPEN_PALETTE_EVENT = "advpos:open-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}
