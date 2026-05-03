import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const avatarVariants = cva(
  "inline-flex items-center justify-center rounded-full bg-navy-900 text-brand-yellow font-semibold flex-shrink-0",
  {
    variants: {
      size: {
        xs: "size-6 text-2xs",
        sm: "size-8 text-xs",
        md: "size-9 text-xs",
        lg: "size-10 text-sm",
        xl: "size-12 text-base",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  initials: string;
}

export function Avatar({ initials, size, className, ...props }: AvatarProps) {
  return (
    <div className={cn(avatarVariants({ size, className }))} {...props}>
      {initials}
    </div>
  );
}
