"use client";

import * as React from "react";
import axios from "axios";
import { Printer, Download, CloudUpload, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * Print / Download / Save-to-store for one document.
 *
 * WHAT IT REPLACED. Every one of these screens had a Print button calling
 * `window.print()`, which prints the WEB PAGE -- sidebar, buttons, filter
 * chips and all -- at whatever width the window happens to be, and stores
 * nothing anywhere. A few had a Print button with no onClick at all.
 *
 * All three actions here go through the API, which renders a proper A4
 * document from the database:
 *
 *   Print / Download  GET  /documents/{kind}/{id}/pdf   built on demand
 *   Save to store     POST /documents/{kind}/{id}/pdf   pushed to Cloudinary
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

  const pdfUrl = `${API_BASE_URL}/documents/${kind}/${id}/pdf`;

  function open() {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }

  async function save() {
    setSaving(true);
    try {
      const res = await axios.post<StoredFile>(
        `${API_BASE_URL}/documents/${kind}/${id}/pdf?force=true`, {}, { headers: authHeader() });
      setStored(res.data);
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} saved to the document store`, {
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
      <Button variant="ghost" size="md" className="gap-1.5" onClick={open}>
        <Printer />
        {!compact && <span className="hidden sm:inline">Print</span>}
      </Button>
      <Button variant="ghost" size="md" className="gap-1.5" onClick={open}>
        <Download />
        {!compact && <span className="hidden sm:inline">Download</span>}
      </Button>
      <Button variant="ghost" size="md" className="gap-1.5" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : stored ? <Check /> : <CloudUpload />}
        {!compact && (
          <span className="hidden sm:inline">{stored ? "Saved" : "Save to store"}</span>
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
