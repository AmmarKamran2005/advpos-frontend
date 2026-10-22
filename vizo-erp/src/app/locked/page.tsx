"use client";

import Link from "next/link";
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Where the login screen sends a 423 ("This account is locked.").
 *
 * The API has ONE kind of lock: Employee.IsLocked, switched on and off by a
 * Super Admin at Setup -> Users. There is no automatic lock after failed
 * attempts, no timer that lifts it, and no email when it happens (AuthController
 * only counts failures and notifies the admins). This page used to say
 * "5 failed attempts in 10 minutes", "30 minutes" and "an email has been
 * sent" -- all three invented. It now says only what is true.
 *
 * Resetting the password does not unlock the account, so that button is gone
 * too: it sent people round a loop that ended back here.
 */
export default function LockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 sm:px-6">
      <div className="text-center max-w-md w-full">
        <div className="size-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="size-8 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Account locked</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          An administrator has locked this account, so it cannot sign in.
        </p>

        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4 mt-6 text-left">
          <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            <Lock className="size-3.5" />
            What to do
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
            <li>Ask your administrator (the Super Admin) to unlock it.</li>
            <li>It stays locked until they do — waiting will not unlock it, and neither will a new password.</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="secondary" size="md" asChild className="gap-1.5">
            <Link href="/login"><ArrowLeft className="size-4" /> Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
