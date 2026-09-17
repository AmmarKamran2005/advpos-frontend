/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Notification links, and why they are absolute
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every notification now carries a FULL URL — "https://advpos-frontend.vercel
 * .app/sales/orders/42" rather than "/sales/orders/42". It has to: a Web Push
 * payload is opened by the service worker with `clients.openWindow`, and a bare
 * path there resolves against the worker's own scope rather than against the
 * site. The same text also gets forwarded and pasted, where a path is not a
 * link at all.
 *
 * The origin comes from the API, which reads it from `App:WebBaseUrl` — see
 * backend Services/AppLinks.cs. It is configuration, so it moves per
 * environment without a deploy.
 *
 * WHICH LEAVES ONE PROBLEM HERE. Handing `<Link href>` an absolute URL makes
 * Next treat it as external: a full page load, the whole bundle downloaded
 * again, and the app booted from scratch — for a click on your own bell inside
 * your own app. That is exactly the kind of second-long stall AGENTS.md is
 * about.
 *
 * So: when the link points at the site you are already on, strip it back to a
 * path and let the router do its job. When it points somewhere else — reading
 * production's bell on a local build, say — leave it alone and let it open as
 * an ordinary link, because in that case going there really is a navigation.
 */

/**
 * A notification's URL as this browser should follow it.
 *
 * Returns a path for a same-origin link, the URL untouched for anything else,
 * and null when there is nothing to open. Never throws — a malformed URL out of
 * an old row makes the row unclickable, which is what it already was.
 */
export function appHref(url: string | null | undefined): string | null {
  if (!url) return null;

  const raw = url.trim();
  if (raw.length === 0) return null;

  /* Already a path. Rows written before the API started sending absolute URLs
     look like this, and they are still perfectly good in-app links. */
  if (raw.startsWith("/")) return raw;

  /* On the server there is no window to compare against, and no router to save
     either — the value is only rendered, so hand it back as it stands. */
  if (typeof window === "undefined") return raw;

  try {
    const target = new URL(raw, window.location.origin);
    if (target.origin === window.location.origin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
    return target.toString();
  } catch {
    return null;
  }
}
