"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { vizoResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});
type Form = z.infer<typeof Schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const { resolvedTheme } = useTheme();

  const form = useForm<Form>({ resolver: vizoResolver(Schema), defaultValues: { email: "" } });

  async function onSubmit(_data: Form) {
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
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

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white mb-6">
            <ArrowLeft className="size-3" /> Back to sign in
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="size-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                If an account exists for <span className="font-semibold text-navy-900 dark:text-white">{form.getValues("email")}</span>, we&apos;ve sent a password reset link. The link is valid for 30 minutes.
              </p>
              <div className="mt-8 flex flex-col gap-2.5">
                <Button variant="accent" size="lg" asChild>
                  <Link href="/login">Back to sign in</Link>
                </Button>
                <Button variant="ghost" size="md" onClick={() => setSent(false)}>
                  Try a different email
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                No worries — enter the email associated with your account and we&apos;ll send you a reset link.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Email address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input type="email" autoFocus className="pl-9" placeholder="you@vizo.com.pk" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" variant="accent" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <><Loader2 className="size-4 animate-spin" /> Sending link…</>
                    ) : "Send reset link"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
