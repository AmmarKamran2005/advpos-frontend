"use client";

import * as React from "react";
import { API_BASE_URL, TOKEN_COOKIE } from "@/components/providers/session-provider";

/* ───────────────────────────────────────────────────────────────────────────
   THE BELL, LIVE

   Until now the bell only moved when the page reloaded. Web Push was meant to
   cover the gap, and for a phone in a pocket it does -- but it needs the
   browser's permission prompt, it is refused on iOS unless the app has been
   added to the home screen, and anybody who once clicked "Block" never sees
   another thing. None of that should decide whether a person looking straight
   at the screen finds out an order came in.

   So the bell gets its own connection: SignalR, to /hubs/notifications, with
   the JWT on the query string because a WebSocket handshake cannot carry an
   Authorization header. The server drops each new notification into the
   recipient's own group -- see backend Services/NotificationHub.cs.

   WHY THE LIBRARY IS IMPORTED INSIDE THE EFFECT. @microsoft/signalr is around
   130 KB and the bell is on every screen in the app. A top-level import puts
   all of it in the shared bundle, which every page then waits for. Imported
   here it becomes its own chunk, fetched after the page is already usable --
   AGENTS.md rule 4, heavy and rare means dynamic.
   ─────────────────────────────────────────────────────────────────────────── */

/** What the hub sends. Mirrors LiveAsync in PushNotificationService. */
export type LiveNotification = {
  id: number;
  title: string;
  body: string;
  icon: string;
  severityId: number;
  createdAt: string;
  isRead: boolean;
  url: string | null;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

/**
 * Calls `onNotification` the moment one arrives, for as long as the component
 * is mounted and somebody is signed in.
 *
 * Everything here fails quietly. A bell that does not update live is the
 * behaviour this app had last week; an error banner because a WebSocket could
 * not open is a regression.
 */
export function useLiveNotifications(
  enabled: boolean,
  onNotification: (n: LiveNotification) => void
) {
  /* Held in a ref so a new callback each render does not tear the connection
     down and build it again. Written in an effect rather than during render,
     because a ref touched while rendering is a ref React may not have
     committed yet. */
  const handler = React.useRef(onNotification);
  React.useEffect(() => {
    handler.current = onNotification;
  }, [onNotification]);

  React.useEffect(() => {
    if (!enabled) return;

    const token = readCookie(TOKEN_COOKIE);
    if (!token) return;

    /* API_BASE_URL ends in /api; the hub is mounted at the root. */
    const origin = API_BASE_URL.replace(/\/api\/?$/, "");

    let connection: { stop: () => Promise<void> } | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const signalR = await import("@microsoft/signalr");

        const built = new signalR.HubConnectionBuilder()
          .withUrl(`${origin}/hubs/notifications`, {
            accessTokenFactory: () => readCookie(TOKEN_COOKIE) ?? "",
          })
          /* Reconnects on its own. A laptop that slept through lunch should
             come back to a working bell without a page refresh. */
          .withAutomaticReconnect([0, 2000, 10000, 30000])
          .configureLogging(signalR.LogLevel.Error)
          .build();

        built.on("notification", (n: LiveNotification) => handler.current(n));

        await built.start();

        /* The component unmounted while the handshake was in flight. */
        if (cancelled) {
          void built.stop();
          return;
        }

        connection = built;
      } catch {
        /* No live channel. The bell still works on page load. */
      }
    })();

    return () => {
      cancelled = true;
      void connection?.stop();
    };
  }, [enabled]);
}
