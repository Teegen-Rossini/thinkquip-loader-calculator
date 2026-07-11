/**
 * Where a "Salesman Copy" PDF is filed, and under what name.
 *
 * Pure string/path logic only — no filesystem, no React. The desktop (Tauri)
 * layer and the browser fallback both build their names from here, so the two
 * can never drift apart.
 *
 * Target path:
 *   {SALESMAN_COPIES_BASE_PATH}\{folder_name}\{Prepared-For name} - {quote date}.pdf
 */

/**
 * The shared cloud folder that holds every salesman's subfolder.
 *
 * This differs per machine (it's a Google Drive for Desktop mount), so it is a
 * CONFIG VALUE, not a constant buried in a component: set
 * `VITE_SALESMAN_COPIES_BASE_PATH` in .env to override it on a given machine.
 * The default below is the current standard mount.
 */
export const SALESMAN_COPIES_BASE_PATH =
  (import.meta.env?.VITE_SALESMAN_COPIES_BASE_PATH ?? '').trim() || 'G:\\My Drive\\Salesman Copies';

/** Used when the customer name on the cover is left blank. */
export const FALLBACK_CUSTOMER_NAME = 'Unnamed Customer';

/** Characters Windows/macOS forbid in a filename component. */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;
const isControlChar = (ch) => { const n = ch.charCodeAt(0); return n < 32 || n === 127; };

/**
 * Make a string safe as a filename component: replace the illegal characters
 * with a space, drop control characters, collapse whitespace, and trim the
 * trailing dots/spaces Windows silently rejects. Hyphens and underscores are
 * preserved (they are legal and common in company names).
 */
export function sanitizeFilenamePart(value, fallback = FALLBACK_CUSTOMER_NAME) {
  const cleaned = String(value ?? '')
    .split('').filter((ch) => !isControlChar(ch)).join('')
    .replace(ILLEGAL_FILENAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

/** The quote date as a filename-safe YYYY-MM-DD. Falls back to today when the
 *  cover's date field is missing or malformed. */
export function safeQuoteDate(quoteDate) {
  if (typeof quoteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(quoteDate)) return quoteDate;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Join Windows-style path segments without doubling separators. */
export function joinPath(...segments) {
  return segments
    .filter(Boolean)
    .map((s, i) =>
      i === 0
        ? String(s).replace(/[\\/]+$/, '')
        : String(s).replace(/^[\\/]+/, '').replace(/[\\/]+$/, ''))
    .join('\\');
}

/**
 * The pieces of a Salesman Copy save target.
 *
 * Returns { ok: false, reason } when it cannot be built — no base path
 * configured, or the salesman's row has no folder_name. The caller surfaces
 * that clearly and falls back to a normal save dialog; it never fails silently.
 */
export function buildSalesmanCopyTarget({ salesman, inputs, basePath = SALESMAN_COPIES_BASE_PATH }) {
  if (!basePath) return { ok: false, reason: 'no-base-path' };

  const folderName = sanitizeFilenamePart(salesman?.folder_name, '');
  if (!folderName) return { ok: false, reason: 'no-folder-name' };

  const customer = sanitizeFilenamePart(inputs?.preparedForName);
  const date = safeQuoteDate(inputs?.quoteDate);
  const stem = `${customer} - ${date}`;

  return {
    ok: true,
    basePath,
    folderName,
    // The salesman's own subfolder inside the shared base folder.
    dir: joinPath(basePath, folderName),
    stem,
    fileName: `${stem}.pdf`,
    fullPath: joinPath(basePath, folderName, `${stem}.pdf`),
  };
}

/**
 * Candidate filenames for a target, in the order they should be tried.
 * Never overwrite: attempt 0 is the plain name, then " (2)", " (3)" … so an
 * earlier quote for the same customer and date is preserved.
 */
export function candidateFileName(stem, attempt) {
  return attempt === 0 ? `${stem}.pdf` : `${stem} (${attempt + 1}).pdf`;
}

/**
 * The two brochure variants. Content is identical; only the label stamped on
 * the cover differs — and, for THINKQUIP, where the PDF is filed.
 *
 * THINKQUIP's label is FIXED ("THINKQUIP COPY") no matter who is logged in —
 * it is ThinkQuip's master record. The salesman only decides the save FOLDER.
 */
export const COPY_KINDS = {
  customer: { kind: 'customer', label: 'CUSTOMER COPY', filePrefix: 'Customer Copy' },
  thinkquip: { kind: 'thinkquip', label: 'THINKQUIP COPY', filePrefix: 'ThinkQuip Copy' },
};

export function copyKindOrDefault(kind) {
  return COPY_KINDS[kind] ?? COPY_KINDS.customer;
}

/**
 * The suggested "Save as PDF" filename for a variant:
 *   "Customer Copy - {customer} - {date}"  /  "ThinkQuip Copy - {customer} - {date}"
 * (no extension — the save dialog appends .pdf).
 */
export function suggestedFileName(kind, { inputs }) {
  const customer = sanitizeFilenamePart(inputs?.preparedForName);
  const date = safeQuoteDate(inputs?.quoteDate);
  return `${copyKindOrDefault(kind).filePrefix} - ${customer} - ${date}`;
}
