/**
 * Saving the "ThinkQuip Copy" PDF (ThinkQuip's master record of the quote).
 *
 * The label on the document is always "THINKQUIP COPY"; the SAVE FOLDER is the
 * logged-in salesman's subfolder, so every ThinkQuip Copy collects in one
 * company log sorted by salesman.
 *
 * A browser CANNOT silently write a file into a chosen folder — it can only
 * suggest a filename in a save dialog. So this module is split in two:
 *
 *   1. DESKTOP (Tauri, the next prompt): if a desktop bridge is present on
 *      `window.thinkquipDesktop`, we render the brochure to PDF bytes, create
 *      the salesman's subfolder, pick a non-colliding filename, and write it
 *      silently to the shared cloud folder.
 *   2. BROWSER (now): no filesystem access, so we degrade gracefully — set the
 *      document title to the same filename pattern (which is what the print
 *      dialog offers as the default "Save as PDF" name) and open the normal
 *      save/print flow. No errors, no silent failures.
 *
 * The desktop layer only has to implement the small bridge interface below; it
 * does not need to rewrite any of this, and it reuses the exact same path and
 * filename rules from salesmanCopyPath.js.
 *
 *   window.thinkquipDesktop = {
 *     isDesktop: true,
 *     renderPdf(): Promise<Uint8Array>,        // the brochure as PDF bytes
 *     ensureDir(dirPath): Promise<void>,       // mkdir -p, throws if unreachable
 *     exists(filePath): Promise<boolean>,
 *     writeFile(filePath, bytes): Promise<void>,
 *   }
 */
import {
  buildSalesmanCopyTarget,
  suggestedFileName,
  candidateFileName,
  joinPath,
  SALESMAN_COPIES_BASE_PATH,
} from './salesmanCopyPath';
import { printWithSuggestedName } from './printDialog';

/** The desktop bridge, or null in a plain browser. */
export function getDesktopBridge() {
  const bridge = typeof window !== 'undefined' ? window.thinkquipDesktop : null;
  return bridge && bridge.isDesktop ? bridge : null;
}

export const isDesktop = () => getDesktopBridge() !== null;

/** How many " (2)", " (3)" … variants to try before giving up and timestamping. */
const MAX_COLLISION_ATTEMPTS = 50;

/** Find the first filename in the salesman's folder that isn't taken. */
async function firstFreePath(bridge, dir, stem) {
  for (let attempt = 0; attempt < MAX_COLLISION_ATTEMPTS; attempt += 1) {
    const candidate = joinPath(dir, candidateFileName(stem, attempt));
    // eslint-disable-next-line no-await-in-loop -- must probe names in order
    if (!(await bridge.exists(candidate))) return candidate;
  }
  // Pathological case: fall back to a timestamp so we still never overwrite.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return joinPath(dir, `${stem} (${stamp}).pdf`);
}

/**
 * Save the ThinkQuip Copy.
 *
 * Returns a result the UI can show directly:
 *   { ok: true,  mode: 'desktop', path, message }
 *   { ok: true,  mode: 'browser', suggestedName, message }
 *   { ok: false, mode: 'browser', message }   // desktop write failed → fell back
 *
 * A failed auto-file NEVER blocks the salesman: we always fall back to the
 * normal save dialog so they can still produce the PDF.
 */
export async function saveSalesmanCopy({ salesman, inputs }) {
  const target = buildSalesmanCopyTarget({ salesman, inputs });
  const bridge = getDesktopBridge();
  // Always the ThinkQuip variant — this is ThinkQuip's master record.
  const suggestedName = suggestedFileName('thinkquip', { inputs });

  // --- Plain browser: no filesystem access. Degrade gracefully. ---
  if (!bridge) {
    printWithSuggestedName(suggestedName);
    return {
      ok: true,
      mode: 'browser',
      suggestedName,
      message: `Your browser can't file PDFs automatically. Save it as "${suggestedName}.pdf" — the desktop app files it for you.`,
    };
  }

  // --- Desktop: the config must be usable before we try to write. ---
  if (!target.ok) {
    printWithSuggestedName(suggestedName);
    const why =
      target.reason === 'no-folder-name'
        ? 'your profile has no folder name set — contact the administrator'
        : `no salesman-copies folder is configured (set VITE_SALESMAN_COPIES_BASE_PATH; currently "${SALESMAN_COPIES_BASE_PATH}")`;
    return {
      ok: false,
      mode: 'browser',
      message: `Couldn't file this copy automatically: ${why}. Opened the normal save dialog instead.`,
    };
  }

  try {
    // Creates {base}\{folder_name} if it isn't there yet; throws if the base
    // folder itself is unreachable (e.g. Google Drive not mounted).
    await bridge.ensureDir(target.dir);
    const filePath = await firstFreePath(bridge, target.dir, target.stem);
    const bytes = await bridge.renderPdf();
    await bridge.writeFile(filePath, bytes);
    return {
      ok: true,
      mode: 'desktop',
      path: filePath,
      message: `ThinkQuip Copy saved to ${filePath}`,
    };
  } catch {
    // Unreachable folder (Drive not mounted), permission or render failure.
    // NEVER lose the PDF: on the desktop, offer a manual save location.
    const reason = `Couldn't reach "${target.dir}" — check that the shared drive is connected.`;

    if (typeof bridge.saveAs === 'function') {
      try {
        const bytes = await bridge.renderPdf();
        const savedTo = await bridge.saveAs(`${suggestedName}.pdf`, bytes);
        if (savedTo) {
          return {
            ok: false,
            mode: 'desktop-manual',
            path: savedTo,
            message: `${reason} Saved to ${savedTo} instead — move it into the shared folder when the drive is back.`,
          };
        }
        return {
          ok: false,
          mode: 'cancelled',
          message: `${reason} The save was cancelled, so this copy was NOT filed.`,
        };
      } catch {
        // Even the manual save failed — fall through to the print dialog below.
      }
    }

    printWithSuggestedName(suggestedName);
    return {
      ok: false,
      mode: 'browser',
      message: `${reason} Opened the normal save dialog instead.`,
    };
  }
}
