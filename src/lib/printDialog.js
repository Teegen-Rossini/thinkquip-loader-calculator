/**
 * Opening the browser's print / "Save as PDF" dialog with a suggested filename.
 *
 * A browser derives the default PDF filename from the document title, so we
 * swap the title for the duration of the dialog and restore it afterwards.
 * This is the only way a plain browser can suggest a name — it cannot write to
 * a folder itself (that's the desktop app's job).
 */
export function printWithSuggestedName(suggestedName) {
  const previousTitle = document.title;
  document.title = suggestedName;

  const restore = () => {
    document.title = previousTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  // Safety net for browsers that don't fire afterprint reliably.
  setTimeout(restore, 60000);

  window.print();
}
