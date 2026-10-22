"use client";

import * as React from "react";
import axios from "axios";
import { Pencil, Trash2, Plus, Check, X, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   LOGISTICS COMPANIES — accounts that duty is owed to

   The owner (26 Sep): duty is paid to a logistics company, and each company
   is "as a account" — an account of its own under 2150 Logistics Companies,
   which the admin can add, rename and delete right where he types the duty.
   GET/POST/PUT/DELETE /purchases/logistics.

   A company that already has duty against it is SWITCHED OFF rather than
   deleted: the ledger would otherwise lose what we owe it. The API decides and
   says which it did.
   ─────────────────────────────────────────────────────────────────────────── */

export type LogisticsCompany = {
  id: number; code: string; name: string; isActive: boolean; balance: number; used: boolean;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) return (e.response.data as { message?: string })?.message ?? fallback;
  return "Cannot reach the server.";
}

export function LogisticsList({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = React.useState<LogisticsCompany[] | null>(null);
  const [adding, setAdding] = React.useState("");
  const [editId, setEditId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const r = await axios.get<LogisticsCompany[]>(`${API_BASE_URL}/purchases/logistics?includeInactive=true`, { headers: authHeader() });
      setRows(r.data);
    } catch (e) {
      toast.error("Could not load logistics companies", { description: apiMessage(e, "Please try again.") });
      setRows([]);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the component driven by
       useState/useEffect; see the other pages. */
    void load();
  }, [load]);

  async function run(fn: () => Promise<{ message?: string }>) {
    setBusy(true);
    try {
      const res = await fn();
      if (res.message) toast.success(res.message);
      await load();
      onChanged?.();
      return true;
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const add = () => adding.trim() && run(async () => {
    const r = await axios.post(`${API_BASE_URL}/purchases/logistics`, { name: adding.trim() }, { headers: authHeader() });
    setAdding("");
    return r.data;
  });

  const rename = (id: number) => run(async () => {
    const r = await axios.put(`${API_BASE_URL}/purchases/logistics/${id}`, { name: editName.trim() }, { headers: authHeader() });
    setEditId(null);
    return r.data;
  });

  const toggle = (c: LogisticsCompany) => run(async () =>
    (await axios.put(`${API_BASE_URL}/purchases/logistics/${c.id}`, { name: c.name, isActive: !c.isActive }, { headers: authHeader() })).data);

  const remove = (c: LogisticsCompany) => {
    if (!window.confirm(c.used
      ? `${c.name} has duty on its account, so it will be switched off, not deleted. Continue?`
      : `Delete ${c.name}?`)) return;
    void run(async () => (await axios.delete(`${API_BASE_URL}/purchases/logistics/${c.id}`, { headers: authHeader() })).data);
  };

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <Input placeholder="New logistics company, e.g. TCS Cargo" value={adding} onChange={(e) => setAdding(e.target.value)} maxLength={100} />
        <Button type="submit" variant="accent" disabled={busy || !adding.trim()} className="gap-1 shrink-0">
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}Add
        </Button>
      </form>

      {rows === null ? (
        <div className="py-6 text-center text-sm text-slate-400"><Loader2 className="inline size-4 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-navy-700">
          <Truck className="mx-auto mb-2 size-6 text-slate-300" />
          No logistics company yet. Add the first one above.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-navy-700 dark:border-navy-700">
          {rows.map((c) => (
            <div key={c.id} className={cn("flex flex-wrap items-center gap-2 px-3 py-2.5", !c.isActive && "opacity-60")}>
              <span className="tabular text-2xs text-slate-500 w-12">{c.code}</span>
              {editId === c.id ? (
                <form className="flex flex-1 items-center gap-1 min-w-48" onSubmit={(e) => { e.preventDefault(); void rename(c.id); }}>
                  <Input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className="h-8" />
                  <Button type="submit" size="icon-sm" variant="accent" disabled={busy} aria-label="Save"><Check /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => setEditId(null)} aria-label="Cancel"><X /></Button>
                </form>
              ) : (
                <div className="flex-1 min-w-40">
                  <div className="text-sm font-medium text-navy-900 dark:text-white">{c.name}</div>
                  <div className="text-2xs text-slate-500">
                    {c.isActive ? "In use" : "Switched off"} · owed {formatMoney(c.balance)}
                  </div>
                </div>
              )}
              {editId !== c.id && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void toggle(c)} disabled={busy}>
                    {c.isActive ? "Switch off" : "Switch on"}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Rename" onClick={() => { setEditId(c.id); setEditName(c.name); }}><Pencil /></Button>
                  <Button size="icon-sm" variant="ghost" className="text-danger" aria-label="Delete" onClick={() => remove(c)} disabled={busy}><Trash2 /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The same list in a popup, opened from beside a Duty box. */
export function LogisticsDialog({ open, onOpenChange, onChanged }: {
  open: boolean; onOpenChange: (o: boolean) => void; onChanged?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Logistics companies</DialogTitle>
          <DialogDescription>Duty is owed to these. Each is its own account in the ledger.</DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-6">
          <LogisticsList onChanged={onChanged} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
