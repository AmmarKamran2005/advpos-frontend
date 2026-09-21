"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ProductImage } from "@/components/products/product-image";

/* A product dropdown that shows the PICTURE.

   A native <select> cannot: an <option> is text and nothing else. Where a
   screen used one to choose a product (adding a line to an order being edited,
   picking the item on a claim), the owner's rule -- "pictures must be most
   prominent and in large size, so that user can see product very much easily"
   -- could not be met without replacing it, so this is what replaces it.

   The trigger is whatever the caller passes, so the same picker works as an
   "Add an item" button on a list of lines and as a card showing the item
   already chosen. */

export type PickableProduct = { id: number; sku: string; name: string; imageUrl?: string | null };

export function ProductPicker<P extends PickableProduct>({
  products,
  onPick,
  trigger,
  detail,
  right,
  align = "start",
}: {
  products: P[];
  onPick: (product: P) => void;
  /** Rendered inside PopoverTrigger asChild, so it must be one element that takes a ref. */
  trigger: React.ReactElement;
  /** The small grey line under the name. Defaults to the code. */
  detail?: (product: P) => React.ReactNode;
  /** The figure at the right-hand end of a row -- a price, a stock count. */
  right?: (product: P) => React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[min(96vw,44rem)] p-0" align={align}>
        <Command>
          <CommandInput placeholder="Search by name or code…" />
          <CommandList className="max-h-[72vh]">
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup heading={`${products.length} items`}>
              {products.map((p) => (
                <CommandItem key={p.id} value={`${p.name} ${p.sku}`} className="gap-4 py-3"
                  onSelect={() => { onPick(p); setOpen(false); }}>
                  <ProductImage url={p.imageUrl} name={p.name} size="xl" zoom={false} />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-navy-900 dark:text-white line-clamp-3">{p.name}</div>
                    <div className="text-xs tabular text-slate-500 dark:text-slate-400 mt-1">
                      {detail ? detail(p) : p.sku}
                    </div>
                  </div>
                  {right && (
                    <span className="tabular text-base font-bold text-navy-900 dark:text-white shrink-0">{right(p)}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
