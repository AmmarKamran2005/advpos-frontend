"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, Check, X, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Toaster, toast } from "@/components/ui/toaster";
import {
  API_BASE_URL, clearSession, getToken, type SessionUser,
} from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/**
 * First-time setup: replace the temporary password.
 *
 * Until 27 Sep this page waited 700 ms, showed "Password updated" and went to
 * the dashboard -- nothing was changed anywhere. It now posts to
 * POST /account/change-password, which checks the temporary password, sets the
 * new one and clears the account's must-change flag in one save.
 *
 * Who lands here: anybody whose account was created at Setup -> Users, or whose
 * password the Super Admin replaced with a temporary one. The login screen and
 * the app shell both ask GET /account/status and send them here. It is also
 * reachable by hand while signed in, as a plain "change my password" -- the
 * current-password label then says so.
 */

/* The same four rules the API enforces (Credentials.ValidatePassword). The old
   form skipped the lowercase one, so the API could refuse a password this page
   had shown as fine. */
const RULES = [
  { id: "len",   label: "8+ characters",     test: (v: string) => v.length >= 8 },
  { id: "upper", label: "Uppercase letter",  test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "Lowercase letter",  test: (v: string) => /[a-z]/.test(v) },
  { id: "num",   label: "Number",            test: (v: string) => /\d/.test(v) },
];

const Schema = z.object({
  current: z.string().min(1, "Enter the password you signed in with"),
  password: z.string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[a-z]/, "Needs a lowercase letter")
    .regex(/\d/, "Needs a number"),
  confirm: z.string().min(1, "Please confirm"),
})
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] })
  .refine((d) => d.password !== d.current, { message: "Choose something different from the password you signed in with", path: ["password"] });

type FormValues = z.infer<typeof Schema>;

function storedUser(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem("advpos-user");
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export default function SetupPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [show, setShow] = React.useState(false);
  /* null while asking the API; then whether this is a temporary password. */
  const [temporary, setTemporary] = React.useState<boolean | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: vizoResolver(Schema),
    defaultValues: { current: "", password: "", confirm: "" },
    mode: "onChange",
  });
  const password = form.watch("password");

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login?next=/setup");
      return;
    }
    let cancelled = false;
    axios
      .get<{ mustChangePassword: boolean }>(`${API_BASE_URL}/account/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (cancelled) return;
        setTemporary(res.data.mustChangePassword);
        setName(storedUser()?.fullName ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        /* An expired or revoked token: start again from the sign-in screen. */
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          clearSession();
          router.replace("/login?next=/setup");
          return;
        }
        setTemporary(false);
        setError("Could not reach the server. You can still try below.");
      });
    return () => { cancelled = true; };
  }, [router]);

  async function onSubmit(d: FormValues) {
    setError(null);
    try {
      await axios.post(
        `${API_BASE_URL}/account/change-password`,
        { currentPassword: d.current, newPassword: d.password },
        { headers: { Authorization: `Bearer ${getToken() ?? ""}` } }
      );
      toast.success("Password set", { description: "Use it the next time you sign in." });
      const home = storedUser()?.homePath || "/dashboard";
      router.replace(home);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401) {
          clearSession();
          router.replace("/login?next=/setup");
          return;
        }
        const body = err.response.data as { message?: string; field?: string } | undefined;
        const message = body?.message ?? "Could not change the password.";
        if (body?.field === "currentPassword") form.setError("current", { message });
        else if (body?.field === "newPassword") form.setError("password", { message });
        else setError(message);
      } else {
        setError("Cannot reach the server. Check that the API is running.");
      }
    }
  }

  function signOut() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased flex flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src={resolvedTheme === "dark" ? "/vizo-logo-dark.jpg" : "/vizo-logo.png"} alt="AdvPOS" width={32} height={32} className="rounded-lg object-cover" />
          <span className="text-base font-bold">Adv<span className="text-brand-yellow">POS</span></span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="size-14 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mb-5">
            <ShieldCheck className="size-7 text-brand-yellow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {temporary === false ? "Change your password" : "Choose your password"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {temporary === false
              ? "Enter your current password, then the new one."
              : <>Welcome{name ? `, ${name}` : ""}. You signed in with a temporary password from your administrator — choose your own before you continue.</>}
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 text-sm">
              <AlertCircle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-danger-dark dark:text-danger-light">{error}</div>
            </div>
          )}

          {temporary === null ? (
            <div className="mt-10 flex justify-center">
              <Loader2 className="size-6 animate-spin text-brand-yellow" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                <FormField control={form.control} name="current" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{temporary ? "Temporary password" : "Current password"}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input type={show ? "text" : "password"} className="pl-9" autoFocus autoComplete="current-password" {...field} />
                      </div>
                    </FormControl>
                    {temporary && <FormDescription>The one your administrator gave you, or that arrived by email.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input type={show ? "text" : "password"} className="pl-9 pr-10" autoComplete="new-password" {...field} />
                        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide passwords" : "Show passwords"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400">
                          {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <span key={r.id} className={cn("inline-flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-slate-500 dark:text-slate-400")}>
                        {ok ? <Check className="size-3" /> : <X className="size-3" />}
                        {r.label}
                      </span>
                    );
                  })}
                </div>

                <FormField control={form.control} name="confirm" render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Confirm new password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input type={show ? "text" : "password"} className="pl-9" autoComplete="new-password" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" variant="accent" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save and continue"}
                </Button>

                <button type="button" onClick={signOut} className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white">
                  Not you? Sign out
                </button>
              </form>
            </Form>
          )}
        </div>
      </main>

      <Toaster />
    </div>
  );
}
