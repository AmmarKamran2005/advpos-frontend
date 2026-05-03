import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg?: "yellow" | "success" | "warning" | "info" | "danger";
  delta?: { value: number; label?: string };
  footer?: React.ReactNode;
  className?: string;
};

const ICON_BG: Record<NonNullable<StatCardProps["iconBg"]>, string> = {
  yellow:  "bg-brand-yellow/10 text-brand-yellow group-hover:bg-brand-yellow group-hover:text-navy-900",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info:    "bg-info/10 text-info",
  danger:  "bg-danger/10 text-danger",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBg = "yellow",
  delta,
  footer,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "p-5 group hover:border-brand-yellow/40 transition-colors cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "size-10 rounded-lg flex items-center justify-center transition-colors",
            ICON_BG[iconBg]
          )}
        >
          <Icon className="size-[18px]" />
        </div>
        {delta && <DeltaPill value={delta.value} />}
      </div>
      <div className="text-xs uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400 mt-4">
        {label}
      </div>
      <div className="text-[1.75rem] tabular font-bold text-navy-900 dark:text-white mt-2 leading-none tracking-tight">
        {value}
      </div>
      {footer && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {footer}
        </div>
      )}
    </Card>
  );
}

export function DeltaPill({ value }: { value: number }) {
  const isUp = value > 0;
  const isDown = value < 0;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const cls = isUp
    ? "bg-success-light text-success-dark dark:bg-success/15 dark:text-success-light"
    : isDown
    ? "bg-danger-light text-danger-dark dark:bg-danger/15 dark:text-danger-light"
    : "bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
        cls
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value)}%
    </span>
  );
}
