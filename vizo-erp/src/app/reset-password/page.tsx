"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * The reset now happens entirely on /forgot-password, which walks through
 * address -> emailed code -> new password in one place. Keeping a second copy
 * of that logic here would mean two screens to keep in step with the API, so
 * this route just forwards, carrying the address across if it was supplied.
 *
 * The route is kept rather than deleted because older emails and bookmarks
 * point at it.
 */
function ResetPasswordRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const email = searchParams.get("email");
    router.replace(email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-brand-yellow" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Taking you to the reset form…</p>
      </div>
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
      <div className="size-8 border-2 border-slate-200 dark:border-navy-700 border-t-brand-yellow rounded-full animate-spin" />
    </div>
  );
}

export default function ResetPasswordPage() {
  /* useSearchParams() bails out of prerendering unless it is under a
     boundary, so the page shell is the boundary and the form is the child. */
  return (
    <React.Suspense fallback={<AuthLoading />}>
      <ResetPasswordRedirect />
    </React.Suspense>
  );
}
