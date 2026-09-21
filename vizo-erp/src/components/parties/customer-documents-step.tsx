"use client";

import * as React from "react";
import axios from "axios";
import {
  AlertCircle, ArrowRight, Check, FileText, IdCard, Loader2, ScrollText, SkipForward, Sparkles,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { DocumentCapture, type CaptureGuard, type CaptureValue } from "@/components/parties/document-capture";
import { dHashOfUrl, hashDistance, SAME_PICTURE_BITS, type DocumentKind } from "@/lib/image-hash";
import { imageAt } from "@/lib/images";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   PAGE ONE OF OPENING A SHOP ACCOUNT: THE PAPERWORK

   Three sets of photographs, ONE AT A TIME, in the order the owner asked for:

     1  CNIC            front and back
     2  Business card   front and back
     3  Affidavit       page 1 and page 2

   One at a time on purpose. Six empty tiles on a phone is a wall; the section
   in hand is the only thing on screen, and the two behind it are ticks.

   EVERY SET CAN BE SKIPPED. "Not available" is a real answer -- plenty of
   shopkeepers have a card and no affidavit, or nothing at all -- and skipping
   everything goes straight to the form with empty boxes, which is exactly what
   the old screen was.

   WHAT THE READER IS FOR. Once the CNIC and the card are in, the API reads
   them and fills the form: the name off the CNIC, the shop and the market off
   the card, the address off the card (never the CNIC -- goods go to the shop),
   the city matched to one of ours. Every one of those lands in an editable box
   on the next page and the salesperson checks it. A picture it cannot read
   comes back named, and this screen asks for that one again rather than
   half-filling the form.
   ─────────────────────────────────────────────────────────────────────────── */

export type DocumentUrls = {
  cnicFrontUrl: string | null;
  cnicBackUrl: string | null;
  cardFrontUrl: string | null;
  cardBackUrl: string | null;
  affidavitFrontUrl: string | null;
  affidavitBackUrl: string | null;
};

export type ReadFields = {
  legalName: string;
  displayName: string;
  industry: string;
  phone: string | null;
  altPhone: string | null;
  email: string;
  addressLine: string;
  cityId: number | null;
  cityName: string | null;
  cnic: string;
  ntn: string;
  categoryKey: string;
  shopName: string;
  shopLocation: string;
};

type Problem = { image: string; reason: string; message: string };

export type Slot = "cnicFront" | "cnicBack" | "cardFront" | "cardBack" | "affidavitFront" | "affidavitBack";

/* THE OTHER SIDE OF THE SAME DOCUMENT, and what to say when a picture turns
   out to be a copy of it.

   The owner's rule: photograph the CNIC front, then try the same picture in the
   back slot, and there must be an error that the two are very much the same.
   The same is asked of the card and the affidavit -- a second copy of page 1 is
   no more use as page 2 than a second copy of the front is as the back. */
/** Which document a slot belongs to -- the threshold for "very much the same" depends on it. */
export const kindOfSlot = (slot: Slot): DocumentKind =>
  slot.startsWith("cnic") ? "cnic" : slot.startsWith("card") ? "card" : "affidavit";

export const PARTNER: Record<Slot, Slot> = {
  cnicFront: "cnicBack", cnicBack: "cnicFront",
  cardFront: "cardBack", cardBack: "cardFront",
  affidavitFront: "affidavitBack", affidavitBack: "affidavitFront",
};

export const SAME_AS_PARTNER: Record<Slot, string> = {
  cnicFront: "The CNIC front and back pictures are very much the same. The front is the side with the photograph and the name -- turn the card over and take the other side.",
  cnicBack: "The CNIC front and back pictures are very much the same. The back is the side with the address -- turn the card over and take the other side.",
  cardFront: "The card front and back pictures are very much the same. Take the other side, or mark the back as not available.",
  cardBack: "The card front and back pictures are very much the same. Take the other side, or mark the back as not available.",
  affidavitFront: "Affidavit page 1 and page 2 are very much the same picture. Take the other page.",
  affidavitBack: "Affidavit page 1 and page 2 are very much the same picture. Take the other page.",
};

const SECTIONS: {
  key: "cnic" | "card" | "affidavit";
  title: string;
  blurb: string;
  icon: typeof IdCard;
  slots: { slot: Slot; label: string; hint: string }[];
}[] = [
  {
    key: "cnic",
    title: "CNIC",
    blurb: "The shopkeeper's identity card, both sides.",
    icon: IdCard,
    slots: [
      { slot: "cnicFront", label: "CNIC front", hint: "The side with the photograph and the name" },
      { slot: "cnicBack", label: "CNIC back", hint: "The side with the address" },
    ],
  },
  {
    key: "card",
    title: "Business card",
    blurb: "The shop's own card. The shop name, market, phone and email come from here.",
    icon: FileText,
    slots: [
      { slot: "cardFront", label: "Card front", hint: "The side with the shop name" },
      { slot: "cardBack", label: "Card back", hint: "Often the address. Skip if it is blank" },
    ],
  },
  {
    key: "affidavit",
    title: "Affidavit",
    blurb: "Both pages, if the shop has one. Nothing is read from these -- they are filed.",
    icon: ScrollText,
    slots: [
      { slot: "affidavitFront", label: "Affidavit page 1", hint: "" },
      { slot: "affidavitBack", label: "Affidavit page 2", hint: "" },
    ],
  },
];

export function CustomerDocumentsStep({
  onDone,
}: {
  /** Called with whatever was photographed and whatever could be read off it. */
  onDone: (docs: DocumentUrls, fields: ReadFields | null) => void;
}) {
  const [at, setAt] = React.useState(0);                 // which section is open
  const [shots, setShots] = React.useState<Record<Slot, CaptureValue>>({
    cnicFront: null, cnicBack: null, cardFront: null, cardBack: null,
    affidavitFront: null, affidavitBack: null,
  });
  const [skipped, setSkipped] = React.useState<Record<string, boolean>>({});
  const [reading, setReading] = React.useState(false);
  const [problems, setProblems] = React.useState<Problem[]>([]);
  const [readerOn, setReaderOn] = React.useState<boolean | null>(null);

  /* Whether anything can read a picture at all. Asked once, up front: if no
     reader is configured the screen still takes the photographs -- they are
     worth having on file -- it just does not promise to fill the form. */
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await axios.get<{ configured: boolean }>(
          `${API_BASE_URL}/parties/documents/reader`, { headers: authHeader() });
        if (!cancelled) setReaderOn(res.data.configured);
      } catch {
        if (!cancelled) setReaderOn(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const urls: DocumentUrls = {
    cnicFrontUrl: shots.cnicFront?.url ?? null,
    cnicBackUrl: shots.cnicBack?.url ?? null,
    cardFrontUrl: shots.cardFront?.url ?? null,
    cardBackUrl: shots.cardBack?.url ?? null,
    affidavitFrontUrl: shots.affidavitFront?.url ?? null,
    affidavitBackUrl: shots.affidavitBack?.url ?? null,
  };

  const anything = Object.values(urls).some(Boolean);
  const canRead = Boolean(urls.cnicFrontUrl || urls.cardFrontUrl);
  const problemFor = (slot: Slot) => problems.find((p) => p.image === slot)?.message ?? null;

  /** The check a tile runs on a picture before it is uploaded. */
  const guardFor = (slot: Slot): CaptureGuard => async (hash) => {
    if (!hash) return null;                       // could not fingerprint it: do not block anybody
    const other = shots[PARTNER[slot]];
    if (!other) return null;
    const otherHash = other.hash ?? await dHashOfUrl(imageAt(other.url, 240) ?? other.url);
    return hashDistance(hash, otherHash) <= SAME_PICTURE_BITS[kindOfSlot(slot)] ? SAME_AS_PARTNER[slot] : null;
  };

  function set(slot: Slot, v: CaptureValue) {
    setShots((s) => ({ ...s, [slot]: v }));
    setProblems((p) => p.filter((x) => x.image !== slot));
  }

  /** The last section's "Continue" is what finishes the step. */
  async function finish() {
    if (!anything) { onDone(urls, null); return; }
    if (!canRead || readerOn === false) { onDone(urls, null); return; }

    setReading(true);
    setProblems([]);
    try {
      const res = await axios.post<{
        configured: boolean; problems: Problem[]; fields: ReadFields | null; message: string;
      }>(`${API_BASE_URL}/parties/documents/read`, {
        cnicFrontUrl: urls.cnicFrontUrl,
        cnicBackUrl: urls.cnicBackUrl,
        cardFrontUrl: urls.cardFrontUrl,
        cardBackUrl: urls.cardBackUrl,
      }, { headers: authHeader() });

      const bad = res.data.problems ?? [];
      /* A picture the reader could not read sends the screen back to the
         section it belongs to, with the message under that tile. */
      if (bad.length > 0) {
        setProblems(bad);
        const first = bad[0].image;
        const back = SECTIONS.findIndex((s) => s.slots.some((sl) => sl.slot === first));
        if (back >= 0) setAt(back);
        toast.error("Some pictures could not be read", { description: bad[0].message });
        setReading(false);
        return;
      }

      toast.success("Read from the documents", { description: res.data.message });
      onDone(urls, res.data.fields);
    } catch (e) {
      const message = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? "Please try again."
        : "Please try again.";
      toast.error("The documents could not be read", { description: message });
      /* The photographs are still worth keeping: carry on to the form and let
         the salesperson type. */
      onDone(urls, null);
    } finally {
      setReading(false);
    }
  }

  const section = SECTIONS[at];
  /* A section is finished once ANY side of it is in, or it has been marked not
     available. It used to need every side, which contradicted the card's own
     hint ("skip it if it is blank") and the owner's brief that partial sets are
     fine: a shop with a one-sided card had to throw the front away to go on. */
  const done = section.slots.some((s) => shots[s.slot]) || skipped[section.key];
  const last = at === SECTIONS.length - 1;

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      {/* where we are */}
      <Card>
        <CardBody className="py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              const finished = i < at || (i === at && done);
              return (
                <React.Fragment key={s.key}>
                  <button type="button" onClick={() => i <= at && setAt(i)} disabled={i > at}
                    className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "size-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      i === at ? "bg-brand-yellow text-navy-900 ring-4 ring-brand-yellow/20"
                        : finished ? "bg-success text-white"
                        : "bg-slate-100 dark:bg-navy-700 text-slate-400"
                    )}>
                      {finished && i !== at ? <Check className="size-4" /> : <Icon className="size-4" />}
                    </span>
                    <span className={cn("text-sm font-medium truncate hidden sm:block",
                      i <= at ? "text-navy-900 dark:text-white" : "text-slate-400")}>
                      {s.title}
                    </span>
                  </button>
                  {i < SECTIONS.length - 1 && (
                    <div className={cn("flex-1 h-0.5", i < at ? "bg-success" : "bg-slate-200 dark:bg-navy-700")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* the section in hand */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-white">{section.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">{section.blurb}</p>
            </div>
            {skipped[section.key] && <Badge variant="muted">Not available</Badge>}
          </div>

          {skipped[section.key] ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-navy-700 p-6 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Marked as not available. Nothing from {section.title.toLowerCase()} will be filled in.
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-2"
                onClick={() => setSkipped((s) => ({ ...s, [section.key]: false }))}>
                I do have it
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.slots.map((s) => (
                <DocumentCapture key={s.slot}
                  label={s.label}
                  hint={s.hint}
                  value={shots[s.slot]}
                  problem={problemFor(s.slot)}
                  guard={guardFor(s.slot)}
                  onChange={(v) => set(s.slot, v)} />
              ))}
            </div>
          )}

          {readerOn === false && at === 0 && (
            <div className="flex items-start gap-2 mt-4 text-2xs text-slate-500 dark:text-slate-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                No reader is switched on for this system, so the pictures are filed but the form
                is not filled in from them. Somebody has to set <b>Gemini:ApiKey</b> on the API.
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* what happens next */}
      <div className="flex flex-wrap items-center gap-2">
        {at > 0 && (
          <Button type="button" variant="ghost" onClick={() => setAt(at - 1)}>Back</Button>
        )}

        {!skipped[section.key] && (
          <Button type="button" variant="ghost" className="gap-1.5"
            onClick={() => {
              setSkipped((s) => ({ ...s, [section.key]: true }));
              section.slots.forEach((s) => set(s.slot, null));
            }}>
            <SkipForward className="size-4" />Not available
          </Button>
        )}

        <div className="flex-1" />

        {!last ? (
          <Button type="button" variant="accent" className="gap-1.5" disabled={!done}
            onClick={() => setAt(at + 1)}>
            Next: {SECTIONS[at + 1].title}<ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" variant="accent" className="gap-1.5" disabled={!done || reading}
            onClick={() => void finish()}>
            {reading
              ? <><Loader2 className="size-4 animate-spin" />Reading the documents…</>
              : anything && canRead && readerOn !== false
                ? <><Sparkles className="size-4" />Read and fill the form</>
                : <>Go to the form<ArrowRight className="size-4" /></>}
          </Button>
        )}
      </div>

      {problems.length > 0 && (
        <Card className="border-danger/40">
          <CardBody>
            <div className="flex items-center gap-2 text-sm font-semibold text-danger">
              <AlertCircle className="size-4" />Take these again
            </div>
            <ul className="mt-2 space-y-1">
              {problems.map((p) => (
                <li key={p.image} className="text-xs text-slate-600 dark:text-slate-300">{p.message}</li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" className="mt-2"
              onClick={() => onDone(urls, null)}>
              Skip the reading and type it in
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
