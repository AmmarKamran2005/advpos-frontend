"use client";

import * as React from "react";
import { API_BASE_URL } from "@/components/providers/session-provider";

/**
 * The company's name, from "Company"."CompanyName" (GET /company/brand), for
 * the few places the app shows it: the sidebar beside the logo, the footer of
 * the sign-in page, the settings screen's subtitle.
 *
 * Those places printed "AdvPOS" -- the SOFTWARE's name -- typed into the code.
 * The page <title> still says AdvPOS: that is the product, and metadata is
 * rendered on the server before anybody is known.
 *
 * FAST ON PURPOSE (AGENTS.md). The first paint never waits for this:
 *   - the last name seen is kept in localStorage and shown at once;
 *   - the request goes out once per page load, whoever asks first, and every
 *     other caller shares that one answer;
 *   - on the very first visit on a device the name is simply blank for the
 *     moment the request takes, rather than flashing a wrong one.
 * Read through useSyncExternalStore, so the server render and the first client
 * render agree (blank) and there is no hydration mismatch.
 */

const STORAGE_KEY = "advpos-company-name";

let current: string | null = null;
let requested = false;
const listeners = new Set<() => void>();

function read(): string {
  if (current !== null) return current;
  try {
    current = window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    current = "";
  }
  return current;
}

function fetchOnce() {
  if (requested) return;
  requested = true;
  /* fetch rather than axios: the endpoint is anonymous and this module is
     imported by the sign-in page, which should not pull axios in for a name. */
  fetch(`${API_BASE_URL}/company/brand`)
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { name?: string } | null) => {
      const name = body?.name?.trim();
      if (!name || name === current) return;
      current = name;
      try { window.localStorage.setItem(STORAGE_KEY, name); } catch { /* private mode */ }
      listeners.forEach((l) => l());
    })
    .catch(() => { /* keep whatever was cached; the name is not worth an error */ });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  fetchOnce();
  return () => { listeners.delete(onChange); };
}

/** Call after the name is saved at /admin/settings, so the sidebar follows at once. */
export function setCompanyName(name: string) {
  current = name.trim();
  try { window.localStorage.setItem(STORAGE_KEY, current); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function useCompanyName(): string {
  return React.useSyncExternalStore(subscribe, read, () => "");
}
