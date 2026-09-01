"use client";

import * as React from "react";
import axios from "axios";
import { Printer, Download, CloudUpload, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { openDocument, openDocumentWhenReady } from "@/lib/documents";

/**
 * Print / Download / Save-to-store for one document.
 *
 * WHAT IT REPLACED. Every one of these screens had a Print button calling
 * `window.print()`, which prints the WEB PAGE -- sidebar, buttons, filter
 * chips and all -- at whatever width the window happens to be, and stores
 * nothing anywhere. A few had a Print button with no onClick at all.
 *
 * PRINT AND DOWNLOAD OPEN THE FILE IN THE CLOUDINARY STORE. The document is
 * archived the moment it is created, so the link is usually already in hand --
 * this component asks for it on mount. Only a document that predates archiving,
 * or whose upload failed, needs one made on the spot, and then it is archived
 * before it opens.
 *
 * The bytes on screen are therefore the same bytes in the store and the same
 * ones the customer was sent. One document, not three that can drift apart.
 *
 * It opens the Cloudinary URL rather than an API route on purpose: window.open
 * is a plain navigation and carries no Authorization header, so pointing it at
 * an authenticated endpoint opens a 401 page. See lib/documents.ts.
 *
 * Nothing is written to the API host's disk at any point.
 */
export type DocumentKind =
  | "purchase-order"
  | "purchase-invoice"
  | "goods-receipt"
  | "purchase-return"
  | "stock-adjustment"
  | "stock-transfer"
  | "voucher"
  | "journal-entry"
  | "expense"
  | "party-statement";

type StoredFile = {
  archived: boolean;
  pdfUrl?: string;
  bytes?: number;
  isDeliverable?: boolean;
  generatedAt?: string;
  message?: string;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function DocumentActions({
  kind,
  id,
  label = "document",
  compact = false,
}: {
  kind: DocumentKind;
  id: number;
  /** Used in the toast wording: "Purchase order saved to the store". */
  label?: string;
  /** Icon-only buttons, for a crowded header. */
  compact?: boolean;
}) {
  const [saving, setSaving] = React.useState(false);
  const [stored, setStored] = React.useState<StoredFile | null>(null);

  /* Whether this document is already in the store, so the button can say
     "Saved" rather than offering to do something already done. Failing to find
     out is not worth an error on a page that is otherwise fine. */
  React.useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    let live = true;
    axios
      .get<StoredFile>(`${API_BASE_URL}/documents/${kind}/${id}/file`, { headers: authHeader() })
      .then((r) => { if (live && r.data.archived) setStored(r.data); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [kind, id]);

  /** Archives the document if it has never been, and returns its stored URL. */
  async function ensureStored(): Promise<string | null> {
    const res = await axios.post<StoredFile>(
      `${API_BASE_URL}/documents/${kind}/${id}/pdf`, {}, { headers: authHeader() });
    setStored(res.data);
    return res.data.pdfUrl ?? null;
  }

  async function open(attachment = false) {
    /* The common case: the link is already in hand, so the tab opens straight
       away with no round trip. */
    if (stored?.pdfUrl) {
      openDocument(stored.pdfUrl, attachment);
      return;
    }

    const opened = await openDocumentWhenReady(ensureStored, attachment);
    if (!opened) {
      toast.error("Could not open the document", {
        description: "It could not be saved to the document store. Try Save to store.",
      });
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await axios.post<StoredFile>(
        `${API_BASE_URL}/documents/${kind}/${id}/pdf?force=true`, {}, { headers: authHeader() });
      setStored(res.data);
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} rebuilt in the document store`, {
        description: res.data.isDeliverable
          ? "The stored link opens for anybody you send it to."
          : "Stored, but the document store will not serve PDFs yet — see the Cloudinary setting.",
      });
    } catch (e) {
      toast.error("Could not save the document", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void open(false)}>
        <Printer />
        {!compact && <span className="hidden sm:inline">Print</span>}
      </Button>
      <Button variant="ghost" size="md" className="gap-1.5" onClick={() => void open(true)}>
        <Download />
        {!compact && <span className="hidden sm:inline">Download</span>}
      </Button>
      <Button
        variant="ghost"
        size="md"
        className="gap-1.5"
        onClick={save}
        disabled={saving}
        title={stored ? "Rebuild the stored copy from the current data" : "Save a copy to the document store"}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : stored ? <Check /> : <CloudUpload />}
        {!compact && (
          <span className="hidden sm:inline">{stored ? "Stored" : "Save to store"}</span>
        )}
      </Button>
      {stored?.pdfUrl && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open the stored copy"
          title="Open the copy in the document store"
          onClick={() => window.open(stored.pdfUrl!, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink />
        </Button>
      )}
    </>
  );
}
