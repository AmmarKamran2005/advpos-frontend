"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { shortcuts, type Shortcut } from "@/data/settings";

const GROUP_ORDER: Shortcut["group"][] = ["Record", "Navigation", "Grid", "Global"];

const GROUP_HINT: Record<Shortcut["group"], string> = {
  Record: "On any document screen",
  Navigation: "Moving between saved records",
  Grid: "Inside a line-item table",
  Global: "Anywhere in the app",
};

/**
 * Press `?` anywhere to see the keyboard map. Staff moving over from the old
 * system drive it entirely from the keyboard, so the shortcuts need to be
 * discoverable without hunting through menus.
 */
export function ShortcutSheet() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?") return;

      // Don't hijack the key while the user is typing.
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }

      e.preventDefault();
      setOpen((v) => !v);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4 text-brand-yellow" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to open this list.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-6">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {GROUP_ORDER.map((group) => {
              const rows = shortcuts.filter((s) => s.group === group);
              if (rows.length === 0) return null;

              return (
                <section key={group}>
                  <h3 className="text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group}
                  </h3>
                  <p className="text-2xs text-slate-400 dark:text-slate-500 mb-2">
                    {GROUP_HINT[group]}
                  </p>
                  <dl className="space-y-1.5">
                    {rows.map((s) => (
                      <div key={s.keys} className="flex items-center gap-3">
                        <dt className="w-20 flex-shrink-0">
                          <Kbd>{s.keys}</Kbd>
                        </dt>
                        <dd className="text-[13px] text-slate-600 dark:text-slate-300">
                          {s.label}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1.5 py-0.5 text-2xs font-mono bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded text-slate-600 dark:text-slate-300">
      {children}
    </kbd>
  );
}
