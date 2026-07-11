import { formatCurrency, formatHours, formatYearsFromHours, variantName } from '../lib/format';
import { THINKQUIP_LOGO_TURQUOISE } from '../data/machinesConfig';
import { copyKindOrDefault } from '../lib/salesmanCopyPath';
import { applyVat } from '../lib/calculationEngine';
import { PrintPage } from './PrintKit';

/** Brochure section 1 — cover: ThinkQuip + SANY logos, customer/date fields
 *  from the inputs, hero-machine cutout and the headline outcomes. The hero is
 *  NEUTRAL — whichever selected machine has the lowest total cost of ownership
 *  at the comparison window chosen on screen (electric or diesel). */
export default function PrintCover({ selection, inputs, salesman, copyKind, pageNumber, pageCount }) {
  // Which of the two labelled variants this is. "THINKQUIP COPY" is a FIXED
  // label — never the salesman's name; it is ThinkQuip's master record.
  const copy = copyKindOrDefault(copyKind);
  const { heroMachine, machines, comparisons, hasComparison, hoursPerYear, windowHours, electricSelected } = selection;
  const heroResult = machines.find((m) => m.machine.uid === heroMachine.uid) ?? machines[0];

  // Strongest sales figure: the opponent with the widest gap at the window.
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.gapAtWindow ?? -Infinity) > (a.gapAtWindow ?? -Infinity) ? b : a))
    : null;
  const savings = best?.gapAtWindow;
  const hasSavings = savings != null && savings > 0;
  const crossover = best?.crossoverHours;

  // The quote date entered on the cover page is the source of truth; fall
  // back to today only if it is missing/invalid.
  const quoteDate = /^\d{4}-\d{2}-\d{2}$/.test(inputs.quoteDate ?? '')
    ? new Date(`${inputs.quoteDate}T00:00:00`)
    : new Date();
  const dateText = quoteDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount} className="print-cover">
      <p className={`print-cover__copy-label print-cover__copy-label--${copy.kind}`}>
        {copy.label}
      </p>

      <div className="print-cover__brands">
        <img src={THINKQUIP_LOGO_TURQUOISE} alt="ThinkQuip" className="print-cover__brands-thinkquip" />
        <img src={heroMachine.logo} alt="SANY" className="print-cover__brands-sany" />
      </div>

      <div className="print-cover__band">
        <p className="print-cover__eyebrow">Cost comparison — built on your operating numbers</p>
        <h1 className="print-cover__headline">
          {electricSelected ? <>Electric Loader<br />Fleet Savings Proposal</> : <>Wheel Loader<br />Fleet Cost Proposal</>}
        </h1>
      </div>

      <div className="print-cover__hero">
        <img src={heroMachine.photo} alt={heroMachine.displayName} />
      </div>

      <div className="print-cover__fields">
        <div className="print-cover__party">
          <p className="print-cover__field-label">Prepared For</p>
          <p className="print-cover__party-row"><span>Name</span>{inputs.preparedForName || 'Valued Customer'}</p>
          <p className="print-cover__party-row"><span>Cell</span>{inputs.preparedForCell || '—'}</p>
          <p className="print-cover__party-row"><span>Email</span>{inputs.preparedForEmail || '—'}</p>
        </div>
        <div className="print-cover__party">
          <p className="print-cover__field-label">Prepared By</p>
          <p className="print-cover__party-row"><span>Name</span>{salesman.name}</p>
          <p className="print-cover__party-row"><span>Cell</span>{salesman.cell}</p>
          <p className="print-cover__party-row"><span>Email</span>{salesman.email}</p>
        </div>
        <div className="print-cover__party">
          <p className="print-cover__field-label">Date</p>
          <p className="print-cover__field-value">{dateText}</p>
        </div>
      </div>

      <div className="print-cover__stats">
        <div className="print-cover__stat">
          <p className="print-cover__stat-label">{hasComparison ? `Cheapest at ${formatHours(windowHours)}` : 'Selected machine'}</p>
          <p className="print-cover__stat-value">{variantName(heroMachine)}</p>
          <p className="print-cover__stat-sub">
            {heroMachine.type === 'electric' ? 'SANY electric wheel loader — charger included' : 'SANY diesel wheel loader'}
          </p>
        </div>

        {hasComparison ? (
          <>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">Crossover</p>
              <p className="print-cover__stat-value">
                {crossover != null ? formatHours(crossover) : 'None in range'}
              </p>
              <p className="print-cover__stat-sub">
                {crossover != null
                  ? `${variantName(heroMachine)} is cheaper ${best.crossoverDirection === 'loses' ? 'until' : 'from'} ~${formatYearsFromHours(crossover, hoursPerYear)} at your hours`
                  : `${variantName(heroMachine)} is cheaper across the whole range at these inputs`}
              </p>
            </div>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                Saving @ {formatHours(windowHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{hasSavings ? formatCurrency(savings) : '—'}</p>
              <p className="print-cover__stat-sub">vs {variantName(best.machine)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                TCO @ {formatHours(windowHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{formatCurrency(heroResult.tcoAtWindow)}</p>
              <p className="print-cover__stat-sub">total cost of ownership — purchase price plus escalated running costs</p>
            </div>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">Running cost / h (year 0)</p>
              <p className="print-cover__stat-value">
                {formatCurrency(applyVat(heroResult.machine.type === 'electric' ? heroResult.perHour.elecPerH : heroResult.perHour.dieselPerH, inputs))}
              </p>
              <p className="print-cover__stat-sub">select a second machine to compare savings</p>
            </div>
          </>
        )}
      </div>
    </PrintPage>
  );
}
