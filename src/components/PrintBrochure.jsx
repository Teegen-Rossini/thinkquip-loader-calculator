import PrintCover from './PrintCover';
import PrintInputsPage from './PrintInputsPage';
import PrintComparisonPage from './PrintComparisonPage';
import PrintTimelinePage from './PrintTimelinePage';
import PrintSpecSheet from './PrintSpecSheet';
import './PrintBrochure.css';

/**
 * The printed brochure: Cover → Inputs & Assumptions → Machine Comparison →
 * Cost Timeline → Spec Appendix (SW956E page, then SYL956H5 page).
 *
 * Hidden on screen (.print-only), it is the ONLY thing that prints. The page
 * list is assembled first so "Page X of Y" stays correct whichever pages
 * render for the current inputs.
 */
export default function PrintBrochure({ comparison, inputs, preview = false }) {
  const pages = [
    (p) => <PrintCover key="cover" comparison={comparison} inputs={inputs} {...p} />,
    (p) => <PrintInputsPage key="inputs" inputs={inputs} {...p} />,
    (p) => <PrintComparisonPage key="comparison" comparison={comparison} inputs={inputs} {...p} />,
    (p) => <PrintTimelinePage key="timeline" comparison={comparison} inputs={inputs} {...p} />,
    (p) => <PrintSpecSheet key="spec-electric" machine={comparison.electricMachine} comparison={comparison} {...p} />,
    (p) => <PrintSpecSheet key="spec-diesel" machine={comparison.dieselMachine} comparison={comparison} {...p} />,
  ];

  const pageCount = pages.length;

  return (
    <div className={`print-only print-brochure${preview ? ' print-brochure--preview' : ''}`}>
      {pages.map((render, i) =>
        render({ pageNumber: i + 1, pageCount, isLast: i === pageCount - 1 }),
      )}
    </div>
  );
}
