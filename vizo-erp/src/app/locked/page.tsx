"use client";

import Link from "next/link";
import { Lock, ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-6">
      <div className="text-center max-w-md">
        <div className="size-16 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="size-8 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Account locked</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Your account has been temporarily locked due to too many failed sign-in attempts. For your security, please wait 30 minutes or contact your administrator.
        </p>

        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4 mt-6 text-left">
          <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            <Lock className="size-3.5" />
            What happened
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <li>• 5 failed login attempts in 10 minutes triggered the lock</li>
            <li>• Lock duration: 30 minutes from last attempt</li>
            <li>• An email has been sent to the account owner</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="secondary" size="md" asChild>
            <Link href="/forgot-password">Reset Password</Link>
          </Button>
          <Button variant="accent" size="md" asChild className="gap-1.5">
            <a href="mailto:support@vizo.com.pk">
              <Mail className="size-4" /> Contact Admin
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
