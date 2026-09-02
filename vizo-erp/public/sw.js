/*  AdvPOS / VIZO service worker.
 *
 *  Its ONLY job is notifications. It deliberately does not cache anything and
 *  does not intercept fetches: this application is a live view of a shared
 *  database, and a service worker that serves a stale order list from cache is
 *  worse than one that does nothing at all.
 *
 *  Served from /sw.js so its scope is the whole origin. Push requires HTTPS
 *  everywhere except localhost.
 */

/* Take over immediately on install rather than waiting for every tab to close.
   Otherwise a person who allows notifications has to shut the app down before
   any arrive, and concludes it does not work. */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  /* Defaults for every field. A push whose payload is missing or malformed
     must still show something -- a silent failure here looks to the user
     exactly like "notifications are broken". */
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "VIZO", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "VIZO";
  const options = {
    body: data.body || "",
    /* The VIZO mark, generated from public/vizo-logo.png. A notification
       carrying the shop's own logo is one people trust; the browser's default
       puzzle-piece is one they swipe away without reading. */
    icon: data.icon || "/icon-192.png",
    /* Android draws the badge as a monochrome silhouette in the status bar,
       which is why it is a separate white-on-transparent file. */
    badge: data.badge || "/badge-96.png",
    /* Only money and exceptions buzz. Everything else arrives quietly --
       see NotificationKinds.Severe on the server. */
    vibrate: data.severe ? [200, 100, 200] : undefined,
    requireInteraction: Boolean(data.severe),
    data: { url: data.url || "/dashboard" },
    /* Same tag replaces an earlier notification rather than stacking. The
       server sends no tag today, so each is its own; left here because the
       daily low-stock digest is the obvious first user of it. */
    tag: data.tag || undefined,
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || "/dashboard";

  /* Focus a tab that is already open rather than opening a fourth copy of the
     app, and navigate that one. Somebody who taps six notifications should end
     up with one window, not six. */
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) return client.navigate(target);
            return undefined;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return undefined;
      })
  );
});
