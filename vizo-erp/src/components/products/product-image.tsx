"use client";

import * as React from "react";
import { ImageIcon, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { imageAt } from "@/lib/images";
import { cn } from "@/lib/utils";

/* ───────────────────────────────────────────────────────────────────────────
   THE PRODUCT PICTURE, EVERYWHERE

   The owner's rule: "throughout the whole project, where the pictures are
   showing in dropdown or somewhere else, these pictures must be most
   prominent and in large size, so that the user can see the product very much
   easily."

   That used to be twelve separate <img> tags at 40-64 px, each with its own
   idea of a placeholder. It is one component now, and the sizes are a scale
   rather than a guess:

     md   64 px         a row in a table
     lg   96 -> 112 px  a line on an order, a card
     xl   112 -> 144 px a row in a picker -- the reason the rep opened it
     2xl  160 -> 224 px the product's own screen

   Every size is a FIXED box with object-contain on white, so a tall bottle and
   a wide cable both show in full and a list does not jump about as pictures
   load.

   TAP TO ENLARGE. Where the picture is not inside something that selects on
   click, tapping it opens it at full size. `zoom={false}` turns that off for
   pickers: a Radix dialog opened from inside a popover closes the popover
   behind it, and the person would lose their search.
   ─────────────────────────────────────────────────────────────────────────── */

export type ProductImageSize = "md" | "lg" | "xl" | "2xl";

const BOX: Record<ProductImageSize, string> = {
  md: "size-16",
  lg: "size-24 sm:size-28",
  xl: "size-28 sm:size-36",
  "2xl": "size-40 sm:size-56",
};

/** Pixels to ask Cloudinary for: twice the largest CSS size, for sharp screens. */
const WIDTH: Record<ProductImageSize, number> = { md: 160, lg: 300, xl: 400, "2xl": 560 };

const ICON: Record<ProductImageSize, string> = {
  md: "size-5", lg: "size-7", xl: "size-9", "2xl": "size-12",
};

export function ProductImage({
  url,
  name,
  size = "lg",
  zoom = true,
  className,
}: {
  url: string | null | undefined;
  name: string;
  size?: ProductImageSize;
  /** Tap to see it full size. Off inside pickers. */
  zoom?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [broken, setBroken] = React.useState(false);

  const box = cn(
    BOX[size],
    "shrink-0 rounded-lg overflow-hidden relative",
    "bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700",
    className
  );

  if (!url || broken) {
    return (
      <div className={cn(box, "bg-slate-100 dark:bg-navy-800 flex items-center justify-center")}
        role="img" aria-label={`No picture of ${name}`}>
        <ImageIcon className={cn(ICON[size], "text-slate-300 dark:text-slate-600")} />
      </div>
    );
  }

  /* Cloudinary URLs: next/image would need the domain whitelisted, and the
     width is already asked for in the URL (lib/images.ts). */
  const picture = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageAt(url, WIDTH[size]) ?? url}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="size-full object-contain p-1.5"
    />
  );

  if (!zoom) return <div className={box}>{picture}</div>;

  return (
    <>
      <button
        type="button"
        className={cn(box, "group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-brand-yellow")}
        aria-label={`Enlarge picture of ${name}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {picture}
        <span className="absolute right-1 bottom-1 size-6 rounded-full bg-navy-900/70 text-white
          flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100
          transition-opacity pointer-events-none">
          <ZoomIn className="size-3.5" />
        </span>
      </button>

      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl p-2 sm:p-3" size="xl">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <div className="bg-white rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageAt(url, 1400) ?? url} alt={name}
                className="w-full max-h-[80vh] object-contain" />
            </div>
            <div className="px-2 pt-2 pb-1 text-sm font-medium text-navy-900 dark:text-white">{name}</div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
