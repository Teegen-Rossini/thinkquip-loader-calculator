import { savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import './HeroStat.css';

export default function HeroStat({ comparison, fleetSize }) {
  const { electric, diesel, breakevenHours, hoursPerYear } = comparison;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const savings = savingsAtHours(electric.series, diesel.series, maxHours);
  const hasSavings = savings != null && savings > 0;
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;

  return (
    <div className="hero-stat">
      <div className="hero-stat__row">
        <div className="hero-stat__tile">
          <span className="eyebrow">Payback point</span>
          <span className="hero-stat__value">
            {hasBreakeven ? <span className="mono">{formatHours(breakevenHours)}</span> : `> ${formatHours(maxHours)}`}
          </span>
          <span className="hero-stat__caption">
            {hasBreakeven
              ? `~${formatYearsFromHours(breakevenHours, hoursPerYear)} at these hours — electric TCO overtakes diesel`
              : 'No breakeven within the 20,000 h window at these inputs'}
          </span>
        </div>

        <span className="hero-stat__rule" aria-hidden="true" />

        <div className="hero-stat__tile">
          <span className="eyebrow">Fleet savings at {formatHours(maxHours)} ({fleetLabel})</span>
          <span className="hero-stat__value hero-stat__value--emphasis">
            {hasSavings ? <span className="mono">{formatCurrency(savings)}</span> : '—'}
          </span>
          <span className="hero-stat__caption">
            {hasSavings
              ? 'Electric vs the selected diesel, based on the operating inputs entered'
              : 'Diesel stays cheaper at 20,000 h — try adjusting utilization or duty'}
          </span>
        </div>
      </div>

      <p className="hero-stat__disclaimer">
        Planning estimate only. Final pricing, maintenance, finance and availability must be confirmed before purchase.
      </p>
    </div>
  );
}
