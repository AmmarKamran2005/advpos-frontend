"use client";

import * as React from "react";
import { Copy, Check, KeyRound, MailCheck, MailX, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shows a temporary password the server has just generated -- ONCE.
 *
 * Used by Setup -> New User (every new account) and by the user page's "Set
 * temporary password". The API returns the password in that one response and
 * keeps only its hash, so when this dialog closes nobody can read it again:
 * the admin either copies it now or sets another one later. That is said on
 * the dialog, because "where do I find it again?" is the first question.
 *
 * The email line reports what the API actually did -- sent, not asked for, or
 * failed with the mail server's reason -- never what we hoped it did.
 */
export type TemporaryPasswordResult = {
  name: string;
  email: string | null;
  password: string;
  emailRequested: boolean;
  emailed: boolean;
  emailError?: string | null;
};

export function TemporaryPasswordDialog({
  result,
  onClose,
  title = "Temporary password",
}: {
  result: TemporaryPasswordResult | null;
  onClose: () => void;
  title?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API is refused on plain http from a LAN address; select the
         text instead so Ctrl+C / long-press still works. */
      const el = boxRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  return (
    <Dialog open={result !== null} onOpenChange={(o) => { if (!o) { setCopied(false); onClose(); } }}>
      <DialogContent size="md" className="w-[calc(100%-2rem)]">
        <DialogHeader>
          <div className="size-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center mb-2">
            <KeyRound className="size-5 text-brand-yellow" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {result?.name}
            {result?.email ? <> signs in as <span className="font-medium text-navy-900 dark:text-white break-all">{result.email}</span></> : null}{" "}
            with this password, and is asked to choose their own straight away.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-stretch gap-2">
            <div
              ref={boxRef}
              className="flex-1 min-w-0 rounded-lg bg-navy-900 text-brand-yellow font-mono text-lg sm:text-xl font-bold tracking-wider px-4 py-3 text-center select-all break-all"
              aria-label="Temporary password"
            >
              {result?.password}
            </div>
            <Button type="button" variant="secondary" onClick={() => void copy()} className="gap-1.5 flex-shrink-0 h-auto">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>

          {result && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg p-3 text-xs",
                !result.emailRequested
                  ? "bg-slate-50 dark:bg-navy-900/50 text-slate-600 dark:text-slate-300"
                  : result.emailed
                  ? "bg-success/5 text-success-dark dark:text-success-light"
                  : "bg-danger/5 text-danger-dark dark:text-danger-light"
              )}
            >
              {result.emailRequested && result.emailed ? (
                <MailCheck className="size-4 flex-shrink-0" />
              ) : result.emailRequested ? (
                <MailX className="size-4 flex-shrink-0" />
              ) : (
                <Info className="size-4 flex-shrink-0" />
              )}
              <span>
                {!result.emailRequested
                  ? "No email was sent. Hand this password over yourself."
                  : result.emailed
                  ? `Also emailed to ${result.email}.`
                  : `The email could not be sent${result.emailError ? ` (${result.emailError})` : ""}. Hand this password over yourself.`}
              </span>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This is the only time it is shown — the server keeps only a scrambled copy it cannot read back.
            If it is lost, set another temporary password from the user&apos;s page.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="accent" onClick={() => { setCopied(false); onClose(); }}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
