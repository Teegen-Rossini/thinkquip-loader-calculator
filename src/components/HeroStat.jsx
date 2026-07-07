import { cumulativeCostAtYear } from '../lib/calculationEngine';
import { formatCurrency } from '../lib/format';
import './HeroStat.css';

function bestSavingsAtYear(electricSeries, comparators, year) {
  let best = null;
  comparators.forEach((c) => {
    const dieselCost = cumulativeCostAtYear(c.series, year);
    const electricCost = cumulativeCostAtYear(electricSeries, year);
    if (dieselCost == null || electricCost == null) return;
    const savings = dieselCost - electricCost;
    if (!best || savings > best.savings) best = { savings, machine: c.machine };
  });
  return best;
}

function earliestBreakeven(comparators) {
  let best = null;
  comparators.forEach((c) => {
    if (c.breakeven == null) return;
    if (!best || c.breakeven < best.breakeven) best = c;
  });
  return best;
}

export default function HeroStat({ electricResult, comparators, horizonYears, fleetSize }) {
  const snapshotYear = Math.min(5, horizonYears);
  const best = bestSavingsAtYear(electricResult.series, comparators, snapshotYear);
  const earliest = earliestBreakeven(comparators);
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;
  const hasSavings = best && best.savings > 0;

  return (
    <div className="hero-stat">
      <div className="hero-stat__row">
        <div className="hero-stat__tile">
          <span className="eyebrow">Payback period</span>
          <span className="hero-stat__value">
            {earliest ? <>Yr <span className="mono">{earliest.breakeven.toFixed(1)}</span></> : `> ${horizonYears} yr`}
          </span>
          <span className="hero-stat__caption">
            {earliest ? `vs ${earliest.machine.displayName}` : 'No breakeven within the horizon shown at these inputs'}
          </span>
        </div>

        <span className="hero-stat__rule" aria-hidden="true" />

        <div className="hero-stat__tile">
          <span className="eyebrow">{snapshotYear}-year fleet savings ({fleetLabel})</span>
          <span className="hero-stat__value hero-stat__value--emphasis">
            {hasSavings ? <span className="mono">{formatCurrency(best.savings)}</span> : '—'}
          </span>
          <span className="hero-stat__caption">
            {hasSavings ? `vs ${best.machine.displayName}, based on the operating inputs entered` : 'Diesel stays cheaper at this snapshot year — try adjusting utilization or duty mix'}
          </span>
        </div>
      </div>

      <p className="hero-stat__disclaimer">
        Planning estimate only. Final pricing, maintenance, finance and availability must be confirmed before purchase.
      </p>
    </div>
  );
}
