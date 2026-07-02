/**
 * Escape a value for safe interpolation inside HTML text/attribute contexts.
 * Use this on every dynamic value written into print/export document strings
 * to prevent stored XSS.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
