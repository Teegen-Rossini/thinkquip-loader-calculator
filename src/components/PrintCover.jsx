import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import './PrintCover.css';

export default function PrintCover({ selection, inputs }) {
  const { heroMachine, machines, comparisons, hasComparison, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  // Strongest sales figure: the opponent the hero saves the most against.
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.savingsAtMax ?? -Infinity) > (a.savingsAtMax ?? -Infinity) ? b : a))
    : null;
  const savings = best?.savingsAtMax;
  const breakevenHours = best?.breakevenHours;
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;
  const hasSavings = savings != null && savings > 0;

  const heroResult = machines.find((m) => m.machine.uid === heroMachine.uid) ?? machines[0];
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
          <p className="print-cover__distributor">Authorized SANY Distributor</p>
          <p className="print-cover__field-label">Date: <strong>{today}</strong></p>
        </div>
        <div className="print-cover__image">
          <img src={heroMachine.photo} alt={heroMachine.displayName} />
        </div>
      </div>

      <div className="print-cover__stats">
        <div>
          <span className="eyebrow print-cover__stat-label">Recommended machine</span>
          <p className="print-cover__stat-value">{heroMachine.name}</p>
          <p className="print-cover__stat-sub">{heroMachine.type === 'electric' ? 'Electric' : 'Diesel'}</p>
        </div>

        {hasComparison ? (
          <>
            <div>
              <span className="eyebrow print-cover__stat-label">Savings starts</span>
              <p className="print-cover__stat-value print-cover__stat-value--accent">
                {hasBreakeven ? formatHours(breakevenHours) : `>${formatHours(maxHours)}`}
              </p>
              <p className="print-cover__stat-sub">{hasBreakeven ? `~${formatYearsFromHours(breakevenHours, hoursPerYear)} at these hours` : 'beyond 20,000 h'}</p>
            </div>
            <div>
              <span className="eyebrow print-cover__stat-label">Saving with the {heroMachine.name} @ {formatHours(maxHours)} ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})</span>
              <p className="print-cover__stat-value print-cover__stat-value--accent">
                {hasSavings ? formatCurrency(savings) : '—'}
              </p>
              <p className="print-cover__stat-sub">vs {best.machine.displayName}</p>
            </div>
          </>
        ) : (
          <div>
            <span className="eyebrow print-cover__stat-label">Total cost of ownership @ {formatHours(maxHours)} ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})</span>
            <p className="print-cover__stat-value print-cover__stat-value--accent">{formatCurrency(heroResult.tcoAtMax)}</p>
            <p className="print-cover__stat-sub">select a second machine to compare</p>
          </div>
        )}
      </div>
    </div>
  );
}
