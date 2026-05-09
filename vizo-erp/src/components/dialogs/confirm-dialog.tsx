"use client";

import * as React from "react";
import { AlertTriangle, Trash2, X, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: (reason?: string) => void | Promise<void>;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  loading?: boolean;
}

const VARIANT_ICON = {
  danger:  { icon: Trash2,         bg: "bg-danger/10",  fg: "text-danger" },
  warning: { icon: AlertTriangle,  bg: "bg-warning/10", fg: "text-warning" },
  info:    { icon: Check,          bg: "bg-info/10",    fg: "text-info" },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Explain why…",
  loading,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState<string | null>(null);
  const meta = VARIANT_ICON[variant];
  const Icon = meta.icon;

  React.useEffect(() => {
    if (!open) {
      setReason("");
      setReasonError(null);
    }
  }, [open]);

  async function handleConfirm() {
    if (requireReason && reason.trim().length < 5) {
      setReasonError("Please provide at least 5 characters explaining the reason.");
      return;
    }
    setReasonError(null);
    await onConfirm(requireReason ? reason : undefined);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" showClose={!loading}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`size-10 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`size-5 ${meta.fg}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>

        {requireReason && (
          <DialogBody>
            <Label htmlFor="confirm-reason" required>{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(null); }}
              aria-invalid={!!reasonError}
              className="mt-1.5"
            />
            {reasonError && <p className="text-xs text-danger mt-1.5 inline-flex items-center gap-1">
              <AlertTriangle className="size-3" /> {reasonError}
            </p>}
          </DialogBody>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            <X />
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "accent"}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Processing…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
