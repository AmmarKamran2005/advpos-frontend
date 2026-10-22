"use client";

import * as React from "react";

/**
 * ONE REFRESH BUTTON, ON EVERY PAGE, IN THE SAME PLACE (the owner, 21 Oct:
 * "all the refresh buttons through the project must be on front and i can
 * easily quick refresh of any data on any web page").
 *
 * The pages had refresh buttons of their own -- some in the header, some tucked
 * into a table toolbar as a bare icon, some inside a "..." menu -- and about
 * half the screens had none at all. Wiring a button into a hundred pages one by
 * one would have produced a hundred slightly different buttons. Instead the top
 * bar carries one, and it works in two ways:
 *
 *   1. A page that has its own reload registers it here with usePageRefresh.
 *      The button calls that, so the page keeps its filters, its search box,
 *      its page number and anything typed into a form -- only the data is
 *      fetched again.
 *   2. A page that registers nothing is REMOUNTED (AppShell changes the key on
 *      its content). Every useEffect runs again and every fetch goes out again,
 *      exactly as if it had been opened fresh -- the dropdowns on a form
 *      included, which is the stale-dropdown problem this project has hit
 *      before.
 *
 * A module-level set rather than a React context: the top bar and the page are
 * siblings under the shell, and the only thing that crosses between them is
 * "run these functions now".
 */
type Reload = () => unknown | Promise<unknown>;

const reloaders = new Set<{ current: Reload }>();

/**
 * Register this page's reload with the top bar's Refresh button. Pass the same
 * function the page's own Refresh / Try again button already calls.
 */
export function usePageRefresh(reload: Reload) {
  /* Held in a ref so the registration does not churn on every render while
     still always calling the latest closure (current filters, current page). */
  const ref = React.useRef(reload);
  React.useEffect(() => {
    ref.current = reload;
  });
  React.useEffect(() => {
    const entry = { current: (() => ref.current()) as Reload };
    reloaders.add(entry);
    return () => {
      reloaders.delete(entry);
    };
  }, []);
}

/**
 * Run every registered reload. Resolves to false when nothing on screen
 * registered one, which tells the caller to remount the page instead.
 */
export async function runPageRefresh(): Promise<boolean> {
  if (reloaders.size === 0) return false;
  await Promise.allSettled([...reloaders].map((r) => Promise.resolve(r.current())));
  return true;
}
