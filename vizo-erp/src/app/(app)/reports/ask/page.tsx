"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { Sparkles, Loader2, AlertCircle, ArrowRight, MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* POST /reports/ask
   The model is shown a FIXED menu of reports and picks one; it never writes a
   query and never sees a database connection. See Services/ReportCatalogue.cs
   on the server for why. */
type AskResponse = {
  question: string;
  matched?: string | null;
  matchedAnswers?: string | null;
  screen?: string | null;
  answer?: string | null;
  aiAvailable: boolean;
  message?: string;
  disclaimer?: string;
  reports?: { key: string; answers: string; screen: string }[];
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const EXAMPLES = [
  "Is sale kyun kam hui is mahine?",
  "Kis customer ko pehle call karun?",
  "Kaunsa stock nahi bik raha?",
  "Which products are selling at a loss?",
  "Kya mangwana chahiye is hafte?",
];

export default function AskPage() {
  const [question, setQuestion] = React.useState("");
  const [result, setResult] = React.useState<AskResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function ask(q?: string) {
    const text = (q ?? question).trim();
    if (text.length < 3) return;

    setQuestion(text);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post<AskResponse>(
        `${API_BASE_URL}/reports/ask`,
        { question: text },
        { headers: authHeader() }
      );
      setResult(res.data);
    } catch (e) {
      setError(apiMessage(e, "The question could not be answered."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Ask" }]}
        title="Ask a question"
        subtitle="In Urdu or English. It finds the right report and reads it back to you."
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardBody>
            <Textarea
              rows={3}
              value={question}
              placeholder="Is mahine sale kyun kam hui?"
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                /* Enter asks; Shift+Enter is a new line. A question box that
                   needs a mouse to submit gets used once. */
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask();
                }
              }}
            />

            <div className="flex items-center justify-between gap-3 mt-3">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => void ask(ex)}
                    className="text-2xs px-2 py-1 rounded-md border border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-brand-yellow hover:text-navy-900 dark:hover:text-white transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <Button
                variant="accent"
                className="gap-1.5 shrink-0"
                disabled={loading || question.trim().length < 3}
                onClick={() => void ask()}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles />}
                {loading ? "Looking…" : "Ask"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && (
          <Card className="p-4 border-danger/40">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-danger shrink-0" />
              <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            </div>
          </Card>
        )}

        {result && (
          <Card className="border-brand-yellow/30 bg-brand-yellow/[0.03]">
            <CardBody>
              {result.answer ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-brand-yellow" />
                    <span className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                      Answer
                    </span>
                    {result.matched && <Badge variant="muted">{result.matched}</Badge>}
                  </div>

                  <div className="space-y-2 text-sm text-navy-900 dark:text-white leading-relaxed">
                    {result.answer.split("\n").filter((l) => l.trim()).map((line, i) => (
                      <p key={i} className="whitespace-pre-wrap">{line}</p>
                    ))}
                  </div>

                  {result.screen && (
                    <Button variant="secondary" size="sm" className="gap-1.5 mt-4" asChild>
                      <Link href={result.screen}>
                        Open the report it read <ArrowRight />
                      </Link>
                    </Button>
                  )}

                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-brand-yellow/20">
                    {result.disclaimer ?? "Answered by AI from the report shown. Open it to check."}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <MessageCircleQuestion className="size-4 shrink-0 mt-0.5 text-slate-400" />
                    <p className="text-sm text-navy-900 dark:text-white">
                      {result.message ?? "No answer came back."}
                    </p>
                  </div>

                  {result.reports && result.reports.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-brand-yellow/20">
                      <div className="text-2xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        What it can answer
                      </div>
                      <div className="space-y-1.5">
                        {result.reports.map((r) => (
                          <Link
                            key={r.key}
                            href={r.screen}
                            className="block text-xs text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white"
                          >
                            <span className="font-medium">{r.key}</span> — {r.answers}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        )}

        <p className="text-2xs text-slate-500 dark:text-slate-400">
          It can only open reports that already exist — it is never allowed to write its own
          query. If it cannot answer something, that means no report covers it yet.
        </p>
      </div>
    </>
  );
}
