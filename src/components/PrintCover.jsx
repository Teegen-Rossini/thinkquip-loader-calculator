import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS, THINKQUIP_LOGO } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import { PrintPage } from './PrintKit';

/** Brochure section 1 — cover: ThinkQuip + SANY logos, customer/date fields
 *  from the inputs, hero-machine cutout and the headline outcomes. The hero is
 *  the electric machine when selected, else the cheapest selected machine. */
export default function PrintCover({ selection, inputs, pageNumber, pageCount }) {
  const { heroMachine, machines, comparisons, hasComparison, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const heroResult = machines.find((m) => m.machine.uid === heroMachine.uid) ?? machines[0];

  // Strongest sales figure: the opponent the hero saves the most against.
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.savingsAtMax ?? -Infinity) > (a.savingsAtMax ?? -Infinity) ? b : a))
    : null;
  const savings = best?.savingsAtMax;
  const breakevenHours = best?.breakevenHours;
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;
  const hasSavings = savings != null && savings > 0;

  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

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
        <div>
          <p className="print-cover__field-label">Prepared for</p>
          <p className="print-cover__field-value">{inputs.preparedFor || 'Valued Customer'}</p>
        </div>
        <div>
          <p className="print-cover__field-label">Prepared by</p>
          <p className="print-cover__field-value">ThinkQuip — Authorized SANY Distributor</p>
        </div>
        <div>
          <p className="print-cover__field-label">Date</p>
          <p className="print-cover__field-value">{today}</p>
        </div>
      </div>

      <div className="print-cover__stats">
        <div className="print-cover__stat">
          <p className="print-cover__stat-label">Recommended machine</p>
          <p className="print-cover__stat-value">{heroMachine.name}</p>
          <p className="print-cover__stat-sub">
            {heroMachine.type === 'electric' ? 'SANY electric wheel loader — charger included' : 'SANY diesel wheel loader'}
          </p>
        </div>

        {hasComparison ? (
          <>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">Savings start</p>
              <p className="print-cover__stat-value">
                {hasBreakeven ? formatHours(breakevenHours) : `>${formatHours(maxHours)}`}
              </p>
              <p className="print-cover__stat-sub">
                {hasBreakeven
                  ? `~${formatYearsFromHours(breakevenHours, hoursPerYear)} at your operating hours`
                  : 'beyond the 20,000 h window at these inputs'}
              </p>
            </div>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                Saving @ {formatHours(maxHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{hasSavings ? formatCurrency(savings) : '—'}</p>
              <p className="print-cover__stat-sub">vs {best.machine.displayName}</p>
            </div>
          </>
        ) : (
          <>
            <div className="print-cover__stat">
              <p className="print-cover__stat-label">
                Total cost @ {formatHours(maxHours)} · {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}
              </p>
              <p className="print-cover__stat-value">{formatCurrency(heroResult.tcoAtMax)}</p>
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
