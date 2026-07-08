import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { PREPARED_BY, THINKQUIP_LOGO } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import { PrintPage } from './PrintKit';

/** Brochure section 1 — cover: ThinkQuip + SANY logos, customer/date fields
 *  from the inputs, hero-machine cutout and the headline outcomes. The hero is
 *  NEUTRAL — whichever selected machine has the lowest total cost of ownership
 *  at the comparison window chosen on screen (electric or diesel). */
export default function PrintCover({ selection, inputs, pageNumber, pageCount }) {
  const { heroMachine, machines, comparisons, hasComparison, hoursPerYear, windowHours } = selection;
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
      <div className="print-cover__brands">
        <img src={THINKQUIP_LOGO} alt="ThinkQuip" className="print-cover__brands-thinkquip" />
        <img src={heroMachine.logo} alt="SANY" className="print-cover__brands-sany" />
      </div>

      <div className="print-cover__band">
        <p className="print-cover__eyebrow">Cost comparison — built on your operating numbers</p>
        <h1 className="print-cover__headline">
          Electric Loader<br />Fleet Savings Proposal
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
          <p className="print-cover__party-row"><span>Name</span>{PREPARED_BY.name}</p>
          <p className="print-cover__party-row"><span>Cell</span>{PREPARED_BY.cell}</p>
          <p className="print-cover__party-row"><span>Email</span>{PREPARED_BY.email}</p>
        </div>
        <div className="print-cover__party">
          <p className="print-cover__field-label">Date</p>
          <p className="print-cover__field-value">{dateText}</p>
        </div>
      </div>

      <div className="print-cover__stats">
        <div className="print-cover__stat">
          <p className="print-cover__stat-label">{hasComparison ? `Cheapest at ${formatHours(windowHours)}` : 'Selected machine'}</p>
          <p className="print-cover__stat-value">{heroMachine.name}</p>
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
                  ? `${heroMachine.name} is cheaper ${best.crossoverDirection === 'loses' ? 'until' : 'from'} ~${formatYearsFromHours(crossover, hoursPerYear)} at your hours`
                  : `${heroMachine.name} is cheaper across the whole range at these inputs`}
              </p>
            </div>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                Saving @ {formatHours(windowHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{hasSavings ? formatCurrency(savings) : '—'}</p>
              <p className="print-cover__stat-sub">vs {best.machine.displayName}</p>
            </div>
          </>
        ) : (
          <>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                Total cost @ {formatHours(windowHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{formatCurrency(heroResult.tcoAtWindow)}</p>
              <p className="print-cover__stat-sub">purchase price plus escalated running cost</p>
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
