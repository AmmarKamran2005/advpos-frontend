"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { AlertCircle, TrendingDown, Clock, Phone } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AiInsight } from "@/components/widgets/ai-insight";
import { formatMoney, formatCompact, formatDate } from "@/lib/format";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* GET /reports/customers/at-risk
   The risk itself is arithmetic on the server -- how often this customer used
   to order, how long since the last one, whether the orders are shrinking. */
type AtRisk = {
  id: number;
  name: string;
  phone: string | null;
  rep: string | null;
  orders: number;
  lastOrder: string;
  daysSinceLastOrder: number;
  typicalGapDays: number | null;
  lifetimeValue: number;
  earlierAverage: number | null;
  recentAverage: number | null;
  overdueRatio: number | null;
};

type Response = { asOf: string; count: number; valueAtRisk: number; customers: AtRisk[] };

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/** Why this customer is on the list, in a few words. */
function reason(c: AtRisk) {
  const quiet = c.overdueRatio !== null && c.overdueRatio >= 1.5;
  const shrinking =
    c.recentAverage !== null &&
    c.earlierAverage !== null &&
    c.earlierAverage > 0 &&
    c.recentAverage < c.earlierAverage * 0.6;

  if (quiet && shrinking) return "Gone quiet, and ordering less";
  if (quiet)
    return c.typicalGapDays
      ? `Usually orders every ${c.typicalGapDays} days`
      : "Gone quiet";
  if (shrinking) return "Orders getting smaller";
  return "Worth a look";
}

export function AtRiskCustomers() {
  const [data, setData] = React.useState<Response | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Response>(`${API_BASE_URL}/reports/customers/at-risk`, {
        headers: authHeader(),
        params: { take: 25 },
      });
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not work out who is at risk."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-danger/40">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-danger shrink-0" />
          <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
        </div>
      </Card>
    );
  }

  if (!data || data.customers.length === 0) {
    return (
      <EmptyState
        icon={TrendingDown}
        title="Nobody looks to be drifting"
        description="Every customer is ordering about as often, and for about as much, as they always have."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Customers at risk
          </div>
          <div className="text-2xl tabular font-bold text-warning mt-1">{data.count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            What they have been worth
          </div>
          <div className="text-2xl tabular font-bold text-navy-900 dark:text-white mt-1">
            {formatCompact(data.valueAtRisk)}
          </div>
          <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
            lifetime, not what is at stake this month
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-navy-700">
          {data.customers.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/parties/${c.id}`}
                  className="text-sm font-medium text-navy-900 dark:text-white hover:underline"
                >
                  {c.name}
                </Link>
                <div className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    Last order {formatDate(c.lastOrder)} · {c.daysSinceLastOrder} days ago
                  </span>
                  {c.rep && <span>· {c.rep}</span>}
                </div>
              </div>

              <Badge variant={c.overdueRatio && c.overdueRatio >= 2 ? "danger" : "warning"}>
                {reason(c)}
              </Badge>

              <div className="text-right shrink-0 w-28">
                <div className="tabular text-sm font-semibold text-navy-900 dark:text-white">
                  {formatMoney(c.lifetimeValue)}
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400">
                  {c.orders} {c.orders === 1 ? "order" : "orders"}
                </div>
              </div>

              {c.phone && (
                <Button variant="secondary" size="sm" className="gap-1.5 shrink-0" asChild>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Feature #3's commentary. The list above is arithmetic; this only
          orders it and says why in a sentence. */}
      <AiInsight
        endpoint="/reports/customers/at-risk"
        params={{ take: 25 }}
        label="Who should I chase?"
        hint="Puts the list in order of what is worth saving, and says what to open the call with."
      />
    </div>
  );
}
