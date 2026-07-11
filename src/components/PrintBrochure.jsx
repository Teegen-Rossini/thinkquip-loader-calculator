import PrintCover from './PrintCover';
import PrintInputsPage from './PrintInputsPage';
import PrintComparisonPage from './PrintComparisonPage';
import PrintTimelinePage from './PrintTimelinePage';
import PrintSpecSheet from './PrintSpecSheet';
import './PrintBrochure.css';

/**
 * The printed brochure: Cover → Inputs & Assumptions → Machine Comparison →
 * Cost Timeline → Spec Appendix (one page per selected machine — the two
 * SYL956H5 brake variants each get their own sheet with their own price).
 *
 * Hidden on screen (.print-only), it is the ONLY thing that prints. It renders
 * exactly the machines the user selected (multi-select), driven by the same
 * `selection` the screen uses. The page list is assembled first so "Page X of
 * Y" stays correct whichever pages render for the current selection.
 */
export default function PrintBrochure({
  selection,
  inputs,
  salesman,
  copyKind = 'customer',
  preview = false,
}) {
  const specResults = selection.machines;

  const pages = [
    (p) => (
      <PrintCover
        key="cover"
        selection={selection}
        inputs={inputs}
        salesman={salesman}
        copyKind={copyKind}
        {...p}
      />
    ),
    (p) => <PrintInputsPage key="inputs" selection={selection} inputs={inputs} {...p} />,
    (p) => <PrintComparisonPage key="comparison" selection={selection} inputs={inputs} {...p} />,
    (p) => <PrintTimelinePage key="timeline" selection={selection} inputs={inputs} {...p} />,
    ...specResults.map((result) => (p) => (
      <PrintSpecSheet key={`spec-${result.machine.uid}`} result={result} selection={selection} inputs={inputs} {...p} />
    )),
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
