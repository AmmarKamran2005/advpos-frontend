"use client";

import * as React from "react";
import axios from "axios";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { apiMessage } from "@/components/ledgers/ledger-kit";
import { todayISO } from "@/lib/dates";

/** What the add/edit form needs from GET /ledgers/staff/lookups. */
export type StaffLookups = {
  categories: { id: number; name: string; inUse: number }[];
  unlinkedUsers: { id: number; name: string; role: string }[];
};

/* ─────────────────────────── add / edit a person ─────────────────────────── */

export type StaffFormValue = {
  fullName: string; categoryId: string; phone: string; cnic: string; monthlySalary: string;
  openingBalance: string; joinedOn: string; notes: string; userId: string; isActive: boolean;
};

export function StaffDialog({
  open, onOpenChange, lookups, onSaved, editId, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lookups: StaffLookups;
  onSaved: (id: number) => void;
  editId?: number;
  initial?: Partial<StaffFormValue>;
}) {
  const blank: StaffFormValue = {
    fullName: "", categoryId: "", phone: "", cnic: "", monthlySalary: "", openingBalance: "",
    joinedOn: todayISO(), notes: "", userId: "", isActive: true,
  };
  const [v, setV] = React.useState<StaffFormValue>({ ...blank, ...initial });
  const [saving, setSaving] = React.useState(false);
  const set = (k: keyof StaffFormValue, value: string | boolean) => setV((cur) => ({ ...cur, [k]: value }));

  /* A fresh form every time it opens. */
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setV({ ...blank, ...initial });
  }

  async function save() {
    if (!v.fullName.trim()) { toast.error("A name is needed."); return; }
    if (!v.categoryId) { toast.error("Pick a staff category -- every staff account needs one."); return; }
    setSaving(true);
    try {
      const body = {
        fullName: v.fullName.trim(), categoryId: Number(v.categoryId), phone: v.phone.trim() || null,
        cnic: v.cnic.trim() || null, monthlySalary: Number(v.monthlySalary) || 0,
        openingBalance: Number(v.openingBalance) || 0, joinedOn: v.joinedOn || null, notes: v.notes.trim() || null,
        userId: v.userId ? Number(v.userId) : null, isActive: v.isActive,
      };
      const res = editId
        ? await axios.put<{ id: number; message: string }>(`${API_BASE_URL}/ledgers/staff/${editId}`, body, { headers: authHeader() })
        : await axios.post<{ id: number; message: string }>(`${API_BASE_URL}/ledgers/staff`, body, { headers: authHeader() });
      toast.success(editId ? "Saved" : "Added", { description: res.data.message });
      onSaved(res.data.id ?? editId!);
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit staff account" : "New staff account"}</DialogTitle>
          <DialogDescription>
            {editId ? "Details and salary. The ledger itself is changed with its own rows."
              : "For a driver, a helper -- anybody on the payroll. No login is created: this person cannot sign in."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label required>Full name</Label>
            <Input value={v.fullName} onChange={(e) => set("fullName", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label required>Staff category</Label>
            <SelectNative value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="mt-1">
              <option value="">Pick one…</option>
              {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectNative>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" className="mt-1" />
          </div>
          <div>
            <Label>Monthly salary</Label>
            <Input value={v.monthlySalary} onChange={(e) => set("monthlySalary", e.target.value)} inputMode="decimal" className="mt-1 tabular" />
          </div>
          <div>
            <Label>Opening balance</Label>
            <Input value={v.openingBalance} onChange={(e) => set("openingBalance", e.target.value)} inputMode="decimal" className="mt-1 tabular" />
            <p className="text-2xs text-slate-500 mt-0.5">Owed to them positive; an advance negative.</p>
          </div>
          <div>
            <Label>CNIC</Label>
            <Input value={v.cnic} onChange={(e) => set("cnic", e.target.value)} placeholder="00000-0000000-0" className="mt-1" />
          </div>
          <div>
            <Label>Joined on</Label>
            <Input type="date" value={v.joinedOn} onChange={(e) => set("joinedOn", e.target.value)} className="mt-1" />
          </div>
          {lookups.unlinkedUsers.length > 0 && (
            <div className="sm:col-span-2">
              <Label>Also signs in as (optional)</Label>
              <SelectNative value={v.userId} onChange={(e) => set("userId", e.target.value)} className="mt-1">
                <option value="">Nobody -- no login</option>
                {lookups.unlinkedUsers.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}
              </SelectNative>
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Input value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={300} className="mt-1" />
          </div>
          {editId && (
            <label className="sm:col-span-2 text-sm text-navy-900 dark:text-white inline-flex items-center gap-2">
              <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Still working here
            </label>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-1.5" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="animate-spin" /> : <Plus />} {editId ? "Save" : "Add to payroll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
