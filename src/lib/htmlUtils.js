/**
 * Escapes a value for safe interpolation into an HTML string.
 * Must be used on ALL user-provided data before inserting into
 * template literals that are rendered via document.write() or innerHTML.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
