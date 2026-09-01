import axios from "axios";
import { API_BASE_URL, authHeader } from "@/components/providers/session-provider";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Spreadsheet export
 * ─────────────────────────────────────────────────────────────────────────────
 * The API builds the .xlsx from the same list query the screen ran, so the file
 * is what was on the page — filters and all — with money, dates and counts as
 * real typed cells rather than text that merely looks like numbers.
 *
 * WHY THIS FETCHES RATHER THAN NAVIGATES. The export routes sit behind
 * `[Authorize]`, and a plain `window.open` sends cookies but no
 * `Authorization: Bearer` header, so it would open a 401 page. So the file is
 * fetched as a blob with the header attached and handed to the browser from
 * memory. Nothing touches the disk until the user's own download does.
 */
export async function downloadXlsx(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  fallbackName = "export.xlsx"
): Promise<void> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") clean[k] = v;
  }

  const res = await axios.get<Blob>(`${API_BASE_URL}/${path}`, {
    params: clean,
    headers: authHeader(),
    responseType: "blob",
  });

  /* The API names the file in Content-Disposition; fall back only if a proxy
     has stripped the header. */
  const disposition = String(res.headers["content-disposition"] ?? "");
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * An axios error whose body is a Blob — which every failure from a
 * `responseType: "blob"` request is — has to be read back as text before the
 * `{ message }` inside it can be shown. Without this the user gets
 * "[object Blob]".
 */
export async function exportError(e: unknown, fallback = "Please try again."): Promise<string> {
  if (!axios.isAxiosError(e) || !e.response) return "Cannot reach the server.";
  const body = e.response.data;
  try {
    const text = body instanceof Blob ? await body.text() : JSON.stringify(body);
    return (JSON.parse(text) as { message?: string })?.message ?? fallback;
  } catch {
    return fallback;
  }
}
