"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, KeyRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "@/components/ui/toaster";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const LoginSchema = z.object({
  email:    z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const form = useForm<LoginForm>({
    resolver: vizoResolver(LoginSchema),
    defaultValues: { email: "umer@vizo.com.pk", password: "demo-password", remember: true },
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    await new Promise((r) => setTimeout(r, 700));

    if (data.password !== "demo-password") {
      setServerError("Invalid email or password. Please try again.");
      toast.error("Sign-in failed", { description: "The credentials you entered don't match our records." });
      return;
    }

    toast.success("Welcome back, Umer!", { description: "Signed in to AdvPOS successfully." });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased">
      {/* ── LEFT: Form ───────────────────────────────────────── */}
      <div className="flex flex-col px-6 py-10 sm:px-10 lg:px-16 xl:px-24 relative">
        <div className="flex items-center justify-between mb-12">
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
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sales · Inventory · Accounting</div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Sign in to your AdvPOS account to continue.</p>
          </div>

          {serverError && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 border border-danger/30 text-sm">
              <AlertCircle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-danger-dark dark:text-danger-light">{serverError}</div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input type="email" placeholder="you@vizo.com.pk" autoComplete="email" autoFocus className="pl-9" {...field} />
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
                        className="pl-9 pr-10"
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
                  <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">Remember me for 30 days</Label>
                </FormItem>
              )} />

              <Button type="submit" variant="accent" size="lg" className="w-full font-semibold" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in to AdvPOS <ArrowRight className="size-4" /></>
                )}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-navy-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white dark:bg-navy-950 px-3 text-xs text-slate-400">or</span>
                </div>
              </div>

              <Button type="button" variant="secondary" size="md" className="w-full gap-2"
                      onClick={() => toast.info("SSO not yet configured", { description: "Single sign-on will be enabled in a future release." })}>
                <KeyRound className="size-4" />
                Single sign-on (SSO)
              </Button>
            </form>
          </Form>

          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>© 2026 AdvPOS. All rights reserved.</div>
            <div className="flex items-center gap-3">
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Privacy</Link>
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Terms</Link>
              <Link href="#" className="hover:text-navy-900 dark:hover:text-white">Help</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Brand panel ──────────────────────────────── */}
      <div className="hidden lg:flex relative bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
             style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-10 w-72 h-72 bg-brand-yellow/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow text-xs font-semibold uppercase tracking-wider mb-8">
              <span className="size-1.5 rounded-full bg-brand-yellow animate-pulse-soft" />
              Production-grade ERP
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight">
              Run your <span className="text-brand-yellow">entire business</span> from a single dashboard.
            </h2>
            <p className="text-base xl:text-lg text-slate-300 mt-6 leading-relaxed">
              Multi-branch sales, purchases, inventory and double-entry accounting — built for Pakistan, ready for the next 10 years of your growth.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl">
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">11</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1.5">Modules</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">Sales · Purchases · Inventory · Accounting · Zakat · Reports · AI</div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">3+</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1.5">Branches</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">Karachi, Lahore, Islamabad — branch-aware accounting</div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">100%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1.5">Audit trail</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">Every JE immutable, every action logged</div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
