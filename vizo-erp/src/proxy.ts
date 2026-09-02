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

type RoleKey = "super-admin" | "accountant" | "order-dept" | "sales";

const TOKEN_COOKIE = "advpos_token";
const ROLE_COOKIE = "advpos_role";

const ALL: RoleKey[] = ["super-admin", "accountant", "order-dept", "sales"];

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
 */
const ROUTE_RULES: { prefix: string; roles: RoleKey[] }[] = [
  { prefix: "/admin", roles: ["super-admin"] },

  { prefix: "/accounting", roles: ["super-admin", "accountant"] },

  { prefix: "/sales/credit-holds", roles: ["super-admin", "accountant"] },
  { prefix: "/sales/direct", roles: ["super-admin", "order-dept"] },
  { prefix: "/sales/returns", roles: ["super-admin", "accountant", "order-dept"] },
  { prefix: "/sales/invoices", roles: ["super-admin", "accountant", "order-dept"] },
  { prefix: "/sales", roles: ALL },

  { prefix: "/purchases", roles: ["super-admin", "accountant", "order-dept"] },
  { prefix: "/inventory", roles: ["super-admin", "accountant", "order-dept"] },
  { prefix: "/packing", roles: ["super-admin", "order-dept"] },
  { prefix: "/dispatch", roles: ["super-admin", "order-dept"] },
  { prefix: "/delivery", roles: ["super-admin", "order-dept", "accountant"] },
  { prefix: "/claims", roles: ["super-admin", "order-dept", "accountant"] },

  { prefix: "/parties/suppliers", roles: ["super-admin", "accountant", "order-dept"] },
  { prefix: "/parties", roles: ALL },

  { prefix: "/reports", roles: ALL },
  { prefix: "/dashboard", roles: ALL },
  { prefix: "/profile", roles: ALL },
];

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

  /* Already signed in and looking at the login screen? Go to work. */
  if (pathname === "/login" && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
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
     straight to the dashboard instead of bouncing them through the form. */
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = signedIn ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  if (!signedIn) return signOut(req, "/login");

  /* A token with no readable role is a broken session, not an authorised one. */
  if (!role || !ALL.includes(role)) return signOut(req, "/login");

  const rule = ROUTE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );

  /* Unlisted app routes are closed by default. Adding a screen means adding a
     rule, which is the safe way round. */
  if (!rule) {
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!rule.roles.includes(role)) {
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
