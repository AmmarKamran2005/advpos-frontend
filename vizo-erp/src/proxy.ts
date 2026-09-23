import { NextResponse, type NextRequest } from "next/server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Route protection (Next.js 16 "proxy" file convention -- this is what used
 * to be called middleware; the framework renamed it and deprecated the old
 * name, so the export below must be `proxy`, not `middleware`).
 *
 * It runs on the edge before any page renders, so typing a URL by hand is
 * caught here rather than after a screen has already flashed up. An accountant
 * who types /admin/users is sent to /forbidden; a signed-out visitor is sent
 * to /login with the path they wanted preserved.
 *
 * WHAT THIS IS NOT: it is not the security boundary. The cookie it reads is
 * written by the browser and could be forged. Every /api/admin/* endpoint is
 * [Authorize(Policy = "SuperAdmin")] on the ASP.NET side and validates the JWT
 * signature on every call -- that is what actually stops anybody. This file
 * stops the *navigation*, which is a UX job.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type RoleKey =
  | "super-admin"
  | "accountant"
  | "order-dept"
  | "sales";

const TOKEN_COOKIE = "advpos_token";
const ROLE_COOKIE = "advpos_role";

const ALL: RoleKey[] = [
  "super-admin",
  "accountant",
  "order-dept",
  "sales",
];

/** Reachable without signing in. */
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/locked",
  "/forbidden",
  "/setup",
];

/**
 * First match wins, so the specific entries sit above the general ones.
 * /sales/credit-holds is listed before /sales on purpose: approving a limit
 * cross is not something a sales rep may do.
 *
 * `roles` is who reaches the screen by virtue of the job they hold. `perm` is
 * the escape hatch: name a permission and anybody the Super Admin has GRANTED
 * that permission gets in as well, whatever their role.
 *
 * That second field exists because without it the permission screen in Setup
 * was decoration. Ticking "Handle sales returns" for the Sales role saved
 * happily, the API said yes -- and this file still bounced the rep to
 * /forbidden, because their role was not on a list written months earlier.
 *
 * What it does NOT do is widen what they can see once they are in. The API
 * scopes a rep to their own orders, their own invoices and the returns against
 * them; see SalesController.SalesScopeUserId.
 */
const ROUTE_RULES: { prefix: string; pattern?: RegExp; roles: RoleKey[]; perm?: string }[] = [
  { prefix: "/admin", roles: ["super-admin"] },

  { prefix: "/accounting", roles: ["super-admin", "accountant"] },

  { prefix: "/sales/credit-holds", roles: ["super-admin", "accountant"] },
  { prefix: "/sales/direct", roles: ["super-admin", "order-dept"] },
  /* SALES RETURNS ARE THE BACK OFFICE'S, BY ROLE.

     No `perm` escape hatch on this one, on purpose. The owner's rule is "sales
     return only admin and accountant hi krsakta hn" -- it is about the job, not
     about a tick in Setup, and the API says the same thing with an Accountant
     policy on every returns endpoint. Ticking the permission for another role
     would otherwise open a screen whose every call answers 403. */
  {
    prefix: "/sales/returns",
    roles: ["super-admin", "accountant"],
  },
  {
    prefix: "/sales/invoices",
    roles: ["super-admin", "accountant", "order-dept"],
    perm: "invoices.view",
  },
  { prefix: "/sales", roles: ALL },

  /* PURCHASES ARE NOT THE ORDER DESK'S -- EVER.

     The owner: "order department cannot access any purchases page ... order
     department can never see purchases". By role, with no `perm` escape hatch,
     on purpose: the API refuses the order-dept role on every purchases endpoint
     (PurchasesController), so ticking a permission for them in Setup would open
     a screen whose every call answers 403. "Never" is a rule about the job. */
  {
    prefix: "/purchases",
    roles: ["super-admin", "accountant"],
  },

  /* THE ITEM CATALOGUE, CATEGORIES AND BRANDS -- not the order desk's either.

     Matched by pattern because the item pages live at /inventory/products/...
     alongside the two pages the order desk DOES use (/{id}/history and
     /{id}/movements/...), which are Stock History and must stay open. Creating
     or changing an item, a category or a brand takes products.manage; looking
     at the list or one item takes products.view. Both listed above the general
     /inventory rule, because the first match wins. */
  {
    prefix: "/inventory/products/new",
    pattern: /^\/inventory\/products\/new\/?$/,
    roles: ["super-admin"],
    perm: "products.manage",
  },
  {
    prefix: "/inventory/products",
    pattern: /^\/inventory\/products(\/\d+)?\/?$/,
    roles: ["super-admin", "accountant"],
    perm: "products.view",
  },
  { prefix: "/inventory/categories", roles: ["super-admin"], perm: "products.manage" },
  { prefix: "/inventory/brands", roles: ["super-admin"], perm: "products.manage" },
  {
    prefix: "/inventory",
    roles: ["super-admin", "accountant", "order-dept"],
    perm: "stock.view",
  },
  /* Packing is the order desk's own front door -- see Role.HomePath and the
     redirects above. */
  { prefix: "/packing", roles: ["super-admin", "order-dept"] },
  { prefix: "/dispatch", roles: ["super-admin", "order-dept"] },
  {
    prefix: "/delivery",
    roles: ["super-admin", "order-dept", "accountant"],
    perm: "delivery.view",
  },
  /* NOT THE ORDER DESK'S, since 23 September -- "remove Claims from [the
     Order Department panel]. There is no need for a Claims page in the Order
     Department panel." ClaimsController and migration 25 say the same thing
     on the other two layers. */
  {
    prefix: "/claims",
    roles: ["super-admin", "accountant"],
    perm: "claims.view",
  },

  /* Suppliers show what has been bought from them (GET /purchases/summary), so
     they go with Purchases: not the order desk's. */
  { prefix: "/parties/suppliers", roles: ["super-admin", "accountant"] },
  { prefix: "/parties", roles: ALL },

  { prefix: "/reports", roles: ALL },
  { prefix: "/dashboard", roles: ALL },
  { prefix: "/profile", roles: ALL },
];

/**
 * The permissions carried in the token's `perm` claim.
 *
 * Read WITHOUT verifying the signature, exactly like `isExpired` above and for
 * the same reason: a forged claim buys nothing, because every endpoint behind
 * the screen checks the real signature on every call. Getting this wrong shows
 * somebody an empty page, not somebody else's data.
 */
function permissions(token: string): string[] {
  try {
    const body = token.split(".")[1];
    if (!body) return [];

    const json = JSON.parse(
      atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    ) as Record<string, unknown>;

    const raw = json.perm;
    if (Array.isArray(raw)) return raw.filter((p): p is string => typeof p === "string");
    return typeof raw === "string" ? [raw] : [];
  } catch {
    return [];
  }
}

/**
 * Reads the `exp` claim without verifying the signature. An expired token is
 * worthless anyway -- the API would reject it -- so catching it here just
 * saves the user a failed request and a confusing empty screen.
 */
function isExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (!json.exp) return false;
    return json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function signOut(req: NextRequest, to: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  if (to === "/login" && req.nextUrl.pathname !== "/dashboard") {
    url.searchParams.set("next", req.nextUrl.pathname);
  }
  const res = NextResponse.redirect(url);
  res.cookies.delete(TOKEN_COOKIE);
  res.cookies.delete(ROLE_COOKIE);
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value as RoleKey | undefined;
  const signedIn = Boolean(token) && !isExpired(token!);

  /* Already signed in and looking at the login screen? Go to work.

     Order Department lands on Packing, not the Dashboard -- the owner's rule,
     23 September, and the reason the login page itself reads Role.HomePath
     from the API rather than a constant here. Edge middleware has no database
     to ask, so the one role with a different home is named directly; every
     other role still goes to /dashboard. */
  if (pathname === "/login" && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = role === "order-dept" ? "/packing" : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
  req.nextUrl.pathname === "/sw.js" ||
  req.nextUrl.pathname.startsWith("/_next")
) {
  return NextResponse.next();
}

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  /* "/" is a server redirect to /login in page.tsx; send signed-in people
     straight to their own home instead of bouncing them through the form.
     Same order-dept exception as the "/login" case just above. */
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = signedIn ? (role === "order-dept" ? "/packing" : "/dashboard") : "/login";
    return NextResponse.redirect(url);
  }

  if (!signedIn) return signOut(req, "/login");

  /* A token with no readable role is a broken session, not an authorised one. */
  if (!role || !ALL.includes(role)) return signOut(req, "/login");

  const rule = ROUTE_RULES.find((r) =>
    r.pattern ? r.pattern.test(pathname) : pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  /* Unlisted app routes are closed by default. Adding a screen means adding a
     rule, which is the safe way round. */
  if (!rule) {
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.redirect(url);
  }

  /* The role opens it, or a permission the Super Admin granted does. */
  const allowed =
    rule.roles.includes(role) ||
    (rule.perm !== undefined && permissions(token!).includes(rule.perm));

  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /* Everything except Next's own assets and the favicon. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
