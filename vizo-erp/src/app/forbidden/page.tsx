import Link from "next/link";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950 px-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-warning mb-4">403</div>
        <div className="size-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="size-7 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Access denied</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          You don&apos;t have permission to view this page. If you believe this is a mistake, please contact your administrator.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="javascript:history.back()" className="btn btn-secondary">
            <ArrowLeft className="size-4" /> Go back
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-brand-yellow text-navy-900 hover:bg-brand-yellow-400 transition-colors px-5 py-2.5 rounded-lg font-semibold"
          >
            <Home className="size-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
