"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { todayISO } from "@/lib/dates";

/**
 * A date field whose calendar starts at today — the owner's rule that no
 * document is dated in the past. See lib/dates.ts for what that covers and why
 * the list and report filters deliberately do not use this.
 *
 * `keep` is for edit screens: the date a record already carries stays
 * selectable, because it was valid when it was entered. Anything earlier than
 * today apart from that one date is still refused.
 *
 * The picker's `min` only stops the popup. Pair it with the `notPast` check in
 * the form's schema, or a date typed by hand gets through.
 */
export const DateInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { keep?: string | null }
>(({ keep, min, ...props }, ref) => {
  const today = todayISO();
  const floor = keep && keep.slice(0, 10) < today ? keep.slice(0, 10) : today;
  const effective = typeof min === "string" && min > floor ? min : floor;
  return <Input ref={ref} type="date" min={effective} {...props} />;
});
DateInput.displayName = "DateInput";
