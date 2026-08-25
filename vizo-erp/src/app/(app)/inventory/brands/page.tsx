"use client";

import * as React from "react";
import axios from "axios";
import { z } from "zod";
import { Plus, Tag, Package, Edit3, Trash2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityFormDialog } from "@/components/dialogs/entity-form-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /inventory/brands -> productCount counted by the API. */
type Brand = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
};

const Schema = z.object({
  code: z.string().min(2, "Code required").max(20),
  name: z.string().min(2, "Name required").max(100),
  description: z.string().max(200).optional(),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

const savedMessage: { title: string; description?: string } = { title: "Brand saved" };

export default function BrandsPage() {
  const [rows, setRows] = React.useState<Brand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; brand?: Brand } | null>(null);
  const [del, setDel] = React.useState<Brand | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Brand[]>(`${API_BASE_URL}/inventory/brands`, { headers: authHeader() });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the brands."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "code", label: "Brand code", type: "text", placeholder: "e.g. VIZO", required: true },
    { name: "name", label: "Brand name", type: "text", placeholder: "e.g. Vizo Accessories", required: true },
    { name: "description", label: "Description", type: "textarea", fullWidth: true },
    { name: "isActive", label: "Active", type: "switch", hint: "Inactive brands are hidden in product creation", fullWidth: true },
  ];

  async function save(values: Form) {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description || null,
      isActive: values.isActive,
    };
    const res =
      dialog?.mode === "edit" && dialog.brand
        ? await axios.put<{ message: string }>(`${API_BASE_URL}/inventory/brands/${dialog.brand.id}`, payload, { headers: authHeader() })
        : await axios.post<{ message: string }>(`${API_BASE_URL}/inventory/brands`, payload, { headers: authHeader() });

    savedMessage.title = res.data.message;
    savedMessage.description = undefined;
    await load();
  }

  async function remove() {
    if (!del) return;
    setDeleting(true);
    try {
      const res = await axios.delete<{ message: string }>(`${API_BASE_URL}/inventory/brands/${del.id}`, { headers: authHeader() });
      toast.success(res.data.message);
      setDel(null);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the brand."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Brands" }]}
        title="Brands"
        subtitle="Manufacturers and labels carried in the catalogue"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Brand</span>
          </Button>
        }
      />

      {error && (
        <Card className="p-4 mb-6 border-danger/40">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-danger shrink-0" />
            <div className="flex-1 min-w-0 font-medium text-navy-900 dark:text-white">{error}</div>
            <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No brands yet.</div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <Card key={b.id} className="group">
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-lg bg-brand-yellow/10 grid place-items-center shrink-0">
                      <Tag className="size-4 text-brand-yellow-700 dark:text-brand-yellow" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-900 dark:text-white truncate">{b.name}</div>
                      <div className="text-2xs tabular text-slate-500 dark:text-slate-400">{b.code}</div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDialog({ mode: "edit", brand: b })} aria-label={`Edit ${b.name}`}><Edit3 /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDel(b)} aria-label={`Delete ${b.name}`} className="text-danger"><Trash2 /></Button>
                  </div>
                </div>

                {b.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2">{b.description}</p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="muted" className="gap-1">
                    <Package className="size-3" />{b.productCount} products
                  </Badge>
                  {!b.isActive && <Badge variant="muted">Inactive</Badge>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Brand"
        schema={Schema}
        fields={fields}
        defaultValues={{
          code: dialog?.brand?.code ?? "",
          name: dialog?.brand?.name ?? "",
          description: dialog?.brand?.description ?? "",
          isActive: dialog?.brand?.isActive ?? true,
        }}
        onSubmit={save}
        successMessage={savedMessage}
      />

      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description={
          del && del.productCount > 0
            ? `This brand has ${del.productCount} product(s). The server will refuse the delete — reassign them first, or set the brand inactive instead.`
            : "This cannot be undone."
        }
        variant="danger"
        confirmLabel={deleting ? "Deleting…" : "Delete brand"}
        onConfirm={() => { void remove(); }}
      />
    </>
  );
}
