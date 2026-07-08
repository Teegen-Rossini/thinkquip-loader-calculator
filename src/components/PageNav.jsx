import { ArrowLeftIcon, ArrowRightIcon } from './icons';
import './PageNav.css';

/**
 * Consistent per-page navigation footer. The previous button (if any) sits
 * bottom-left, the next / print button bottom-right. All buttons share one
 * size across every page. On the final page, pass `onPrint` instead of a
 * next target to render the turquoise "Print / Save as PDF" end-of-sequence
 * button.
 */
export default function PageNav({ prevLabel, onPrev, nextLabel, onNext, onPrint }) {
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
        {onPrint && (
          <button type="button" className="btn-nav btn-nav--print" onClick={onPrint}>
            Print / Save as PDF
          </button>
        )}
      </div>
    </div>
  );
}
