"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, Settings } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

/* "Active Sessions" used to sit here pointing at /profile/sessions, which has
   no page and returned a 404. There is nothing to list as an active session
   anyway -- the API issues a stateless JWT it does not track -- so the sign-in
   history it was reaching for now lives on the Security page instead. */
const ITEMS = [
  { href: "/profile",             label: "Profile",     icon: User },
  { href: "/profile/security",    label: "Security",    icon: Lock },
  { href: "/profile/preferences", label: "Preferences", icon: Settings },
];

export function ProfileSidebar() {
  const { user } = useSession();
  const pathname = usePathname();

  /* After every hook. An early return above usePathname would change the hook
     count between renders, which is exactly what the rules of hooks forbid. */
  if (!user) return null;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-navy-700">
          <Avatar initials={user.initials} size="xl" className="size-20 text-2xl mb-3" />
          <h3 className="text-base font-semibold text-navy-900 dark:text-white">{user.fullName}</h3>
          <Badge variant="accent" className="mt-1">{user.roleLabel}</Badge>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">{user.email}</div>
        </div>
        <nav className="mt-4 space-y-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.href;
            return (
              <Link key={it.href} href={it.href} className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-brand-yellow/10 text-brand-yellow-700 dark:text-brand-yellow font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-700"
              )}>
                <Icon className="size-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
      </CardBody>
    </Card>
  );
}
