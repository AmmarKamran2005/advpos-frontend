"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import axios from "axios";
import {
  Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight,
  ShoppingCart, ClipboardList, Wallet, Shield, Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  saveSession,
  API_BASE_URL,
  type SessionUser,
} from "@/components/providers/session-provider";
import type { RoleKey } from "@/data/settings";
import { cn } from "@/lib/utils";

const LoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof LoginSchema>;

const PANEL_ICON: Record<RoleKey, typeof ShoppingCart> = {
  sales: ShoppingCart,
  "order-dept": ClipboardList,
  accountant: Wallet,
  "super-admin": Shield,
};

const PANEL_TONE: Record<RoleKey, { ring: string; chip: string }> = {
  sales: { ring: "border-brand-yellow bg-brand-yellow/5", chip: "bg-brand-yellow/15 text-brand-yellow-700 dark:text-brand-yellow" },
  "order-dept": { ring: "border-success bg-success/5", chip: "bg-success/15 text-success" },
  accountant: { ring: "border-info bg-info/5", chip: "bg-info/15 text-info" },
  "super-admin": { ring: "border-navy-900 dark:border-white bg-slate-100 dark:bg-navy-800", chip: "bg-slate-200 dark:bg-navy-700 text-navy-900 dark:text-white" },
};

/**
 * Shortcut buttons that fill in the address for each panel. Emails only --
 * a password baked into the bundle is a password everybody has, and these
 * are real accounts now.
 */
type Panel = { role: RoleKey; label: string; person: string; email: string; blurb: string };

const PANELS: Panel[] = [
  { role: "sales", label: "Sales", person: "Zara Malik", email: "sales@advpos.pk",
    blurb: "Takes customer orders and follows up on payments." },
  { role: "order-dept", label: "Order Department", person: "Bilal Ahmed", email: "order@advpos.pk",
    blurb: "Checks stock, packs orders, moves goods and books deliveries." },
  { role: "accountant", label: "Accountant", person: "Hassan Raza", email: "accounts@advpos.pk",
    blurb: "Records money in and out, keeps the ledgers and statements." },
  { role: "super-admin", label: "Super Admin", person: "Umer Memon", email: "admin@advpos.pk",
    blurb: "Sees everything, plus users, setup and backup." },
];

function LoginForm() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<RoleKey>("sales");

  const form = useForm<LoginForm>({
    resolver: vizoResolver(LoginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  function choosePanel(panel: Panel) {
    setSelected(panel.role);
    setServerError(null);
    form.setValue("email", panel.email);
    form.setFocus("password");
  }

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      const res = await axios.post<{ token: string; expiresAt: string; user: SessionUser }>(
        `${API_BASE_URL}/auth/login`,
        { email: data.email, password: data.password }
      );

      const { token, user } = res.data;
      saveSession(token, user);

      toast.success(`Signed in as ${user.fullName}`, { description: `${user.roleLabel} panel` });

      /* middleware puts the path the user actually wanted on ?next= when it
         bounced them here; otherwise use the landing page the role carries
         in the database. */
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : user.homePath || "/dashboard");
    } catch (err) {
      let message = "Something went wrong signing in. Try again.";
      if (axios.isAxiosError(err)) {
        if (err.response) {
          if (err.response.status === 423) {
            router.push("/locked");
            return;
          }
          message =
            (err.response.data as { message?: string } | undefined)?.message ??
            "That email and password do not match any account.";
        } else {
          message = "Cannot reach the server. Check that the API is running.";
        }
      }
      setServerError(message);
      toast.error("Sign-in failed", { description: message });
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased">
      {/* ── LEFT: panels + form ───────────────────────────────── */}
      <div className="flex flex-col px-6 py-10 sm:px-10 lg:px-14 xl:px-20 relative">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2.5">
            <Image
              src={resolvedTheme === "dark" ? "/vizo-logo-dark.jpg" : "/vizo-logo.png"}
              alt="AdvPOS" width={36} height={36}
              className="rounded-lg object-cover"
            />
            <div>
              <div className="text-base font-bold leading-none">
                Adv<span className="text-brand-yellow">POS</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sales · Inventory · Accounting
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-lg w-full mx-auto lg:mx-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Choose your panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Each role sees a different app. Pick one to fill in its address, then enter your password.
            </p>
          </div>

          {/* Role panels */}
          <div className="grid sm:grid-cols-2 gap-2.5 mb-6">
            {PANELS.map((account) => {
              const Icon = PANEL_ICON[account.role];
              const tone = PANEL_TONE[account.role];
              const active = selected === account.role;
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => choosePanel(account)}
                  aria-pressed={active}
                  className={cn(
                    "text-left p-3.5 rounded-xl border-2 transition-colors",
                    active
                      ? tone.ring
                      : "border-slate-200 dark:border-navy-800 hover:border-slate-300 dark:hover:border-navy-600"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("size-8 rounded-lg flex items-center justify-center flex-shrink-0", tone.chip)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{account.label}</div>
                      <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                        {account.person}
                      </div>
                    </div>
                    {active && <Check className="size-4 text-brand-yellow flex-shrink-0" />}
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-2 leading-snug">
                    {account.blurb}
                  </p>
                  <div className="tabular text-2xs text-slate-400 dark:text-slate-500 mt-2 truncate">
                    {account.email}
                  </div>
                </button>
              );
            })}
          </div>

          {serverError && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 text-sm">
              <AlertCircle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-danger-dark dark:text-danger-light">{serverError}</div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input type="email" placeholder="you@advpos.pk" autoComplete="email" className="pl-9 tabular" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-1.5">
                    <FormLabel required className="!mb-0">Password</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-brand-yellow hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="pl-9 pr-10 tabular"
                        {...field}
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
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="remember" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} id="remember" />
                  </FormControl>
                  <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                    Keep me signed in
                  </Label>
                </FormItem>
              )} />

              <Button type="submit" variant="accent" size="lg" className="w-full font-semibold" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in as {roleLabel(selected)} <ArrowRight className="size-4" /></>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-5 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>© 2026 AdvPOS</div>
            <div className="flex items-center gap-3">
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Privacy</Link>
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Terms</Link>
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Help</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: what each panel does ──────────────────────── */}
      <div className="hidden lg:flex relative bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-10 w-72 h-72 bg-brand-yellow/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 w-full">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-xs font-semibold uppercase tracking-wider mb-8">
              <span className="size-1.5 rounded-full bg-brand-yellow animate-pulse-soft" />
              One system, four panels
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight">
              Everyone works in the <span className="text-brand-yellow">same place</span>.
            </h2>
            <p className="text-base text-slate-300 mt-6 leading-relaxed">
              An order starts with Sales, gets packed by the Order Department, and
              lands with Accounts — without a single message leaving the building.
            </p>

            <ol className="mt-10 space-y-4">
              <FlowStep
                n={1}
                title="Sales"
                body="Takes the order on the phone, sees live stock and the customer's balance before promising anything."
              />
              <FlowStep
                n={2}
                title="Order Department"
                body="Picks it up the moment it's placed, checks stock, packs it, and books the delivery."
              />
              <FlowStep
                n={3}
                title="Accounts"
                body="Records the money, keeps the ledgers, and closes the books."
              />
            </ol>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}

function roleLabel(role: RoleKey) {
  switch (role) {
    case "sales": return "Sales";
    case "order-dept": return "Order Department";
    case "accountant": return "Accountant";
    case "super-admin": return "Super Admin";
  }
}

function FlowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="size-8 rounded-full bg-brand-yellow/15 border border-brand-yellow/30 flex items-center justify-center flex-shrink-0 tabular text-sm font-bold text-brand-yellow">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
      <div className="size-8 border-2 border-slate-200 dark:border-navy-700 border-t-brand-yellow rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  /* useSearchParams() bails out of prerendering unless it is under a
     boundary, so the page shell is the boundary and the form is the child. */
  return (
    <React.Suspense fallback={<AuthLoading />}>
      <LoginForm />
    </React.Suspense>
  );
}
