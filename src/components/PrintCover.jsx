import { savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS, THINKQUIP_LOGO } from '../data/machinesConfig';
import { PrintPage } from './PrintKit';

/** Brochure section 1 — cover: ThinkQuip + SANY logos, customer/date fields
 *  from the inputs, hero machine cutout and the three headline outcomes. */
export default function PrintCover({ comparison, inputs, pageNumber, pageCount }) {
  const { electric, diesel, electricMachine, dieselMachine, breakevenHours, hoursPerYear } = comparison;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const savings = savingsAtHours(electric.series, diesel.series, maxHours);
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount} className="print-cover">
      <div className="print-cover__brands">
        <img src={THINKQUIP_LOGO} alt="ThinkQuip" className="print-cover__brands-thinkquip" />
        <img src={electricMachine.logo} alt="SANY" className="print-cover__brands-sany" />
      </div>

      <div className="print-cover__band">
        <p className="print-cover__eyebrow">Cost comparison — built on your operating numbers</p>
        <h1 className="print-cover__headline">
          Electric Loader<br />Fleet Savings Proposal
        </h1>
      </div>

      <div className="print-cover__hero">
        <img src={electricMachine.photo} alt={electricMachine.displayName} />
      </div>

      <div className="print-cover__fields">
        <div>
          <p className="print-cover__field-label">Prepared for</p>
          <p className="print-cover__field-value">{inputs.preparedFor || 'Valued Customer'}</p>
        </div>
        <div>
          <p className="print-cover__field-label">Prepared by</p>
          <p className="print-cover__field-value">ThinkQuip</p>
        </div>
        <div>
          <p className="print-cover__field-label">Date</p>
          <p className="print-cover__field-value">{today}</p>
        </div>
      </div>

      <div className="print-cover__stats">
        <div className="print-cover__stat">
          <p className="print-cover__stat-label">Recommended machine</p>
          <p className="print-cover__stat-value">{electricMachine.name}</p>
          <p className="print-cover__stat-sub">SANY electric wheel loader — charger included</p>
        </div>
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
          <p className="print-cover__stat-value">
            {savings != null && savings > 0 ? formatCurrency(savings) : '—'}
          </p>
          <p className="print-cover__stat-sub">vs {dieselMachine.displayName}</p>
        </div>
      </div>
    </PrintPage>
  );
}
