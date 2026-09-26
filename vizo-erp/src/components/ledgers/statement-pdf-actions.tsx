"use client";

import * as React from "react";
import axios from "axios";
import { Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { exportError } from "@/lib/export";
import { asAttachment } from "@/lib/documents";

/**
 * Print and Download for a statement of account -- the A4 PDF the API draws
 * with the same engine and palette as every other document here.
 *
 * ARCHIVED ON EVERY PRINT, like the rest of the documents: the POST renders it
 * and pushes it to the document store (one file per account and date range,
 * replaced when the same range is printed again), and the screen then opens
 * THAT file -- so what was printed is what is stored.
 *
 * Two traps this steers round (HANDOFF 14 and 15): a plain window.open on an
 * /api route carries no bearer token and opens a 401, so a stored file that
 * Cloudinary will not serve is fetched as a blob WITH the header instead; and
 * the tab is opened inside the click, before any await, or a popup blocker
 * eats it.
 */
export function StatementPdfActions({
  path,
  from,
  to,
  fileName,
}: {
  /** e.g. "ledgers/customers/15/statement/pdf" */
  path: string;
  from: string;
  to: string;
  fileName: string;
}) {
  const [busy, setBusy] = React.useState<"print" | "download" | null>(null);
  const params = { from, to };

  async function blob() {
    const res = await axios.get<Blob>(`${API_BASE_URL}/${path}`, {
      params, headers: authHeader(), responseType: "blob",
    });
    return URL.createObjectURL(res.data);
  }

  /** Stores it; returns the stored link when the store will actually serve it. */
  async function archive(): Promise<string | null> {
    try {
      const res = await axios.post<{ pdfUrl: string; isDeliverable: boolean }>(
        `${API_BASE_URL}/${path}`, {}, { params, headers: authHeader() });
      return res.data.isDeliverable ? res.data.pdfUrl : null;
    } catch {
      /* The store being down must not stop a print -- the bytes can still be
         rendered on the spot. */
      return null;
    }
  }

  async function print() {
    const tab = window.open("", "_blank");
    setBusy("print");
    try {
      const stored = await archive();
      const url = stored ?? (await blob());
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      tab?.close();
      toast.error("Could not open the statement", { description: await exportError(e) });
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    try {
      const stored = await archive();
      if (stored) {
        window.open(asAttachment(stored, true), "_blank", "noopener,noreferrer");
      } else {
        const url = await blob();
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      toast.success("Statement saved", { description: "A copy is in the document store." });
    } catch (e) {
      toast.error("Could not download the statement", { description: await exportError(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="md" className="gap-1.5" disabled={busy !== null} onClick={() => void print()}>
        {busy === "print" ? <Loader2 className="animate-spin" /> : <Printer />}
        <span>Print</span>
      </Button>
      <Button variant="secondary" size="md" className="gap-1.5" disabled={busy !== null} onClick={() => void download()}>
        {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}
        <span className="hidden sm:inline">Download PDF</span>
        <span className="sm:hidden">PDF</span>
      </Button>
    </div>
  );
}
