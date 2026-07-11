/**
 * Installs `window.thinkquipDesktop` when the app is running inside the Tauri
 * desktop shell. This is the bridge the two-copy save logic already expects
 * (see saveSalesmanCopy.js) — nothing there had to change.
 *
 * In a plain browser this is a no-op: the bridge is absent, so the save logic
 * takes its existing browser fallback. The web dev flow keeps working untouched.
 *
 * Every filesystem call passes the configured base folder, and the Rust side
 * refuses any path outside it — the frontend has no general filesystem access.
 */
import { invoke } from '@tauri-apps/api/core';
import { SALESMAN_COPIES_BASE_PATH } from './salesmanCopyPath';

/** Tauri v2 injects this on the window; a browser never has it. */
export function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function installDesktopBridge() {
  if (!isTauri()) return false;

  const base = SALESMAN_COPIES_BASE_PATH;
  // Tauri serialises Rust's Vec<u8> as a plain number array in both directions.
  const toBytes = (contents) => Array.from(contents);

  window.thinkquipDesktop = {
    isDesktop: true,

    /** The brochure as PDF bytes, rendered by WebView2's own print pipeline —
     *  same @media print CSS as the print dialog, but silent. */
    renderPdf: async () => new Uint8Array(await invoke('render_pdf')),

    ensureDir: (dir) => invoke('ensure_dir', { base, dir }),
    exists: (path) => invoke('path_exists', { base, path }),
    writeFile: (path, contents) => invoke('write_file', { base, path, contents: toBytes(contents) }),

    /** Only used when the shared folder is unreachable, so a PDF is never lost.
     *  Resolves to the chosen path, or null if the salesman cancelled. */
    saveAs: (defaultName, contents) =>
      invoke('save_as', { defaultName, contents: toBytes(contents) }),
  };

  return true;
}
