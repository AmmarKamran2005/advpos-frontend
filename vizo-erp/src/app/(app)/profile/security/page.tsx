"use client";

import * as React from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Loader2, LogIn, LogOut,
  KeyRound, AlertCircle, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSidebar } from "@/components/layout/profile-sidebar";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { formatDate, formatRelative, parseApiDate } from "@/lib/format";

/* Mirrors ValidatePassword() in AuthController: the server is the authority,
   this only saves a round trip on the obvious failures. */
const PasswordSchema = z.object({
  current: z.string().min(1, "Current password is required"),
  password: z.string().min(8, "Min 8 characters").regex(/[A-Z]/, "Needs uppercase").regex(/\d/, "Needs a number"),
  confirm: z.string().min(1, "Please confirm"),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type PasswordForm = z.infer<typeof PasswordSchema>;

/* GET /profile/sessions -> sign-in EVENTS off ActivityLog, newest first.
   Deliberately not called "active sessions": the API issues a stateless JWT
   with no server-side session row, so there is nothing to enumerate as live
   and nothing to revoke. See the note on the two disabled cards below. */
type SessionEvent = {
  id: number;
  action: "LOGIN" | "LOGOUT" | "PASSWORD_CHANGE" | "PASSWORD_RESET";
  detail: string | null;
  ip: string | null;
  at: string;
};

const EVENT_META: Record<SessionEvent["action"], { label: string; icon: typeof LogIn; tone: string }> = {
  LOGIN:           { label: "Signed in",        icon: LogIn,    tone: "text-success" },
  LOGOUT:          { label: "Signed out",       icon: LogOut,   tone: "text-slate-400" },
  PASSWORD_CHANGE: { label: "Password changed", icon: KeyRound, tone: "text-warning" },
  PASSWORD_RESET:  { label: "Password reset",   icon: KeyRound, tone: "text-warning" },
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* Anything inside a week reads as "3 hours ago"; older than that gets the date
   and the clock time. Both go through parseApiDate, because the API sends UTC
   with no marker on it. */
function when(iso: string): string {
  const d = parseApiDate(iso);
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 7) return formatRelative(iso);
  return `${formatDate(iso)} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function SecurityPage() {
  const [show, setShow] = React.useState(false);

  const [events, setEvents] = React.useState<SessionEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { current: "", password: "", confirm: "" },
  });

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<SessionEvent[]>(`${API_BASE_URL}/profile/sessions`, {
        params: { take: 12 },
        headers: authHeader(),
      });
      setEvents(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load your sign-in history."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       The brief for this project is axios inside the page driven by
       useState/useEffect. This rule wants the fetch moved to the server, which
       is a different architecture, not a bug in this line. */
    void load();
  }, [load]);

  async function onSubmit(d: PasswordForm) {
    try {
      await axios.post(
        `${API_BASE_URL}/Auth/change-password`,
        { currentPassword: d.current, newPassword: d.password },
        { headers: authHeader() }
      );
      form.reset();
      /* The change writes a PASSWORD_CHANGE row, so the history below should
         show it without a manual refresh. */
      await load();
      toast.success("Password changed", { description: "Use the new password next time you sign in." });
    } catch (e) {
      const message = apiMessage(e, "Could not change your password.");
      /* The server distinguishes a wrong current password from a weak new one;
         put the message on the field it belongs to. */
      if (/current password/i.test(message)) {
        form.setError("current", { message });
      } else {
        form.setError("password", { message });
      }
      toast.error("Password not changed", { description: message });
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "My Profile", href: "/profile" }, { label: "Security" }]}
        title="Security"
        subtitle="Manage your password and review recent account activity"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1"><ProfileSidebar /></div>

        <div className="lg:col-span-3 space-y-6">
          {/* ── Change password: real, POST /api/Auth/change-password ── */}
          <Card>
            <CardBody>
              <div className="flex items-start gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-navy-700">
                <div className="size-10 rounded-lg bg-brand-yellow/10 text-brand-yellow flex items-center justify-center">
                  <Lock className="size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white">Change Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose a strong password — minimum 8 characters with an uppercase letter and number.</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                  <FormField control={form.control} name="current" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Current password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={show ? "text" : "password"} className="pr-10" autoComplete="current-password" {...field} />
                          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400">
                            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>New password</FormLabel>
                      <FormControl><Input type={show ? "text" : "password"} autoComplete="new-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirm" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Confirm new password</FormLabel>
                      <FormControl><Input type={show ? "text" : "password"} autoComplete="new-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" variant="accent" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Update password"}
                  </Button>
                </form>
              </Form>
            </CardBody>
          </Card>

          {/* ── Recent activity: real, GET /profile/sessions ── */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white">Recent account activity</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Sign-ins and password changes recorded against your account.
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void load()}>
                  <RefreshCw className="size-4" /> Refresh
                </Button>
              </div>

              {error ? (
                <div className="flex items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3">
                  <AlertCircle className="size-5 text-danger shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">{error}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      The API must be running on {API_BASE_URL}.
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setLoading(true); void load(); }}>
                    <RefreshCw className="size-4" /> Try again
                  </Button>
                </div>
              ) : loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
                  Nothing recorded yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {events.map((e) => {
                    const meta = EVENT_META[e.action] ?? EVENT_META.LOGIN;
                    const Icon = meta.icon;
                    return (
                      <div key={e.id} className="flex items-center justify-between py-2.5 border-b last:border-0 border-slate-100 dark:border-navy-700">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`size-4 shrink-0 ${meta.tone}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-navy-900 dark:text-white">{meta.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {e.ip ? `from ${e.ip}` : "origin not recorded"}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 tabular shrink-0 pl-3">{when(e.at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ────────────────────────────────────────────────────────────
              The two cards below are switched OFF on purpose.

              Neither had a backend. The 2FA toggle flipped a useState and
              toasted "Your account is now less secure" without touching
              anything; "Sign out all" toasted success and signed nobody out.
              A control that reports success while doing nothing is worse than
              one that is plainly unavailable, so they now say so.

              Both need schema before they can be real -- a secret/enrolment
              column for 2FA, and a session or token-version table for
              revocation, since the API issues a stateless JWT that cannot be
              withdrawn once handed out. Written up in
              backend/database/db_code_changes.txt section 6.
              ──────────────────────────────────────────────────────────── */}
          <Card className="opacity-70">
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-slate-100 dark:bg-navy-700 text-slate-400 flex items-center justify-center">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                      Two-Factor Authentication
                      <Badge variant="muted">Not available yet</Badge>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      Requires an enrolment secret against your account, which the database does not carry yet.
                      Until then this cannot be switched on.
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="opacity-70">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-slate-100 dark:bg-navy-700 text-slate-400 flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
                    Sign out everywhere
                    <Badge variant="muted">Not available yet</Badge>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                    Sign-in tokens are self-contained and are not tracked by the server, so there is nothing to
                    withdraw. If you think someone else has your password, change it above — that is what actually
                    protects the account today.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
