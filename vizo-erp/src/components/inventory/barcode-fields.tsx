"use client";

import * as React from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Plus, Trash2, ScanLine, Barcode as BarcodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* The scanner and its camera code load only when somebody presses Scan. */
const BarcodeScannerDialog = dynamic(
  () => import("@/components/inventory/barcode-scanner-dialog").then((m) => m.BarcodeScannerDialog),
  { ssr: false },
);

type Lookup = {
  code: string;
  taken: boolean;
  owner: { id: number; name: string; sku: string } | null;
  sku: string | null;
};

/* ───────────────────────────────────────────────────────────────────────────
   A PRODUCT'S BARCODES

   Any number of them, each one typed or scanned, each one editable after it
   arrives. Scanned codes are checked against the catalogue the moment they are
   read, so a code that already belongs to another product is refused on the
   spot rather than by Save a minute later.

   A barcode that CARRIES one of our own SKUs (VZ-…) — the box printed with the
   code we gave it — hands that SKU to the form through `onSkuFound`. The brief
   is explicit: whatever SKU was generated gives way to the one on the box.
   ─────────────────────────────────────────────────────────────────────────── */
export function BarcodeFields({
  value,
  onChange,
  productId,
  onSkuFound,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** On an edit, the product's own codes are not "taken by another product". */
  productId?: number;
  onSkuFound?: (sku: string) => void;
}) {
  const [scanning, setScanning] = React.useState(false);
  const [problems, setProblems] = React.useState<Record<number, string>>({});

  const rows = value.length === 0 ? [""] : value;

  const lookup = React.useCallback(async (code: string): Promise<Lookup | null> => {
    try {
      const res = await axios.get<Lookup>(`${API_BASE_URL}/inventory/barcodes/lookup`, {
        params: { code, excludeProductId: productId }, headers: authHeader(),
      });
      return res.data;
    } catch {
      return null;
    }
  }, [productId]);

  function setRow(i: number, code: string) {
    const next = [...rows];
    next[i] = code;
    onChange(next);
    if (problems[i]) setProblems(({ [i]: _drop, ...rest }) => rest);
  }

  function removeRow(i: number) {
    const next = rows.filter((_, j) => j !== i);
    onChange(next.length ? next : [""]);
    setProblems({});
  }

  /* A typed code is checked when the person leaves the box. */
  async function checkRow(i: number) {
    const code = rows[i]?.trim();
    if (!code) return;

    if (rows.some((c, j) => j !== i && c.trim() === code)) {
      setProblems((p) => ({ ...p, [i]: "This barcode is already in the list." }));
      return;
    }
    const found = await lookup(code);
    if (found?.taken && found.owner) {
      setProblems((p) => ({ ...p, [i]: `Already belongs to ${found.owner!.name} (${found.owner!.sku}).` }));
    } else if (found?.sku) {
      onSkuFound?.(found.sku);
    }
  }

  async function scanned(code: string) {
    const clean = code.trim();
    if (!clean) return;

    if (rows.some((c) => c.trim() === clean)) {
      toast.info("That barcode is already in the list", { description: clean });
      return;
    }

    const found = await lookup(clean);
    if (found?.taken && found.owner) {
      toast.error("Barcode already in use", {
        description: `${clean} belongs to ${found.owner.name} (${found.owner.sku}).`,
      });
      return;
    }

    /* Into the first empty box, or a new one. */
    const empty = rows.findIndex((c) => !c.trim());
    const next = [...rows];
    if (empty >= 0) next[empty] = clean; else next.push(clean);
    onChange(next);

    if (found?.sku) {
      onSkuFound?.(found.sku);
      toast.success("Barcode scanned — SKU taken from it", { description: `${clean} → ${found.sku}` });
    } else {
      toast.success("Barcode scanned", { description: clean });
    }
  }

  return (
    <div>
      <div className="space-y-2">
        {rows.map((code, i) => (
          <div key={i}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <BarcodeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9 tabular"
                  placeholder="Scan or type a barcode"
                  value={code}
                  aria-invalid={problems[i] ? true : undefined}
                  onChange={(e) => setRow(i, e.target.value)}
                  onBlur={() => void checkRow(i)}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove barcode"
                className="text-danger" onClick={() => removeRow(i)}
                disabled={rows.length === 1 && !code}>
                <Trash2 />
              </Button>
            </div>
            {problems[i] && <p className="mt-1 text-xs text-danger">{problems[i]}</p>}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="accent" size="sm" className="gap-1.5" onClick={() => setScanning(true)}>
          <ScanLine /> Scan barcode
        </Button>
        <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => onChange([...rows, ""])}>
          <Plus /> Add another
        </Button>
      </div>

      {scanning && (
        <BarcodeScannerDialog
          open={scanning}
          onOpenChange={setScanning}
          onDetected={(c) => void scanned(c)}
        />
      )}
    </div>
  );
}

/** Whether any barcode row carries a problem the form should refuse to save with. */
export function cleanBarcodes(codes: string[]): string[] {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
}
