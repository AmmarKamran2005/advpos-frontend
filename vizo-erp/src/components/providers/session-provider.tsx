"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import type { RoleKey } from "@/data/settings";

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

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5185/api";

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
  role: RoleKey;
  status: "loading" | "authenticated" | "unauthenticated";
  can: (permission: string) => boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = React.createContext<SessionValue | null>(null);

/* ───────────────────────── cookie plumbing ───────────────────────── */

function writeCookie(name: string, value: string, days = 1) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`;
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
 */
export function saveSession(token: string, user: SessionUser) {
  writeCookie(TOKEN_COOKIE, token);
  writeCookie(ROLE_COOKIE, user.role);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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

  /* Hydrate from storage first so the shell paints immediately, then confirm
     with the server. If the token has been revoked or the account switched
     off, /auth/me answers 401 and we bounce to the login screen. */
  React.useEffect(() => {
    let cancelled = false;

    const stored = readStoredUser();
    if (stored) {
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
        writeCookie(ROLE_COOKIE, res.data.role);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
        router.replace("/login");
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
      role: (user?.role ?? "sales") as RoleKey,
      status,
      can: (permission: string) => user?.permissions?.includes(permission) ?? false,
      logout,
      refresh,
    }),
    [user, status, logout, refresh]
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
