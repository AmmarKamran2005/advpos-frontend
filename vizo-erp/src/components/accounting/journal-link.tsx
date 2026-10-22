"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/**
 * A link to one journal entry -- for the Super Admin only.
 *
 * Journal entries are the Super Admin's (the owner, 22 Oct: hide them from the
 * accountant "so they can't see JVs anywhere"). The API answers 403 and the
 * route guard sends anybody else to /forbidden, so for them this draws the
 * same box with the same contents, just not clickable: the entry number still
 * says the voucher or expense reached the ledger, without a door to a page
 * that would refuse them.
 */
export function JournalLink({
  entryId,
  className,
  children,
}: {
  entryId: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { role } = useSession();
  if (role === "super-admin") {
    return (
      <Link href={`/accounting/journal-entries/${entryId}`} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <div className={cn(className, "hover:bg-transparent dark:hover:bg-transparent cursor-default")}>
      {children}
    </div>
  );
}
