import { formatCurrency, formatHours, formatYearsFromHours, variantName } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import MachineName from './MachineName';
import TimeWindowSlider from './TimeWindowSlider';
import './HeroStat.css';

/**
 * The Comparison page's top summary. Framing is NEUTRAL: whichever selected
 * machine has the lowest total cost of ownership (purchase price + running
 * costs) at the user-chosen time window is highlighted — electric OR diesel,
 * and the answer may flip as the window slider moves. Every figure here
 * recalculates live with the slider.
 */
export default function HeroStat({ selection, fleetSize, onUpdate }) {
  const {
    machines, hero, heroMachine, comparisons, hasComparison, battery,
    hoursPerYear, windowHours, electricSelected,
  } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;
  const windowLabel = formatHours(windowHours);
  const windowYears = formatYearsFromHours(windowHours, hoursPerYear);
  const setWindow = (comparisonWindowHours) => onUpdate({ comparisonWindowHours });

  const yrs = (h) => formatYearsFromHours(h, hoursPerYear);

  // ---- Single-selection: the machine's own total at the window, nothing else. ----
  if (!hasComparison) {
    const only = machines[0];
    const isElec = only.machine.type === 'electric';

    return (
      <div className="hero-stat">
        <div className="hero-stat__intro">
          <h3 className="hero-stat__title">
            <MachineName machine={only.machine} /> — total cost
          </h3>
          <p className="hero-stat__lede">
            Total cost of ownership for {fleetLabel} — purchase price plus escalated running costs — measured at the
            point on the slider. Select a second machine on the Inputs tab to compare.
          </p>
        </div>

        <TimeWindowSlider selection={selection} windowHours={windowHours} onChange={setWindow} />

        <div className="hero-stat__grid">
          <div className="hero-compare" style={{ '--accent': only.machine.accentColor }}>
            <div className="hero-compare__head">
              <MachineName machine={only.machine} as="h4" className="hero-compare__name" />
            </div>

            <div className="hero-compare__stats">
              <div className="hero-compare__stat">
                <span className="eyebrow">Total cost @ {windowLabel}</span>
                <span className="hero-compare__value mono">{formatCurrency(only.tcoAtWindow)}</span>
                <span className="hero-compare__sub">≈ {windowYears} at your operating hours</span>
              </div>
            </div>

            <p className="hero-compare__caption">
              {isElec && battery
                ? `Battery replacement is projected at ${formatHours(battery.atHours)} (~${yrs(battery.atHours)} at these hours) — beyond the ${formatHours(maxHours)} window and the first owner’s lifecycle.`
                : 'Includes continuous routine service at R29/h. No “vs” comparison is shown while a single machine is selected.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Comparison: highlight the cheapest machine at the selected window. ----
  const heroName = variantName(heroMachine);
  // Every opponent runs at the cheapest machine's exact cost per hour AND no
  // electric machine is selected → the two diesel brake variants alone. The
  // upfront price gap is the whole story: surface it ONCE here, up top.
  const dieselsOnlySamePrice = !electricSelected && comparisons.every((c) => c.sameRunningCosts);

  const crossoverCaption = (c) => {
    const otherName = variantName(c.machine);
    if (c.sameRunningCosts) {
      return `The ${otherName} runs at exactly the same cost per hour, so the ${formatCurrency(c.priceGapFleet)} purchase-price gap never closes or grows.`;
    }
    if (c.crossoverDirection === 'gains') {
      return `The ${heroName} is cheaper from ${formatHours(c.crossoverHours)} (~${yrs(c.crossoverHours)} at your hours) onward.`;
    }
    if (c.crossoverDirection === 'loses') {
      return `The ${heroName} is cheaper until ${formatHours(c.crossoverHours)} (~${yrs(c.crossoverHours)} at your hours) — beyond that the ${otherName} takes the lead.`;
    }
    return `The ${heroName} stays cheaper across the whole 0–${formatHours(maxHours)} range at these inputs.`;
  };

  return (
    <div className="hero-stat">
      <div className="hero-stat__intro">
        <h3 className="hero-stat__title">
          Cheapest at {windowLabel}: {heroName}
        </h3>
        <p className="hero-stat__lede">
          Total cost of ownership for {fleetLabel} — purchase price plus escalated running costs — measured at the
          point on the slider. Move it to the hours you expect to sell or replace at; every figure below (and the
          printed brochure) follows it.
        </p>
      </div>

      <TimeWindowSlider selection={selection} windowHours={windowHours} onChange={setWindow} />

      <div className="hero-stat__grid">
        <div className="hero-compare hero-compare--cheapest" style={{ '--accent': heroMachine.accentColor }}>
          <div className="hero-compare__head">
            <MachineName machine={heroMachine} as="h4" className="hero-compare__name" />
            <span className="hero-compare__tag">Cheapest</span>
          </div>
          <div className="hero-compare__stats">
            <div className="hero-compare__stat">
              <span className="eyebrow">Total cost @ {windowLabel}</span>
              <span className="hero-compare__value mono">{formatCurrency(hero.tcoAtWindow)}</span>
              <span className="hero-compare__sub">≈ {windowYears} at your operating hours</span>
            </div>
          </div>
          <p className="hero-compare__caption">
            Lowest total cost of ownership of the {machines.length} selected machines at this window — including
            purchase price, energy{electricSelected ? ' and service' : ' and the R29/h routine service'}.
          </p>
        </div>

        {dieselsOnlySamePrice ? (
          <div className="hero-compare" style={{ '--accent': comparisons[0].machine.accentColor }}>
            <div className="hero-compare__head">
              <span className="hero-compare__vs">vs</span>
              <MachineName machine={comparisons[0].machine} as="h4" className="hero-compare__name" />
            </div>
            <div className="hero-compare__stats">
              <div className="hero-compare__stat">
                <span className="eyebrow">Upfront price difference ({fleetLabel})</span>
                <span className="hero-compare__value hero-compare__value--save mono">
                  {formatCurrency(comparisons[0].priceGapFleet)}
                </span>
              </div>
            </div>
            <p className="hero-compare__caption">
              Same machine, same running costs — the brake option changes only the purchase price, so this upfront
              gap is the whole story and holds at every hour.
            </p>
          </div>
        ) : (
          comparisons.map((c) => (
            <div key={c.machine.uid} className="hero-compare" style={{ '--accent': c.machine.accentColor }}>
              <div className="hero-compare__head">
                <span className="hero-compare__vs">vs</span>
                <MachineName machine={c.machine} as="h4" className="hero-compare__name" />
              </div>

              <div className="hero-compare__stats">
                <div className="hero-compare__stat">
                  <span className="eyebrow">Costs more @ {windowLabel}</span>
                  <span className="hero-compare__value hero-compare__value--save mono">
                    {c.gapAtWindow > 0 ? `+${formatCurrency(c.gapAtWindow)}` : '—'}
                  </span>
                </div>

                <span className="hero-compare__divider" aria-hidden="true" />

                <div className="hero-compare__stat">
                  <span className="eyebrow">Crossover</span>
                  <span className="hero-compare__value">
                    {c.sameRunningCosts || c.crossoverHours == null
                      ? <span className="hero-compare__muted">None in range</span>
                      : <span className="mono">{c.crossoverDirection === 'loses' ? 'until ' : 'from '}{formatHours(c.crossoverHours)}</span>}
                  </span>
                </div>
              </div>

              <p className="hero-compare__caption">{crossoverCaption(c)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
