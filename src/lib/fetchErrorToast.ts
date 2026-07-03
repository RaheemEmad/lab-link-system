import { toast } from "sonner";

/**
 * Show a "failed to load" toast, but skip it in cases where a toast would be noise:
 * - The browser is offline (the global offline banner already communicates this).
 * - The error just means "no rows" (PGRST116) — that's an empty state, not a failure.
 * - The error is a benign abort (e.g. component unmounted mid-fetch).
 */
export function notifyFetchError(message: string, error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const err = error as { code?: string; name?: string; message?: string } | null;
  if (!err) return;
  if (err.code === "PGRST116") return; // no rows
  if (err.name === "AbortError") return;

  const msg = err.message?.toLowerCase() ?? "";
  if (msg.includes("failed to fetch") || msg.includes("networkerror")) return;

  toast.error(message, err.message ? { description: err.message } : undefined);
}
