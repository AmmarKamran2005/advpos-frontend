"use client";

import * as React from "react";
import axios from "axios";
import { z } from "zod";
import { Plus, Folder, FolderOpen, Edit3, Trash2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityFormDialog } from "@/components/dialogs/entity-form-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/* GET /inventory/categories -> productCount is counted by the API, so the whole
   product table never has to reach the browser just to size a badge. */
type Category = {
  id: number;
  name: string;
  parentId: number | null;
  parentName: string | null;
  isActive: boolean;
  productCount: number;
};

const Schema = z.object({
  name: z.string().min(2, "Name required").max(100),
  parentId: z.coerce.number().optional().or(z.literal("")),
  isActive: z.boolean(),
});
type Form = z.infer<typeof Schema>;

/** Every failure comes back as { message } -- show the wording the API chose. */
function apiMessage(e: unknown, fallback: string) {
  if (axios.isAxiosError(e) && e.response) {
    return (e.response.data as { message?: string })?.message ?? fallback;
  }
  return "Cannot reach the server.";
}

/* EntityFormDialog raises its own toast the instant onSubmit resolves, reading
   this object at that moment. Writing the server's reply here first gives one
   save exactly one toast, in the API's wording. */
const savedMessage: { title: string; description?: string } = { title: "Category saved" };

export default function CategoriesPage() {
  const [rows, setRows] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; cat?: Category } | null>(null);
  const [del, setDel] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await axios.get<Category[]>(`${API_BASE_URL}/inventory/categories`, {
        headers: authHeader(),
      });
      setRows(res.data);
      setError(null);
    } catch (e) {
      setError(apiMessage(e, "Could not load the categories."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       axios inside the page is the brief for this project. */
    void load();
  }, [load]);

  const roots = rows.filter((c) => c.parentId === null);

  const fields: Parameters<typeof EntityFormDialog<Form>>[0]["fields"] = [
    { name: "name", label: "Category name", type: "text", placeholder: "e.g. Earbuds", required: true, fullWidth: true },
    {
      name: "parentId", label: "Parent category", type: "select",
      options: [
        { value: "", label: "— Top level —" },
        ...rows
          .filter((c) => c.parentId === null && c.id !== dialog?.cat?.id)
          .map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    { name: "isActive", label: "Active", type: "switch", hint: "Inactive categories are hidden in product creation", fullWidth: true },
  ];

  async function save(values: Form) {
    const payload = {
      name: values.name,
      parentId: values.parentId === "" ? null : Number(values.parentId),
      isActive: values.isActive,
    };
    const res =
      dialog?.mode === "edit" && dialog.cat
        ? await axios.put<{ message: string }>(`${API_BASE_URL}/inventory/categories/${dialog.cat.id}`, payload, { headers: authHeader() })
        : await axios.post<{ message: string }>(`${API_BASE_URL}/inventory/categories`, payload, { headers: authHeader() });

    savedMessage.title = res.data.message;
    savedMessage.description = undefined;
    await load();
  }

  async function remove() {
    if (!del) return;
    setDeleting(true);
    try {
      const res = await axios.delete<{ message: string }>(`${API_BASE_URL}/inventory/categories/${del.id}`, { headers: authHeader() });
      toast.success(res.data.message);
      setDel(null);
      await load();
    } catch (e) {
      toast.error(apiMessage(e, "Could not delete the category."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inventory" }, { label: "Categories" }]}
        title="Categories"
        subtitle="Organize products in a hierarchical tree"
        actions={
          <Button variant="accent" size="md" className="gap-1.5" onClick={() => setDialog({ mode: "create" })}>
            <Plus />
            <span>New Category</span>
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

      <Card>
        <CardBody>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : roots.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No categories yet.
            </div>
          ) : (
            <div className="space-y-1">
              {roots.map((root) => {
                const children = rows.filter((c) => c.parentId === root.id);
                return (
                  <div key={root.id}>
                    <CategoryRow icon={FolderOpen} category={root} isRoot
                      onEdit={() => setDialog({ mode: "edit", cat: root })}
                      onDelete={() => setDel(root)} />
                    {children.map((child) => (
                      <div key={child.id} className="ml-7">
                        <CategoryRow icon={Folder} category={child}
                          onEdit={() => setDialog({ mode: "edit", cat: child })}
                          onDelete={() => setDel(child)} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <EntityFormDialog<Form>
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        mode={dialog?.mode ?? "create"}
        title="Category"
        schema={Schema}
        fields={fields}
        defaultValues={{
          name: dialog?.cat?.name ?? "",
          parentId: (dialog?.cat?.parentId ?? "") as number | "",
          isActive: dialog?.cat?.isActive ?? true,
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
            ? `This category has ${del.productCount} product(s). The server will refuse the delete — move them first, or set the category inactive instead.`
            : "This cannot be undone."
        }
        variant="danger"
        confirmLabel={deleting ? "Deleting…" : "Delete category"}
        onConfirm={() => { void remove(); }}
      />
    </>
  );
}

function CategoryRow({ icon: Icon, category, isRoot, onEdit, onDelete }: {
  icon: typeof Folder; category: Category; isRoot?: boolean; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-700 group">
      <Icon className={`size-4 ${isRoot ? "text-brand-yellow" : "text-slate-400"}`} />
      <span className={`text-sm flex-1 ${isRoot ? "font-semibold text-navy-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
        {category.name}
        {!category.isActive && <span className="ml-2 text-2xs text-slate-400">(inactive)</span>}
      </span>
      <Badge variant="muted">{category.productCount} products</Badge>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${category.name}`}><Edit3 /></Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${category.name}`} className="text-danger"><Trash2 /></Button>
      </div>
    </div>
  );
}
