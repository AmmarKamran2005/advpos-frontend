"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { RoleKey } from "@/lib/app-config";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The signed-in session, backed by the real API.
 *
 * The JWT and the role key live in cookies because `middleware.ts` has to read
 * them on the edge before a page renders. The user object itself lives in
 * localStorage -- it is bigger, and nothing server-side needs it.
 *
 * Permissions are NOT computed here any more. They arrive from the API inside
 * the token payload and on /auth/me, so what the UI hides and what the API
 * refuses can never drift apart.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TOKEN_COOKIE = process.env.NEXT_PUBLIC_TOKEN_COOKIE || "advpos_token";
export const ROLE_COOKIE = process.env.NEXT_PUBLIC_ROLE_COOKIE || "advpos_role";
const USER_STORAGE_KEY = "advpos-user";
/** "0" when the person unticked "Keep me signed in"; anything else means keep. */
const REMEMBER_KEY = "advpos-remember";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://localhost:7177/api";

export type SessionUser = {
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  roleId: number;
  role: RoleKey;
  roleLabel: string;
  homePath: string;
  initials: string;
  primaryLocationId: number | null;
  employeeCode: string | null;
  isActive: boolean;
  permissions: string[];
};

type SessionValue = {
  user: SessionUser | null;
  /** The account is still on a temporary password; the shell sends it to /setup. */
  mustChangePassword: boolean;
  role: RoleKey;
  status: "loading" | "authenticated" | "unauthenticated";
  can: (permission: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = React.createContext<SessionValue | null>(null);

/* ───────────────────────── cookie plumbing ───────────────────────── */

/**
 * `days` null writes a SESSION cookie -- no Expires, so the browser drops it
 * when it closes. That is what an unticked "Keep me signed in" means.
 */
function writeCookie(name: string, value: string, days: number | null = 1) {
  if (typeof document === "undefined") return;
  const expires = days === null ? "" : `; Expires=${new Date(Date.now() + days * 86400000).toUTCString()}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/${expires}; SameSite=Lax${secure}`;
}

/* Whether this browser was asked to keep the session. Read again whenever a
   cookie is re-written (the provider refreshes the role cookie after /auth/me),
   or a session cookie would quietly be turned back into a persistent one. */
function rememberDays(): number | null {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) === "0" ? null : 1;
  } catch {
    return 1;
  }
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

/** The bearer token, or null. Use it to build an Authorization header. */
export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

/**
 * Ready-made auth header for the axios calls that live inside the pages:
 *
 *     axios.get(`${API_BASE_URL}/admin/users`, { headers: authHeader() })
 */
export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Called by the login screen, which renders above the provider and so cannot
 * use the hook.
 *
 * `remember` is the "Keep me signed in" box. Ticked: the cookies last a day
 * (the token itself expires sooner -- Jwt:ExpiryMinutes -- and the proxy checks
 * that). Unticked: they are session cookies and go when the browser closes.
 * Until 27 Sep the box was drawn and never read.
 */
export function saveSession(token: string, user: SessionUser, remember = true) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  }
  const days = remember ? 1 : null;
  writeCookie(TOKEN_COOKIE, token, days);
  writeCookie(ROLE_COOKIE, user.role, days);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * GET /account/status -- is this account still on a temporary password?
 * The edge proxy has no database to ask, so the login screen calls this right
 * after signing in and the provider calls it on every app load. A failure is
 * treated as "no": this is a nudge to /setup, not the security boundary.
 */
export async function fetchMustChangePassword(token: string): Promise<boolean> {
  try {
    const res = await axios.get<{ mustChangePassword: boolean }>(`${API_BASE_URL}/account/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.mustChangePassword === true;
  } catch {
    return false;
  }
}

export function clearSession() {
  deleteCookie(TOKEN_COOKIE);
  deleteCookie(ROLE_COOKIE);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

function readStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────── provider ────────────────────────────── */

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [status, setStatus] = React.useState<SessionValue["status"]>("loading");
  const [mustChangePassword, setMustChangePassword] = React.useState(false);

  /* Hydrate from storage first so the shell paints immediately, then confirm
     with the server. If the token has been revoked or the account switched
     off, /auth/me answers 401 and we bounce to the login screen. */
  React.useEffect(() => {
    let cancelled = false;

    const stored = readStoredUser();
    if (stored) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect --
         The brief for this project is axios inside the page driven by
         useState/useEffect. This rule wants the fetch moved to the server, which
         is a different architecture, not a bug in this line. Disabled here rather
         than globally so the rule still catches the cases worth fixing. */
      setUser(stored);
      setStatus("authenticated");
    }

    const token = getToken();
    if (!token) {
      setStatus("unauthenticated");
      router.replace("/login");
      return;
    }

    axios
      .get<SessionUser>(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        setStatus("authenticated");
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
        writeCookie(ROLE_COOKIE, res.data.role, rememberDays());
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
        router.replace("/login");
      });

    /* Somebody on a temporary password (a new account, or one the Super
       Admin reset) goes to /setup before anything else -- including when they
       type an app URL straight in, which the login screen's own check misses. */
    void fetchMustChangePassword(token).then((must) => {
      if (cancelled || !must) return;
      setMustChangePassword(true);
      router.replace("/setup");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = React.useCallback(async () => {
    const token = getToken();
    if (token) {
      /* Best effort: the log entry is useful, but a bearer token is dropped
         by the client, so a failure here must not block signing out. */
      try {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        /* ignored on purpose */
      }
    }
    clearSession();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const refresh = React.useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await axios.get<SessionUser>(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data);
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
  }, []);

  const value = React.useMemo<SessionValue>(
    () => ({
      user,
      mustChangePassword,
      role: (user?.role ?? "sales") as RoleKey,
      status,
      can: (permission: string) => user?.permissions?.includes(permission) ?? false,
      logout,
      refresh,
    }),
    [user, mustChangePassword, status, logout, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}

/**
 * Render children only when the signed-in user holds the capability.
 * The API enforces the same rule -- this only keeps dead buttons off screen.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useSession();
  return <>{can(permission) ? children : fallback}</>;
}
