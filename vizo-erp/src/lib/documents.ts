import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Opening a stored document
 * ─────────────────────────────────────────────────────────────────────────────
 * Print and Download open the document's own file in the Cloudinary store —
 * the same bytes that were archived when it was created, and the same ones the
 * customer was sent over WhatsApp.
 *
 * WHY NOT JUST HIT THE API. `window.open` performs a plain browser navigation:
 * it sends cookies, and it does NOT send the `Authorization: Bearer` header
 * every `/api` route requires. Pointing a Print button at an authenticated
 * endpoint therefore opens a 401 page, which is exactly what the earlier
 * `window.open(.../pdf)` buttons did. The Cloudinary URL needs no header at
 * all, so opening it directly is both correct and simpler.
 *
 * `GET /api/documents/{kind}/{id}/download` still exists and still redirects to
 * the same file — it is there for API callers that CAN send the header. Do not
 * wire a `window.open` to it.
 */

/**
 * Cloudinary's flag for "download this rather than open it in the viewer",
 * inserted after the delivery type. Mirrors CloudinaryUrl.AsAttachment on the
 * API so both sides agree on the shape of the URL.
 *
 *   .../raw/upload/v123/advpos/documents/PO-26-0042.pdf
 *   .../raw/upload/fl_attachment/v123/advpos/documents/PO-26-0042.pdf
 *
 * Anything that does not look like a Cloudinary delivery URL is returned
 * untouched — a link that opens beats a link rewritten hopefully into a 404.
 */
export function asAttachment(url: string, attachment = true): string {
  if (!attachment || !url) return url;
  if (url.includes("/fl_attachment")) return url;

  for (const marker of ["/raw/upload/", "/image/upload/"]) {
    const at = url.indexOf(marker);
    if (at < 0) continue;
    const cut = at + marker.length;
    return `${url.slice(0, cut)}fl_attachment/${url.slice(cut)}`;
  }
  return url;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WHICH OF THE TWO LINKS TO OPEN
 * ─────────────────────────────────────────────────────────────────────────────
 * Every stored document comes back with two:
 *
 *   pdfUrl    the file in the Cloudinary store
 *   shareUrl  the API's own signed link, which renders the same bytes and
 *             needs no account
 *
 * Cloudinary is the one you want — it is the actual archived copy, and it is
 * the link a customer was sent. But PDF DELIVERY IS BLOCKED BY DEFAULT on
 * accounts created since 2023: the upload succeeds, a perfectly ordinary
 * secure_url comes back, and every request to it answers 401.
 *
 * Both of this project's Cloudinary accounts are in that state today, which is
 * why Print opened an error page rather than a document — on every screen and
 * for every role. It was never a permissions problem and never the renderer.
 *
 * The API reports `isDeliverable` after HEADing the URL it stored, so the
 * choice is made from what Cloudinary actually did rather than from what it
 * said. Tick the box in the console and this starts returning the Cloudinary
 * link again on its own, with nothing here to change:
 *
 *     Settings -> Security -> Restricted media types -> allow PDF
 */
export function viewableUrl(doc: {
  pdfUrl?: string | null;
  shareUrl?: string | null;
  viewUrl?: string | null;
  isDeliverable?: boolean | null;
}): string | null {
  /* Some endpoints have already made this choice server-side and send the
     answer straight out. Trust it — it was made from the same flag. */
  if (doc.viewUrl) return doc.viewUrl;
  if (doc.isDeliverable && doc.pdfUrl) return doc.pdfUrl;
  return doc.shareUrl ?? doc.pdfUrl ?? null;
}

/** Opens a document whose stored URL is already known. */
export function openDocument(url: string, attachment = false) {
  window.open(asAttachment(url, attachment), "_blank", "noopener,noreferrer");
}

/**
 * Opens a document whose URL has to be fetched first — one that has never been
 * archived, or a page that does not carry the link.
 *
 * The tab is opened SYNCHRONOUSLY, inside the click, and pointed at the file
 * once the URL arrives. Opening it after the `await` instead is what every
 * popup blocker on earth is built to stop.
 *
 * Returns false when no URL could be had, so the caller can say so rather than
 * leaving a blank tab sitting there.
 */
export async function openDocumentWhenReady(
  resolve: () => Promise<string | null | undefined>,
  attachment = false
): Promise<boolean> {
  /* NOT "noopener" here. Browsers return null from window.open whenever
     noopener is asked for, so the tab opened but the code could never point it
     anywhere -- and then fell back to a second window.open AFTER the await,
     which every popup blocker stops. That was why a bill that had not been
     stored yet never opened, on any screen (found 27 Sep). The opener link is
     cut by hand instead, once the handle is in hand. */
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await resolve();
    if (!url) {
      tab?.close();
      return false;
    }
    const target = asAttachment(url, attachment);
    if (tab) tab.location.href = target;
    else window.open(target, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    tab?.close();
    return false;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRINT AND DOWNLOAD, WITHOUT A POPUP (27 Sep)
 * ─────────────────────────────────────────────────────────────────────────────
 * The owner: "why is the bill not printing anywhere?" Two reasons, both fixed
 * here rather than on each screen:
 *
 *   1. openDocumentWhenReady asked for noopener, got null back, and the bill
 *      tab was never pointed at the bill (see above).
 *   2. Even when a link did open, "Print" only showed the PDF in a new tab --
 *      nothing ever PRINTED.
 *
 * So Print now fetches the PDF bytes from the API WITH the sign-in header (an
 * axios call, not a navigation -- HANDOFF trap 14 does not apply), loads them
 * into a hidden frame on this page and opens the browser's print dialog on it.
 * No popup, no dependence on Cloudinary serving PDFs, and the document is
 * rebuilt from the database, so it is never stale.
 *
 * On a phone a hidden frame cannot print a PDF, so the bytes open in a tab that
 * was created INSIDE the click (the only kind a popup blocker allows), where
 * the phone's own viewer has Print/Share.
 *
 * `path` is an API path returning application/pdf, e.g.
 * `/sales/invoices/12/pdf` or `/documents/purchase-order/5/pdf`.
 */
async function fetchPdf(path: string): Promise<Blob> {
  const res = await axios.get<Blob>(`${API_BASE_URL}${path}`, { headers: authHeader(), responseType: "blob" });
  return res.data.type === "application/pdf" ? res.data : new Blob([res.data], { type: "application/pdf" });
}

const isPhone = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900;

/** Opens the print dialog for the PDF at `path`. Resolves false if it could not be fetched. */
export async function printPdf(path: string): Promise<boolean> {
  const tab = isPhone() ? window.open("", "_blank") : null;
  if (tab) tab.opener = null;
  try {
    const url = URL.createObjectURL(await fetchPdf(path));
    if (tab) {
      tab.location.href = url;
      return true;
    }
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    frame.onload = () => {
      /* Give the PDF viewer a moment to lay the pages out, then print. */
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }, 300);
    };
    frame.src = url;
    document.body.appendChild(frame);
    /* The dialog blocks until closed; clean up well after. */
    setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 120_000);
    return true;
  } catch {
    tab?.close();
    return false;
  }
}

/** Saves the PDF at `path` to the device as `filename`. */
export async function downloadPdf(path: string, filename: string): Promise<boolean> {
  try {
    const url = URL.createObjectURL(await fetchPdf(path));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}
