"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import {
  OPEN_PALETTE_EVENT,
  isTypingTarget,
  quickCreateFor,
} from "@/lib/shortcuts";

/* The palette is heavy (cmdk, its own search, a dozen icons) and most sessions
   never open it -- AGENTS.md rule 4 names it by name. It is fetched the first
   time somebody asks for it, and stays mounted after that so the second open
   is instant. */
const CommandPalette = dynamic(
  () => import("./command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);

/** How long after N the second key still counts as part of the sequence. */
const SEQUENCE_MS = 1200;

/**
 * Every app-wide key, in one listener:
 *
 *   Ctrl+K / ⌘K  opens (or closes) the palette -- even from inside a text box,
 *                the way every app with a palette behaves
 *   /            opens the palette, but never while typing
 *   N then a letter  Quick Create (lib/shortcuts.ts QUICK_CREATE), only the
 *                items this person may open, never while typing
 *
 * "?" is handled by ShortcutSheet, which owns that dialog.
 */
export function GlobalShortcuts() {
  const router = useRouter();
  const { can, user } = useSession();
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const show = React.useCallback(() => {
    setLoaded(true);
    setOpen(true);
  }, []);

  /* The items are recomputed only when the session changes, and read through a
     ref inside the listener so the listener itself is attached exactly once. */
  const items = React.useMemo(() => quickCreateFor(can, user?.role), [can, user?.role]);
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  React.useEffect(() => {
    let armedAt = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && key === "k") {
        e.preventDefault();
        setLoaded(true);
        setOpen((v) => !v);
        return;
      }

      /* Everything below is a bare key: leave it to the text box, and leave
         anything chorded with Ctrl/Alt/⌘ to the browser. */
      /* ...and to any dialog that is open: N then O must not walk away from
         a half-filled form in a modal because focus sat on one of its buttons. */
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)
          || document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) {
        armedAt = 0;
        return;
      }

      if (key === "/") {
        e.preventDefault();
        show();
        return;
      }

      if (armedAt && Date.now() - armedAt < SEQUENCE_MS) {
        armedAt = 0;
        const hit = itemsRef.current.find((q) => q.key === key);
        if (hit) {
          e.preventDefault();
          router.push(hit.href);
        }
        return;
      }

      armedAt = key === "n" && !e.shiftKey ? Date.now() : 0;
    };

    const onOpenRequest = () => show();

    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenRequest);
    };
  }, [router, show]);

  return loaded ? <CommandPalette open={open} onOpenChange={setOpen} /> : null;
}
