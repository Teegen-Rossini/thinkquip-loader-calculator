import { savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import './PrintCover.css';

export default function PrintCover({ comparison, inputs }) {
  const { electric, diesel, electricMachine, breakevenHours, hoursPerYear } = comparison;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const savings = savingsAtHours(electric.series, diesel.series, maxHours);
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;

  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="print-only print-cover">
      <span className="print-cover__page-badge">1</span>
      <div className="print-cover__body">
        <div className="print-cover__copy">
          <h1 className="print-cover__headline">
            <span className="print-cover__headline-accent">Electric Loader</span>
            Fleet Savings Proposal
          </h1>
          <hr className="print-cover__rule" />
          <p className="print-cover__field-label">Prepared for:</p>
          <p className="print-cover__field-value">{inputs.preparedFor || 'Valued Customer'}</p>
          <p className="print-cover__field-label">Prepared by: <span className="print-cover__brand">ThinkQuip</span></p>
          <p className="print-cover__field-label">Date: <strong>{today}</strong></p>
        </div>
        <div className="print-cover__image">
          <img src={electricMachine.photo} alt={electricMachine.displayName} />
        </div>
      </div>

      <div className="print-cover__stats">
        <div>
          <span className="eyebrow print-cover__stat-label">Recommended machine</span>
          <p className="print-cover__stat-value">{electricMachine.name}</p>
          <p className="print-cover__stat-sub">Electric</p>
        </div>
        <div>
          <span className="eyebrow print-cover__stat-label">Estimated payback</span>
          <p className="print-cover__stat-value print-cover__stat-value--accent">
            {hasBreakeven ? formatHours(breakevenHours) : `>${formatHours(maxHours)}`}
          </p>
          <p className="print-cover__stat-sub">{hasBreakeven ? `~${formatYearsFromHours(breakevenHours, hoursPerYear)} at these hours` : 'beyond 20,000 h'}</p>
        </div>
        <div>
          <span className="eyebrow print-cover__stat-label">Fleet savings @ {formatHours(maxHours)} ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})</span>
          <p className="print-cover__stat-value print-cover__stat-value--accent">
            {savings != null && savings > 0 ? formatCurrency(savings) : '—'}
          </p>
          <p className="print-cover__stat-sub">vs SANY SYL956H5 diesel</p>
        </div>
      </div>
    </div>
  );
}
