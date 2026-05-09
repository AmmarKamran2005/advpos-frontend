"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, Check, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const Schema = z.object({
  current: z.string().min(1, "Current password is required"),
  password: z.string().min(8, "At least 8 chars").regex(/[A-Z]/, "Uppercase required").regex(/\d/, "Number required"),
  confirm:  z.string().min(1, "Please confirm"),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

type Form = z.infer<typeof Schema>;
const RULES = [
  { id: "len",   label: "8+ characters",        test: (v: string) => v.length >= 8 },
  { id: "upper", label: "Uppercase letter",     test: (v: string) => /[A-Z]/.test(v) },
  { id: "num",   label: "Number",                test: (v: string) => /\d/.test(v) },
];

export default function SetupPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [show, setShow] = React.useState(false);

  const form = useForm<Form>({ resolver: vizoResolver(Schema), defaultValues: { current: "", password: "", confirm: "" }, mode: "onChange" });
  const password = form.watch("password");

  async function onSubmit(_d: Form) {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Password updated", { description: "Welcome to VIZO ERP!" });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 font-sans text-navy-900 dark:text-white antialiased flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src={resolvedTheme === "dark" ? "/vizo-logo-dark.jpg" : "/vizo-logo.png"} alt="VIZO" width={32} height={32} className="rounded-lg object-cover" />
          <span className="text-base font-bold">VIZO <span className="text-brand-yellow">ERP</span></span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="size-14 rounded-2xl bg-brand-yellow/10 flex items-center justify-center mb-5">
            <ShieldCheck className="size-7 text-brand-yellow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">First-time setup</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Welcome to VIZO ERP! For security, please change your temporary password before continuing.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <FormField control={form.control} name="current" render={({ field }) => (
                <FormItem>
                  <FormLabel required>Temporary password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type={show ? "text" : "password"} className="pl-9" autoFocus {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel required>New password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type={show ? "text" : "password"} className="pl-9 pr-10" {...field} />
                      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400">
                        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex flex-wrap gap-3">
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
                      <Input type={show ? "text" : "password"} className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" variant="accent" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Setting up…</> : "Continue to dashboard"}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
