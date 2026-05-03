import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-900 px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-brand-yellow mb-4">404</div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Page not found</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or deleted.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-brand-yellow text-navy-900 hover:bg-brand-yellow-400 transition-colors px-5 py-2.5 rounded-lg font-semibold"
        >
          <Home className="size-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
