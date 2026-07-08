import { savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import './HeroStat.css';

export default function HeroStat({ comparison, fleetSize }) {
  const { electric, diesel, electricMachine, dieselMachine, breakevenHours, hoursPerYear } = comparison;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const savings = savingsAtHours(electric.series, diesel.series, maxHours);
  const hasSavings = savings != null && savings > 0;
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;

  return (
    <div className="hero-stat">
      <div className="hero-stat__intro">
        <h3 className="hero-stat__title">
          Electric {electricMachine.name} vs the {dieselMachine.name} diesel
        </h3>
        <p className="hero-stat__lede">
          Every figure below is for {fleetLabel} over {formatHours(maxHours)} of operation, using the operating
          inputs you entered. The card compares the electric {electricMachine.name} against the diesel variant you
          selected.
        </p>
        <p className="hero-stat__legend">
          <span>
            <strong>Savings starts</strong> — the operating-hours point where the electric machine&rsquo;s higher
            purchase price is fully repaid by its lower running costs. From there on, you&rsquo;re saving money.
          </span>
          <span>
            <strong>Saving by going electric</strong> — total money you keep by choosing the electric{' '}
            {electricMachine.name} instead of the diesel, measured at {formatHours(maxHours)}.
          </span>
        </p>
      </div>

      <div className="hero-stat__grid">
        <div className="hero-compare" style={{ '--accent': dieselMachine.accentColor }}>
          <div className="hero-compare__head">
            <span className="hero-compare__vs">vs</span>
            <h4 className="hero-compare__name">{dieselMachine.displayName}</h4>
          </div>

          <div className="hero-compare__stats">
            <div className="hero-compare__stat">
              <span className="eyebrow">Savings starts</span>
              <span className="hero-compare__value">
                {hasBreakeven
                  ? <span className="mono">{formatHours(breakevenHours)}</span>
                  : <span className="hero-compare__muted">&gt; {formatHours(maxHours)}</span>}
              </span>
            </div>

            <span className="hero-compare__divider" aria-hidden="true" />

            <div className="hero-compare__stat">
              <span className="eyebrow">Saving by going electric @ {formatHours(maxHours)}</span>
              <span className="hero-compare__value hero-compare__value--save">
                {hasSavings
                  ? <span className="mono">{formatCurrency(savings)}</span>
                  : <span className="hero-compare__muted">—</span>}
              </span>
            </div>
          </div>

          <p className="hero-compare__caption">
            {hasBreakeven
              ? `Electric is cheaper from ${formatHours(breakevenHours)} (~${formatYearsFromHours(breakevenHours, hoursPerYear)} at these hours) onward.`
              : `Diesel stays cheaper within the ${formatHours(maxHours)} window at these inputs — try adjusting utilization or duty.`}
          </p>
        </div>
      </div>

      <p className="hero-stat__disclaimer">
        Planning estimate only. Final pricing, maintenance, finance and availability must be confirmed before purchase.
      </p>
    </div>
  );
}
