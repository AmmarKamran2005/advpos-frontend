"use client";

import * as React from "react";
import axios from "axios";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/**
 * The one way an AI-written explanation reaches a screen.
 *
 * Three rules are baked in here rather than left to each page to remember:
 *
 *   1. IT IS ALWAYS LABELLED. Every panel says the words were written by AI and
 *      that the figures above are the real ones. A reader must never be left to
 *      work out which half of a screen is arithmetic and which is a guess.
 *
 *   2. IT NEVER LOADS BY ITSELF. The request goes out when somebody presses
 *      the button. Explaining a report nobody asked to have explained burns the
 *      free tier on every page view and trains people to scroll past it.
 *
 *   3. IT FAILS QUIETLY. No key, no model, a timeout -- the panel says so in
 *      one line and the page behind it is untouched. The numbers were never
 *      coming from here.
 */

type Response = {
  /** The prose. Null whenever the model was unavailable. */
  explanation?: string | null;
  advice?: string | null;
  summary?: string | null;
  answer?: string | null;
  aiAvailable?: boolean;
  disclaimer?: string;
  message?: string;
};

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

export function AiInsight({
  /** The report endpoint, relative to the API base, e.g. "/reports/recovery-priority". */
  endpoint,
  params,
  /** What the button says before it has been pressed. */
  label = "Explain these numbers",
  /** One line under the heading, saying what the reader will get. */
  hint,
  className,
}: {
  endpoint: string;
  params?: Record<string, string | number | undefined>;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const [text, setText] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [disclaimer, setDisclaimer] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [asked, setAsked] = React.useState(false);

  async function run() {
    setLoading(true);
    setAsked(true);
    setNote(null);
    try {
      const res = await axios.get<Response>(`${API_BASE_URL}${endpoint}`, {
        headers: authHeader(),
        params,
      });

      /* The endpoints name their prose differently -- explanation, advice,
         summary -- because each reads better that way in its own response.
         This picks whichever one came back. */
      const prose =
        res.data.explanation ?? res.data.advice ?? res.data.summary ?? res.data.answer ?? null;

      setText(prose);
      setDisclaimer(res.data.disclaimer ?? null);

      if (!prose) {
        setNote(
          res.data.aiAvailable === false
            ? "AI is not set up on this server yet, so there is no written explanation. Every figure on this page is unaffected."
            : "The AI could not be reached just now. The figures on this page are unaffected."
        );
      }
    } catch (e) {
      setText(null);
      setNote(apiMessage(e, "The explanation could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={cn("border-brand-yellow/30 bg-brand-yellow/[0.03]", className)}>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-navy-900 dark:text-white inline-flex items-center gap-2">
              <Sparkles className="size-4 text-brand-yellow" />
              What this means
            </h3>
            {hint && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
            )}
          </div>
          <Button
            variant={asked ? "secondary" : "accent"}
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={loading}
            onClick={() => void run()}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : asked ? <RefreshCw /> : <Sparkles />}
            {loading ? "Reading…" : asked ? "Again" : label}
          </Button>
        </div>

        {text && (
          <div className="mt-4">
            {/* The model writes short paragraphs; each becomes its own line so
                a wall of text does not arrive. */}
            <div className="space-y-2 text-sm text-navy-900 dark:text-white leading-relaxed">
              {text.split("\n").filter((l) => l.trim()).map((line, i) => (
                <p key={i} className="whitespace-pre-wrap">{line}</p>
              ))}
            </div>
            <p className="text-2xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-brand-yellow/20">
              {disclaimer ?? "Written by AI from the figures above. Check it before acting on it."}
            </p>
          </div>
        )}

        {note && (
          <div className="mt-4 flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-slate-400" />
            <p>{note}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
