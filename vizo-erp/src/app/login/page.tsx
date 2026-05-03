"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-navy-950">
      {/* ─────────────────── LEFT: FORM ─────────────────── */}
      <div className="flex flex-col px-6 py-10 sm:px-10 lg:px-16 xl:px-24 relative">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2.5">
            <div className="relative size-9 rounded-lg overflow-hidden">
              <Image
                src="/vizo-logo.png"
                alt="VIZO"
                fill
                sizes="36px"
                className="object-cover dark:hidden"
                priority
              />
              <Image
                src="/vizo-logo-dark.jpg"
                alt="VIZO"
                fill
                sizes="36px"
                className="object-cover hidden dark:block"
                priority
              />
            </div>
            <div>
              <div className="text-base font-bold leading-none text-navy-900 dark:text-white">
                VIZO <span className="text-brand-yellow">ERP</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sales · Inventory · Accounting
              </div>
            </div>
          </div>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto lg:mx-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Sign in to your VIZO account to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5 text-navy-900 dark:text-white"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  required
                  defaultValue="umer@vizo.com.pk"
                  placeholder="you@vizo.com.pk"
                  className="pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-navy-900 dark:text-white"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-brand-yellow hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  defaultValue="demo-password"
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-700 text-slate-400 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="inline-flex items-center gap-2 text-sm text-navy-900 dark:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 dark:border-navy-600 text-brand-yellow focus:ring-brand-yellow"
              />
              <span>Remember me for 30 days</span>
            </label>

            <Button type="submit" variant="accent" size="lg" className="w-full font-semibold">
              Sign in to VIZO
              <ArrowRight />
            </Button>

            {/* Divider */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-navy-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-navy-950 px-3 text-xs text-slate-400">
                  or
                </span>
              </div>
            </div>

            <Button type="button" variant="secondary" size="lg" className="w-full">
              <KeyRound />
              Single sign-on (SSO)
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-navy-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>© 2026 VIZO. All rights reserved.</div>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-navy-900 dark:hover:text-white">Privacy</a>
              <a href="#" className="hover:text-navy-900 dark:hover:text-white">Terms</a>
              <a href="#" className="hover:text-navy-900 dark:hover:text-white">Help</a>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────── RIGHT: BRAND PANEL ─────────────────── */}
      <div className="hidden lg:flex relative bg-navy-900 text-white overflow-hidden">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Yellow glow shapes */}
        <div className="absolute top-1/4 -right-20 size-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-10 size-72 bg-brand-yellow/5 rounded-full blur-3xl" />

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
              Multi-branch sales, purchases, inventory and double-entry accounting —
              built for VIZO mobile accessories distribution, ready for the next 10 years of growth.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 max-w-2xl">
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">11</div>
              <div className="text-2xs text-slate-400 uppercase tracking-wider mt-1.5">Modules</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">
                Sales · Purchases · Inventory · Accounting · Zakat · Reports · AI
              </div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">3+</div>
              <div className="text-2xs text-slate-400 uppercase tracking-wider mt-1.5">Branches</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">
                Karachi · Lahore · Islamabad — branch-aware accounting
              </div>
            </div>
            <div>
              <div className="text-3xl xl:text-4xl font-bold tabular text-brand-yellow">100%</div>
              <div className="text-2xs text-slate-400 uppercase tracking-wider mt-1.5">Audit trail</div>
              <div className="text-sm text-slate-300 mt-1 leading-snug">
                Every JE immutable, every action logged
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-12 flex items-center gap-4 text-xs text-slate-400">
            <div className="flex -space-x-2">
              <Avatar initials="UM" size="sm" className="ring-2 ring-navy-900" />
              <Avatar initials="AH" size="sm" className="ring-2 ring-navy-900" />
              <Avatar initials="SK" size="sm" className="ring-2 ring-navy-900" />
              <Avatar initials="+8" size="sm" className="ring-2 ring-navy-900 bg-navy-700 text-slate-300" />
            </div>
            <div>Trusted by your team across 3 cities</div>
          </div>
        </div>
      </div>
    </div>
  );
}
