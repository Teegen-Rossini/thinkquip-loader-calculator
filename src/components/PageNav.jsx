import { ArrowLeftIcon, ArrowRightIcon } from './icons';
import './PageNav.css';

/**
 * Consistent per-page navigation footer. The previous button (if any) sits
 * bottom-left, the next / output buttons bottom-right. All buttons share one
 * size across every page. On the final page, pass the two copy handlers instead
 * of a next target to render the end-of-sequence output buttons: ThinkQuip's
 * filed record, then the customer take-home brochure — saved as a file (desktop
 * only, when onSaveCustomerCopy is given) and/or printed.
 */
export default function PageNav({
  prevLabel,
  onPrev,
  nextLabel,
  onNext,
  onPrintCustomerCopy,
  onSaveCustomerCopy,
  onSaveThinkquipCopy,
  saving = false,
}) {
  return (
    <div className="page-nav no-print">
      <div className="page-nav__slot page-nav__slot--left">
        {prevLabel && (
          <button type="button" className="btn-nav btn-nav--prev" onClick={onPrev}>
            <ArrowLeftIcon /> Previous: {prevLabel}
          </button>
        )}
      </div>
      <div className="page-nav__slot page-nav__slot--right">
        {nextLabel && (
          <button type="button" className="btn-nav btn-nav--next" onClick={onNext}>
            Next: {nextLabel} <ArrowRightIcon />
          </button>
        )}
        {onSaveThinkquipCopy && (
          <button
            type="button"
            className="btn-nav btn-nav--thinkquip-copy"
            onClick={onSaveThinkquipCopy}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save ThinkQuip Copy'}
          </button>
        )}
        {onSaveCustomerCopy && (
          <button
            type="button"
            className="btn-nav btn-nav--print"
            onClick={onSaveCustomerCopy}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Customer Copy'}
          </button>
        )}
        {onPrintCustomerCopy && (
          <button type="button" className="btn-nav btn-nav--print" onClick={onPrintCustomerCopy}>
            {onSaveCustomerCopy ? 'Print Customer Copy' : 'Print / Save Customer Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
