/**
 * Turning notifications on and off in this browser.
 *
 * Everything here is best-effort and returns a result rather than throwing: a
 * person who cannot have notifications — an old browser, an iPhone that is not
 * installed to the home screen, a locked-down corporate policy — must still be
 * able to use the app, and must be told plainly why rather than shown a broken
 * switch.
 */

import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: string };

export type PushResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Whether this browser can do Web Push at all, and if not, why — in words the
 * person can act on.
 */
export function checkSupport(): PushSupport {
  if (typeof window === "undefined") return { supported: false, reason: "Not in a browser." };

  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "This browser does not support notifications." };
  }
  if (!("PushManager" in window)) {
    return { supported: false, reason: "This browser does not support push notifications." };
  }
  if (!("Notification" in window)) {
    return { supported: false, reason: "This browser does not support notifications." };
  }

  /* Push needs a secure context. localhost counts, which is what makes
     development possible at all. */
  if (!window.isSecureContext) {
    return { supported: false, reason: "Notifications need a secure (https) connection." };
  }

  /* iOS is the one that catches people out: Safari supports push from 16.4,
     but ONLY once the app has been added to the home screen. In a plain Safari
     tab the API is simply absent, and the honest thing is to say so rather
     than let them press a button that can never work. */
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installed =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (iOS && !installed) {
    return {
      supported: false,
      reason:
        "On iPhone, notifications only work once this app is added to the Home Screen. " +
        "Open the Share menu and choose “Add to Home Screen”, then turn them on from there.",
    };
  }

  return { supported: true };
}

/** The current permission, without asking for it. */
export function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * The VAPID public key arrives as base64url text; `subscribe` wants bytes.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/** Register the service worker, reusing an existing registration. */
async function registerWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

/**
 * Ask the browser's permission, subscribe, and tell the server about it.
 */
export async function enablePush(): Promise<PushResult> {
  const support = checkSupport();
  if (!support.supported) return { ok: false, message: support.reason };

  try {
    /* The server holds the pair. Asking it for the public key rather than
       trusting a build-time variable means a key rotation only has to happen
       in one place. */
    const cfg = await axios.get<{ enabled: boolean; publicKey: string }>(
      `${API_BASE_URL}/push/config`,
      { headers: authHeader() }
    );

    if (!cfg.data.enabled || !cfg.data.publicKey) {
      return {
        ok: false,
        message: "Notifications are not set up on the server yet. Ask your administrator.",
      };
    }

    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      return {
        ok: false,
        message:
          "Notifications are blocked for this site. Allow them in your browser settings, " +
          "then try again.",
      };
    }
    if (permission !== "granted") {
      return { ok: false, message: "Notifications were not allowed." };
    }

    const registration = await registerWorker();
    await navigator.serviceWorker.ready;

    /* An existing subscription is reused. Calling subscribe() again with a
       different key throws, and re-subscribing needlessly would orphan the row
       the server already has. */
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.data.publicKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, message: "The browser did not return a usable subscription." };
    }

    await axios.post(
      `${API_BASE_URL}/push/subscribe`,
      { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { headers: authHeader() }
    );

    return { ok: true, message: "Notifications are on for this device." };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response) {
      const msg = (e.response.data as { message?: string })?.message;
      return { ok: false, message: msg ?? "The server would not accept this device." };
    }
    return { ok: false, message: "Could not turn notifications on for this device." };
  }
}

/**
 * Stop notifications here. Unsubscribes the browser AND tells the server, so a
 * dead endpoint is not left behind to be pushed at forever.
 */
export async function disablePush(): Promise<PushResult> {
  try {
    if (!("serviceWorker" in navigator)) {
      return { ok: true, message: "Notifications are off for this device." };
    }

    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      /* Told after unsubscribing, not before: if the network call fails the
         browser has still stopped, which is what the person asked for. The
         server prunes dead endpoints on its next push anyway. */
      try {
        await axios.post(
          `${API_BASE_URL}/push/unsubscribe`,
          { endpoint },
          { headers: authHeader() }
        );
      } catch {
        /* ignored on purpose -- see above */
      }
    }

    return { ok: true, message: "Notifications are off for this device." };
  } catch {
    return { ok: false, message: "Could not turn notifications off." };
  }
}

/** Whether THIS browser currently holds a subscription. */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
