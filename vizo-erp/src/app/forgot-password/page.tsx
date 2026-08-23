"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Mail, ArrowLeft, Loader2, CheckCircle2, KeyRound, Lock, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster, toast } from "@/components/ui/toaster";
import { API_BASE_URL } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/**
 * Three steps on one screen:
 *
 *   1. address  -> POST /auth/forgot-password   emails a six-digit code
 *   2. code     -> POST /auth/verify-code       checks it without spending it
 *   3. password -> POST /auth/reset-password    spends it and sets the password
 *
 * Step 2 is separate from step 3 on purpose: it lets somebody find out they
 * mistyped the code before they have picked a new password.
 */

type Step = "email" | "code" | "password" | "done";

/* Mirrors the rules the API enforces, so a rejection is rare and explained. */
const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
];

function errorText(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Cannot reach the server. Check that the API is running.";
    return (err.response.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}

function ForgotPasswordFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();

  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState(() => searchParams.get("email") ?? "");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expiresIn, setExpiresIn] = React.useState(30);

  const allRulesPass = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      const res = await axios.post<{ message: string; expiresInMinutes: number }>(
        `${API_BASE_URL}/auth/forgot-password`,
        { email: email.trim() }
      );
      setExpiresIn(res.data.expiresInMinutes ?? 30);
      setStep("code");
      toast.success("Code sent", { description: "Check your inbox for a six-digit code." });
    } catch (err) {
      setError(errorText(err, "Could not send the code. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError("The code is six digits.");
      return;
    }

    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/verify-code`, {
        email: email.trim(),
        code: code.trim(),
      });
      setStep("password");
    } catch (err) {
      setError(errorText(err, "That code is not valid."));
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (!allRulesPass) {
      setError("The password does not meet every rule yet.");
      return;
    }
    if (!matches) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email: email.trim(),
        code: code.trim(),
        newPassword: password,
      });
      setStep("done");
      toast.success("Password updated", { description: "You can sign in with it now." });
    } catch (err) {
      setError(errorText(err, "Could not update the password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image
            src={resolvedTheme === "dark" ? "/vizo-logo-dark.jpg" : "/vizo-logo.png"}
            alt="AdvPOS" width={32} height={32}
            className="rounded-lg object-cover"
          />
          <span className="text-base font-bold">Adv<span className="text-brand-yellow">POS</span></span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="size-3" /> Back to sign in
          </Link>

          {step !== "done" && <Steps step={step} />}

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 text-sm"
            >
              <AlertCircle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-danger-dark dark:text-danger-light">{error}</div>
            </div>
          )}

          {/* ── STEP 1 ───────────────────────────────────────── */}
          {step === "email" && (
            <form onSubmit={sendCode} noValidate>
              <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Enter the address on your account and we will email you a six-digit code.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <Label htmlFor="email" className="mb-1.5 block">Email address</Label>
                  <div className="relative">
                    <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      id="email" type="email" autoFocus autoComplete="email"
                      className="pl-9" placeholder="you@advpos.pk"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                  {busy ? (<><Loader2 className="size-4 animate-spin" /> Sending code…</>) : "Send code"}
                </Button>
              </div>
            </form>
          )}

          {/* ── STEP 2 ───────────────────────────────────────── */}
          {step === "code" && (
            <form onSubmit={checkCode} noValidate>
              <h1 className="text-2xl font-bold tracking-tight">Enter your code</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                We sent a six-digit code to{" "}
                <span className="font-semibold text-navy-900 dark:text-white">{email}</span>.
                It is good for {expiresIn} minutes.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <Label htmlFor="code" className="mb-1.5 block">Six-digit code</Label>
                  <div className="relative">
                    <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      id="code" autoFocus inputMode="numeric" maxLength={6}
                      autoComplete="one-time-code" placeholder="000000"
                      className="pl-9 tabular text-lg tracking-[0.4em] font-semibold"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                </div>

                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
                  {busy ? (<><Loader2 className="size-4 animate-spin" /> Checking…</>) : "Continue"}
                </Button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setCode(""); setError(null); }}
                    className="text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white"
                  >
                    Use a different address
                  </button>
                  <button
                    type="button"
                    onClick={() => { void sendCode(); }}
                    disabled={busy}
                    className="text-brand-yellow hover:underline font-medium disabled:opacity-50"
                  >
                    Send a new code
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── STEP 3 ───────────────────────────────────────── */}
          {step === "password" && (
            <form onSubmit={setNewPassword} noValidate>
              <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Code accepted. Pick something you have not used here before.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <Label htmlFor="password" className="mb-1.5 block">New password</Label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      id="password" autoFocus autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-10"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <ul className="space-y-1.5">
                  {RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li key={rule.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2
                          className={cn(
                            "size-3.5 flex-shrink-0",
                            ok ? "text-success" : "text-slate-300 dark:text-navy-700"
                          )}
                        />
                        <span className={ok ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}>
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div>
                  <Label htmlFor="confirm" className="mb-1.5 block">Confirm password</Label>
                  <div className="relative">
                    <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      id="confirm" autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9"
                      value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  {confirm.length > 0 && !matches && (
                    <p className="text-xs text-danger mt-1.5">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit" variant="accent" size="lg" className="w-full"
                  disabled={busy || !allRulesPass || !matches}
                >
                  {busy ? (<><Loader2 className="size-4 animate-spin" /> Updating…</>) : "Update password"}
                </Button>
              </div>
            </form>
          )}

          {/* ── DONE ─────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center">
              <div className="size-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                Sign in with your new password. The code you used has been retired.
              </p>
              <div className="mt-8">
                <Button
                  variant="accent" size="lg" className="w-full"
                  onClick={() => router.push("/login")}
                >
                  Back to sign in
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const order: Step[] = ["email", "code", "password"];
  const current = order.indexOf(step);

  return (
    <ol className="flex items-center gap-2 mb-7" aria-label="Progress">
      {["Address", "Code", "New password"].map((label, i) => (
        <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-6 rounded-full grid place-items-center text-2xs font-bold tabular flex-shrink-0",
                i < current && "bg-success text-white",
                i === current && "bg-brand-yellow text-navy-900",
                i > current && "bg-slate-100 dark:bg-navy-800 text-slate-400"
              )}
            >
              {i < current ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                i === current
                  ? "font-semibold text-navy-900 dark:text-white"
                  : "text-slate-400"
              )}
            >
              {label}
            </span>
          </div>
          {i < 2 && (
            <span
              className={cn(
                "h-px flex-1 hidden sm:block",
                i < current ? "bg-success" : "bg-slate-200 dark:bg-navy-800"
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
      <div className="size-8 border-2 border-slate-200 dark:border-navy-700 border-t-brand-yellow rounded-full animate-spin" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  /* useSearchParams() bails out of prerendering unless it is under a
     boundary, so the page shell is the boundary and the form is the child. */
  return (
    <React.Suspense fallback={<AuthLoading />}>
      <ForgotPasswordFlow />
    </React.Suspense>
  );
}
