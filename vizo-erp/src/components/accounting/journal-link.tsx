"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/**
 * A link to one journal entry -- for the Super Admin and the accountant.
 *
 * On 22 Oct the owner hid journal entries from the accountant; since 27 Oct
 * the accountant does every voucher type, JV included, so both may open them.
 * The API answers 403 and the route guard sends anybody else to /forbidden, so
 * for them this draws the same box with the same contents, just not
 * clickable: the entry number still says the voucher or expense reached the
 * ledger, without a door to a page that would refuse them.
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
  if (role === "super-admin" || role === "accountant") {
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
