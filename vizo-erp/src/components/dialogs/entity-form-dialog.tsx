"use client";

import * as React from "react";
import { useForm, type FieldValues, type DefaultValues } from "react-hook-form";
import type { ZodType } from "zod";
import { Save, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Switch } from "@/components/ui/switch";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { vizoResolver } from "@/lib/zod-resolver";
import { toast } from "@/components/ui/toaster";

/* ─────────────────────────────────────────────────────────────────────────
   EntityFormDialog
   --------------------------------------------------------------------------
   Generic create/edit dialog for simple entities (categories, brands, uom,
   locations, accounts, templates, etc.). Pass:
     - schema: zod schema
     - fields: declarative field config
     - defaultValues / values to populate
     - onSubmit handler
   ───────────────────────────────────────────────────────────────────────── */

export type FieldOption = { value: string | number; label: string };

export type EntityField = {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "tel" | "url" | "date" | "textarea" | "select" | "switch";
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: FieldOption[];
  /** When type=number / textarea / select etc. extra props passed to control. */
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  /** Fill the row (sm:col-span-2). */
  fullWidth?: boolean;
  /** Disable in edit mode (e.g. SKU, party code) */
  disabledOnEdit?: boolean;
};

export interface EntityFormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  title: string;
  description?: string;
  schema: ZodType<T>;
  fields: EntityField[];
  defaultValues: DefaultValues<T>;
  size?: "sm" | "md" | "lg" | "xl";
  successMessage?: { title: string; description?: string };
  onSubmit?: (data: T) => Promise<void> | void;
}

export function EntityFormDialog<T extends FieldValues>({
  open, onOpenChange, mode, title, description, schema, fields, defaultValues,
  size = "lg", successMessage, onSubmit,
}: EntityFormDialogProps<T>) {
  const form = useForm<T>({
    resolver: vizoResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(data: T) {
    if (onSubmit) await onSubmit(data);
    toast.success(
      successMessage?.title ?? (mode === "edit" ? "Saved successfully" : "Created successfully"),
      { description: successMessage?.description }
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? `Edit ${title}` : `New ${title}`}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="contents" noValidate>
            <DialogBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((f) => (
                  <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    key={f.name as string}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    name={f.name as any}
                    render={({ field }) => (
                      <FormItem className={f.fullWidth || f.type === "textarea" ? "sm:col-span-2" : ""}>
                        {f.type !== "switch" && (
                          <FormLabel required={f.required}>{f.label}</FormLabel>
                        )}
                        <FormControl>
                          {f.type === "textarea" ? (
                            <Textarea rows={f.rows ?? 3} placeholder={f.placeholder} {...field} value={field.value ?? ""} />
                          ) : f.type === "select" ? (
                            <SelectNative {...field} value={field.value ?? ""}>
                              <option value="">— Select —</option>
                              {f.options?.map((o) => (
                                <option key={String(o.value)} value={o.value}>{o.label}</option>
                              ))}
                            </SelectNative>
                          ) : f.type === "switch" ? (
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-navy-700">
                              <div>
                                <FormLabel className="!mb-0">{f.label}</FormLabel>
                                {f.hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>}
                              </div>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </div>
                          ) : (
                            <Input
                              type={f.type}
                              placeholder={f.placeholder}
                              min={f.min}
                              max={f.max}
                              step={f.step}
                              disabled={mode === "edit" && f.disabledOnEdit}
                              {...field}
                              value={field.value ?? ""}
                            />
                          )}
                        </FormControl>
                        {f.hint && f.type !== "switch" && <FormDescription>{f.hint}</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                <X /> Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save /> {mode === "edit" ? "Save changes" : "Create"}</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
