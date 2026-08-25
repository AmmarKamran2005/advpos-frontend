"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

/**
 * Where middleware.ts sends somebody who typed a URL their role cannot open.
 *
 * This is now a route people actually reach, so the "Go back" control had to
 * become a real button: it was a `<Link href="javascript:history.back()">`,
 * which React refuses to navigate, wearing `btn btn-secondary` classes this
 * Tailwind v4 project does not define.
 */
export default function Forbidden() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-warning mb-4">403</div>
        <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="size-7 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Access denied</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Your role does not open this screen. If you think that is wrong, ask your
          administrator to check your permissions.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold border border-slate-200 dark:border-navy-700 text-navy-900 dark:text-white hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
          >
            <ArrowLeft className="size-4" /> Go back
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-navy-900 hover:bg-brand-yellow-400 transition-colors px-5 py-2.5 rounded-lg font-semibold"
          >
            <Home className="size-4" /> Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
