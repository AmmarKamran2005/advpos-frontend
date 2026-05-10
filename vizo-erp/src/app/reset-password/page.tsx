"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Lock, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const Schema = z.object({
  password: z.string()
    .min(8, "Must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/\d/,    "Must contain a number"),
  confirm:  z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

type Form = z.infer<typeof Schema>;

const RULES = [
  { id: "len",   label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter",  test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter",  test: (v: string) => /[a-z]/.test(v) },
  { id: "num",   label: "One number",            test: (v: string) => /\d/.test(v) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [show, setShow] = React.useState(false);

  const form = useForm<Form>({ resolver: vizoResolver(Schema), defaultValues: { password: "", confirm: "" }, mode: "onChange" });
  const password = form.watch("password");

  async function onSubmit(_data: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Password updated", { description: "You can now sign in with your new password." });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src={resolvedTheme === "dark" ? "/vizo-logo-dark.jpg" : "/vizo-logo.png"} alt="AdvPOS" width={32} height={32} className="rounded-lg object-cover" />
          <span className="text-base font-bold">Adv<span className="text-brand-yellow">POS</span></span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Choose a strong password you haven&apos;t used before.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel required>New password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type={show ? "text" : "password"} autoFocus className="pl-9 pr-10" {...field} />
                      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400" aria-label="Toggle visibility">
                        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Password strength indicator */}
              <div className="space-y-1.5">
                {RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      {ok ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-slate-300 dark:text-slate-600" />}
                      <span className={cn(ok ? "text-success" : "text-slate-500 dark:text-slate-400")}>{r.label}</span>
                    </div>
                  );
                })}
              </div>

              <FormField control={form.control} name="confirm" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Confirm password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type={show ? "text" : "password"} className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Updating…</> : "Update password"}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
