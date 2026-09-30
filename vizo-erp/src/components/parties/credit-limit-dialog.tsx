"use client";

import * as React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatMoney } from "@/lib/format";

/**
 * "Set credit limit" on a customer's page (the owner, 30 Sep).
 *
 * One amount, saved through PATCH /parties/{id}/credit-limit. Only the Super
 * Admin and the accountant are offered it -- the page decides that by role, and
 * the API refuses everybody else with 403, so hiding the button is courtesy,
 * not the rule. A rep or the order desk can still open a customer; the limit
 * stays at 0 (no limit) until one of these two sets it.
 */
export function CreditLimitDialog({
  open, onOpenChange, partyId, partyName, current, balance, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partyId: number;
  partyName: string;
  current: number;
  balance: number;
  onSaved: () => void;
}) {
  const [amount, setAmount] = React.useState(String(current || ""));
  const [saving, setSaving] = React.useState(false);

  /* Opening the dialog again starts from what is saved, not from what was
     typed and abandoned last time. */
  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reset on open */
    if (open) setAmount(current > 0 ? String(current) : "");
  }, [open, current]);

  const value = amount.trim() === "" ? 0 : Number(amount);
  const invalid = !Number.isFinite(value) || value < 0;
  const overNow = value > 0 && balance > value;

  async function save() {
    if (invalid) return;
    setSaving(true);
    try {
      const res = await axios.patch<{ message: string }>(
        `${API_BASE_URL}/parties/${partyId}/credit-limit`,
        { amount: value },
        { headers: authHeader() }
      );
      toast.success("Credit limit saved", { description: res.data.message });
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const msg = axios.isAxiosError(e) && e.response
        ? (e.response.data as { message?: string })?.message
        : undefined;
      toast.error("Could not save the credit limit", { description: msg ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Set credit limit</DialogTitle>
          <DialogDescription>
            The most {partyName} may owe at once. An order that would take the balance above it is held
            for approval. Leave it empty or 0 for no limit.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="credit-limit-amount">Amount (PKR)</Label>
            <Input
              id="credit-limit-amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
              placeholder="e.g. 500000"
              className="tabular"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
            <div>Now: {current > 0 ? formatMoney(current) : "no limit"} · Balance: {formatMoney(balance)}</div>
            {overNow && (
              <div className="text-danger">
                The balance is already above this amount, so the next order will be held.
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="accent" onClick={() => void save()} disabled={saving || invalid}>
            {saving && <Loader2 className="size-4 animate-spin" />} Save limit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
