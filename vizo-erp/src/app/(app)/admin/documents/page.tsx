"use client";

import * as React from "react";
import axios from "axios";
import {
  FileText, AlertCircle, RefreshCw, ExternalLink, CloudUpload,
  CheckCircle2, HardDrive, ChevronLeft, ChevronRight, Copy,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatRelative } from "@/lib/format";

/* GET /documents -- every PDF this system has generated, and the Cloudinary
   link it was pushed to.

   This screen exists to answer one question without anybody having to trust a
   claim: where do the PDFs actually go? Every row shows the real delivery URL,
   and whether that URL will actually serve the file to somebody with no
   account. Nothing is written to the API host's filesystem at any point. */
type StoredDoc = {
  id: number;
  kind: string;
  docKey: string;
  docNo: string | null;
  fileName: string;
  pdfUrl: string;
  bytes: number;
  isDeliverable: boolean;
  generatedAt: string;
  generatedBy: string | null;
  shareUrl: string;
};

type StorePage = {
  total: number; page: number; pageSize: number; undeliverable: number; items: StoredDoc[];
};

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** The document kinds the API can produce, for the filter. */
const KINDS: { value: string; label: string }[] = [
  { value: "", label: "Every kind" },
  { value: "purchase-order", label: "Purchase orders" },
  { value: "purchase-invoice", label: "Purchase invoices" },
  { value: "goods-receipt", label: "Goods receipts" },
  { value: "purchase-return", label: "Purchase returns" },
  { value: "stock-adjustment", label: "Stock adjustments" },
  { value: "stock-transfer", label: "Stock transfers" },
  { value: "voucher", label: "Vouchers" },
  { value: "journal-entry", label: "Journal entries" },
  { value: "expense", label: "Expense vouchers" },
  { value: "party-statement", label: "Account statements" },
  { value: "report.sales-summary", label: "Report · Sales summary" },
  { value: "report.aging-customer", label: "Report · Customer ageing" },
  { value: "report.aging-supplier", label: "Report · Supplier ageing" },
  { value: "report.dead-stock", label: "Report · Dead stock" },
  { value: "report.slow-moving", label: "Report · Slow moving" },
  { value: "report.top-customers", label: "Report · Top customers" },
  { value: "statement.trial-balance", label: "Statement · Trial balance" },
  { value: "statement.balance-sheet", label: "Statement · Balance sheet" },
  { value: "statement.profit-loss", label: "Statement · Profit and loss" },
  { value: "statement.cash-flow", label: "Statement · Cash flow" },
  { value: "statement.ledger", label: "Statement · Ledger" },
];

const PAGE_SIZE = 25;

const prettyKind = (k: string) =>
  KINDS.find((x) => x.value === k)?.label ?? k.replace(/[.-]/g, " ");

const kb = (b: number) => `${Math.max(1, Math.round(b / 1024))} KB`;

export default function DocumentStorePage() {
  const [data, setData] = React.useState<StorePage>({
    total: 0, page: 1, pageSize: PAGE_SIZE, undeliverable: 0, items: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<StorePage>(`${API_BASE_URL}/documents`, {
        params: { kind: kind || undefined, q: search.trim() || undefined, page, pageSize: PAGE_SIZE },
        headers: authHeader(),
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the document store."));
    } finally {
      setLoading(false);
    }
  }, [kind, search, page]);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy the link")
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Setup" }, { label: "Document Store" }]}
        title="Document Store"
        subtitle="Every PDF the system has generated, and the Cloudinary link it was pushed to."
        actions={
          <Button variant="ghost" size="md" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
            <RefreshCw className="size-4" />Refresh
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => { setLoading(true); void load(); }}>Try again</Button>
          </div>
        </Card>
      )}

      {/* Where the files live. Worth stating plainly on the screen, because
          "are these on the server's disk somewhere?" is the question this
          page exists to answer. */}
      <Card className="mb-6 bg-info/5 border-info/30">
        <CardBody className="flex items-start gap-3">
          <HardDrive className="size-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm text-info-dark/90 dark:text-info-light/90">
            <span className="font-semibold text-info-dark dark:text-info-light">
              Nothing is stored on the API server.
            </span>{" "}
            Every document is rendered in memory from the database and pushed straight to the
            documents Cloudinary account (<span className="tabular">CloudinaryPdfs</span> in
            <span className="tabular"> appsettings.json</span>). The links below are the real
            delivery URLs — open one and you get the file.
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Documents stored</div>
              <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">{data.total}</div>
            </div>
            <FileText className="size-5 text-slate-300 dark:text-navy-600" />
          </div>
        </Card>
        <Card className={data.undeliverable > 0 ? "p-4 bg-warning/5 border-warning/20" : "p-4"}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Not being served</div>
              <div className={`text-2xl tabular font-bold mt-1 ${data.undeliverable > 0 ? "text-warning" : "text-success"}`}>
                {data.undeliverable}
              </div>
            </div>
            {data.undeliverable > 0
              ? <CloudUpload className="size-5 text-warning" />
              : <CheckCircle2 className="size-5 text-success" />}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Cloudinary folder</div>
          <div className="text-sm tabular font-semibold text-navy-900 dark:text-white mt-2">advpos/documents</div>
        </Card>
      </div>

      {data.undeliverable > 0 && (
        <Card className="mb-6 bg-warning/5 border-warning/30">
          <CardBody className="flex items-start gap-3">
            <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-warning-dark/90 dark:text-warning-light/90">
              <span className="font-semibold text-warning-dark dark:text-warning-light">
                {data.undeliverable} file{data.undeliverable === 1 ? "" : "s"} uploaded but will not open.
              </span>{" "}
              Cloudinary blocks PDF delivery by default on accounts created since 2023 — the upload
              succeeds and the link answers 401. Fix it in the Cloudinary console under
              Settings → Security → Restricted media types, then re-save those documents. Nothing in
              the code needs changing.
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <Label htmlFor="doc-search">Search</Label>
            <Input
              id="doc-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Document number or file name…"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="doc-kind">Kind</Label>
            <SelectNative
              id="doc-kind"
              value={kind}
              onChange={(e) => { setKind(e.target.value); setPage(1); }}
              className="mt-1.5"
            >
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </SelectNative>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FileText}
              title="Nothing stored yet"
              description={
                kind || search
                  ? "Nothing matches those filters."
                  : "Documents appear here as soon as somebody saves one — from an invoice, a purchase order, a statement or a report."
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.items.map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="size-10 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-slate-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="tabular text-sm font-semibold text-navy-900 dark:text-white">
                        {d.docNo ?? d.fileName}
                      </span>
                      <Badge variant="muted">{prettyKind(d.kind)}</Badge>
                      {d.isDeliverable
                        ? <Badge variant="success">Serving</Badge>
                        : <Badge variant="warning">Not served</Badge>}
                    </div>
                    <div className="text-2xs text-slate-500 dark:text-slate-400 mt-1 truncate">{d.pdfUrl}</div>
                    <div className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {kb(d.bytes)} · {formatDate(d.generatedAt)} · {formatRelative(d.generatedAt)}
                      {d.generatedBy && ` · by ${d.generatedBy}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copy(d.pdfUrl)}>
                      <Copy />Copy link
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => window.open(d.pdfUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink />Open
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {pageCount > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Page {data.page} of {pageCount} · {data.total} documents
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="gap-1"
                  disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft />Previous
                </Button>
                <Button variant="secondary" size="sm" className="gap-1"
                  disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Next<ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
