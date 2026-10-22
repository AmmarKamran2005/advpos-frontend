"use client";

import * as React from "react";
import axios from "axios";
import { Check, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";
import { apiMessage } from "@/components/ledgers/ledger-kit";
import { cn } from "@/lib/utils";

export type ManagedCategory = { id: number; name: string; inUse: number };

/**
 * Add, rename and remove categories right on the ledger page -- the owner's
 * ask, so a new kind of customer or of staff does not need a trip to Setup.
 *
 * One component for both lists; the API path decides which. Removing a
 * category that is still in use is refused by the API with a sentence saying
 * how many accounts use it, and the bin is greyed out here before anybody
 * gets that far -- the count is on every row.
 */
export function CategoryManager({
  endpoint,
  categories,
  onChanged,
  noun = "accounts",
}: {
  /** "ledgers/customers/categories" or "ledgers/staff/categories" */
  endpoint: string;
  categories: ManagedCategory[];
  onChanged: () => void;
  noun?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [adding, setAdding] = React.useState("");
  const [editing, setEditing] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(key: string, fn: () => Promise<{ data: { message?: string } }>) {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(res.data.message ?? "Saved");
      onChanged();
      return true;
    } catch (e) {
      toast.error("Not saved", { description: apiMessage(e, "Please try again.") });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    const name = adding.trim();
    if (!name) return;
    if (await run("add", () => axios.post(`${API_BASE_URL}/${endpoint}`, { name }, { headers: authHeader() })))
      setAdding("");
  }

  async function rename(id: number) {
    const name = editText.trim();
    if (!name) return;
    if (await run(`r${id}`, () => axios.put(`${API_BASE_URL}/${endpoint}/${id}`, { name }, { headers: authHeader() })))
      setEditing(null);
  }

  function remove(c: ManagedCategory) {
    void run(`d${c.id}`, () => axios.delete(`${API_BASE_URL}/${endpoint}/${c.id}`, { headers: authHeader() }));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="md" className="gap-1.5">
          <Tags /> <span>Categories</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-navy-700">
          <div className="text-sm font-semibold text-navy-900 dark:text-white">Categories</div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rename in place. A category in use cannot be removed.
          </p>
        </div>

        <ul className="max-h-72 overflow-y-auto scrollbar-thin py-1">
          {categories.map((c) => (
            <li key={c.id} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-navy-700/50">
              {editing === c.id ? (
                <>
                  <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void rename(c.id); if (e.key === "Escape") setEditing(null); }}
                    className="h-8 text-sm" />
                  <Button size="icon-sm" variant="accent" aria-label="Save name" disabled={busy === `r${c.id}`}
                    onClick={() => void rename(c.id)}>
                    {busy === `r${c.id}` ? <Loader2 className="animate-spin" /> : <Check />}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditing(null)}><X /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 min-w-0 truncate text-sm text-navy-900 dark:text-white">{c.name}</span>
                  <span className="text-2xs tabular text-slate-400 shrink-0">{c.inUse} {c.inUse === 1 ? noun.replace(/s$/, "") : noun}</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Rename ${c.name}`}
                    onClick={() => { setEditing(c.id); setEditText(c.name); }}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`Remove ${c.name}`}
                    title={c.inUse > 0 ? `In use by ${c.inUse} -- move them first` : "Remove"}
                    className={cn(c.inUse > 0 && "opacity-40")}
                    disabled={busy === `d${c.id}`}
                    onClick={() => remove(c)}>
                    {busy === `d${c.id}` ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 p-3 border-t border-slate-100 dark:border-navy-700">
          <Input placeholder="New category" value={adding} onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void add(); }} className="h-9" />
          <Button size="md" variant="accent" className="gap-1" disabled={!adding.trim() || busy === "add"} onClick={() => void add()}>
            {busy === "add" ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
