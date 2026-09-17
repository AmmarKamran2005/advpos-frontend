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
  const tab = window.open("", "_blank", "noopener,noreferrer");
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
