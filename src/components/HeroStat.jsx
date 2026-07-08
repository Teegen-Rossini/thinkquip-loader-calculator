import { applyVat } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import MachineName from './MachineName';
import './HeroStat.css';

export default function HeroStat({ selection, fleetSize, inputs }) {
  const { machines, heroMachine, comparisons, hasComparison, battery, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;

  // ---- Single-selection: standalone results only, no comparison framing. ----
  if (!hasComparison) {
    const only = machines[0];
    const isElec = only.machine.type === 'electric';
    const perH = applyVat(isElec ? only.perHour.elecPerH : only.perHour.dieselPerH, inputs);

    return (
      <div className="hero-stat">
        <div className="hero-stat__intro">
          <h3 className="hero-stat__title">
            <MachineName machine={only.machine} /> — standalone cost
          </h3>
          <p className="hero-stat__lede">
            Every figure below is for {fleetLabel} over {formatHours(maxHours)} of operation, using the operating inputs you
            entered. Select a second machine on the Inputs tab to compare and reveal the savings and break-even point.
          </p>
        </div>

        <div className="hero-stat__grid">
          <div className="hero-compare" style={{ '--accent': only.machine.accentColor }}>
            <div className="hero-compare__head">
              <MachineName machine={only.machine} as="h4" className="hero-compare__name" />
            </div>

            <div className="hero-compare__stats">
              <div className="hero-compare__stat">
                <span className="eyebrow">Total cost of ownership @ {formatHours(maxHours)}</span>
                <span className="hero-compare__value mono">{formatCurrency(only.tcoAtMax)}</span>
              </div>

              <span className="hero-compare__divider" aria-hidden="true" />

              <div className="hero-compare__stat">
                <span className="eyebrow">Running cost / h (year 0)</span>
                <span className="hero-compare__value mono">{formatCurrency(perH)}</span>
              </div>
            </div>

            <p className="hero-compare__caption">
              {isElec && battery
                ? `Battery replacement is projected at ${formatHours(battery.atHours)} (~${formatYearsFromHours(battery.atHours, hoursPerYear)} at these hours) — beyond the ${formatHours(maxHours)} window and the first owner’s lifecycle.`
                : 'Includes continuous routine service at R29/h. No “vs” comparison is shown while a single machine is selected.'}
            </p>
          </div>
        </div>

      </div>
    );
  }

  // ---- Comparison: hero vs each other selected machine. ----
  const opponentNames = comparisons.map((c) => c.machine.name).join(', ');

  return (
    <div className="hero-stat">
      <div className="hero-stat__intro">
        <h3 className="hero-stat__title">
          {heroMachine.name} vs {opponentNames}
        </h3>
        <p className="hero-stat__lede">
          Every figure below is for {fleetLabel} over {formatHours(maxHours)} of operation, using the operating inputs you
          entered. Each card compares the {heroMachine.name} against one of the other machines you selected.
        </p>
        <p className="hero-stat__legend">
          <span>
            <strong>Savings starts</strong> — the operating-hours point where the {heroMachine.name}&rsquo;s higher purchase
            price is fully repaid by its lower running costs. From there on, you&rsquo;re saving money.
          </span>
          <span>
            <strong>Saving by choosing the {heroMachine.name}</strong> — total money you keep versus that machine, measured
            at {formatHours(maxHours)}.
          </span>
        </p>
      </div>

      <div className="hero-stat__grid">
        {comparisons.map((c) => {
          const hasBreakeven = c.breakevenHours != null && c.breakevenHours <= maxHours;
          const hasSavings = c.savingsAtMax != null && c.savingsAtMax > 0;
          return (
            <div key={c.machine.uid} className="hero-compare" style={{ '--accent': c.machine.accentColor }}>
              <div className="hero-compare__head">
                <span className="hero-compare__vs">vs</span>
                <MachineName machine={c.machine} as="h4" className="hero-compare__name" />
              </div>

              <div className="hero-compare__stats">
                <div className="hero-compare__stat">
                  <span className="eyebrow">Savings starts</span>
                  <span className="hero-compare__value">
                    {hasBreakeven
                      ? <span className="mono">{formatHours(c.breakevenHours)}</span>
                      : <span className="hero-compare__muted">&gt; {formatHours(maxHours)}</span>}
                  </span>
                </div>

                <span className="hero-compare__divider" aria-hidden="true" />

                <div className="hero-compare__stat">
                  <span className="eyebrow">Saving @ {formatHours(maxHours)}</span>
                  <span className="hero-compare__value hero-compare__value--save">
                    {hasSavings
                      ? <span className="mono">{formatCurrency(c.savingsAtMax)}</span>
                      : <span className="hero-compare__muted">—</span>}
                  </span>
                </div>
              </div>

              <p className="hero-compare__caption">
                {hasBreakeven
                  ? `${heroMachine.name} is cheaper from ${formatHours(c.breakevenHours)} (~${formatYearsFromHours(c.breakevenHours, hoursPerYear)} at these hours) onward.`
                  : `${c.machine.name} stays cheaper within the ${formatHours(maxHours)} window at these inputs — try adjusting utilization or duty.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
