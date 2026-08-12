"use client";

import * as React from "react";
import { can as roleCan, type RoleKey } from "@/data/settings";
import { demoUsers, type CurrentUser } from "@/data/mock";

const ROLE_STORAGE_KEY = "advpos-active-role";

type SessionValue = {
  role: RoleKey;
  user: CurrentUser;
  /** Does the signed-in role hold this capability? */
  can: (permission: string) => boolean;
  /** Preview the app as another role — demo affordance, not real auth. */
  switchRole: (role: RoleKey) => void;
};

const SessionContext = React.createContext<SessionValue | null>(null);

/**
 * The chosen role is kept in localStorage so a review session survives a
 * reload. Read through useSyncExternalStore rather than an effect, so the
 * server render and the first client render agree.
 */
const roleStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    roleStore.listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      roleStore.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  get(): RoleKey | null {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    return stored && stored in demoUsers ? (stored as RoleKey) : null;
  },
  set(next: RoleKey) {
    localStorage.setItem(ROLE_STORAGE_KEY, next);
    roleStore.listeners.forEach((l) => l());
  },
};

export function SessionProvider({
  children,
  initialRole = "super-admin",
}: {
  children: React.ReactNode;
  initialRole?: RoleKey;
}) {
  const role = React.useSyncExternalStore(
    roleStore.subscribe,
    () => roleStore.get() ?? initialRole,
    () => initialRole
  );

  const switchRole = React.useCallback((next: RoleKey) => {
    roleStore.set(next);
  }, []);

  const value = React.useMemo<SessionValue>(
    () => ({
      role,
      user: demoUsers[role],
      can: (permission: string) => roleCan(role, permission),
      switchRole,
    }),
    [role, switchRole]
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
 * Render children only when the signed-in role holds the capability.
 * Use for action buttons; the sidebar filters itself from nav-config.
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
