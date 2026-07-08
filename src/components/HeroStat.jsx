import { cumulativeCostAtYear } from '../lib/calculationEngine';
import { formatCurrency } from '../lib/format';
import './HeroStat.css';

function savingsAtYear(electricSeries, dieselSeries, year) {
  const dieselCost = cumulativeCostAtYear(dieselSeries, year);
  const electricCost = cumulativeCostAtYear(electricSeries, year);
  if (dieselCost == null || electricCost == null) return null;
  return dieselCost - electricCost;
}

export default function HeroStat({ electricMachine, electricResult, comparators, horizonYears, fleetSize }) {
  const snapshotYear = Math.min(5, horizonYears);
  const fleetLabel = `${fleetSize} machine${fleetSize > 1 ? 's' : ''}`;
  const multiple = comparators.length > 1;

  const rows = comparators.map((c) => {
    const savings = savingsAtYear(electricResult.series, c.series, snapshotYear);
    return {
      machine: c.machine,
      breakeven: c.breakeven,
      savings,
      hasSavings: savings != null && savings > 0,
    };
  });

  // Biggest saving gets a subtle "best case" marker when more than one diesel
  // is being compared — so the strongest number is still easy to spot.
  const bestSaving = rows.reduce(
    (max, r) => (r.hasSavings && r.savings > max ? r.savings : max),
    0
  );

  return (
    <div className="hero-stat">
      <div className="hero-stat__intro">
        <h3 className="hero-stat__title">
          Electric {electricMachine.name} vs your diesel option{multiple ? 's' : ''}
        </h3>
        <p className="hero-stat__lede">
          Every figure below is for {fleetLabel} over {snapshotYear} year{snapshotYear > 1 ? 's' : ''}, using the
          operating inputs you entered. Each card compares the electric {electricMachine.name} against{' '}
          {multiple ? 'one diesel version' : 'the diesel machine you selected'}.
        </p>
        <p className="hero-stat__legend">
          <span>
            <strong>Savings starts</strong> — the year the electric machine&rsquo;s higher purchase price is fully
            repaid by its lower running costs. From that year on, you&rsquo;re saving money.
          </span>
          <span>
            <strong>{snapshotYear}-yr saving by going electric</strong> — total money you keep by choosing the
            electric {electricMachine.name} instead of that diesel, measured at year {snapshotYear}.
          </span>
        </p>
      </div>

      <div className="hero-stat__grid">
        {rows.map((row) => (
          <div
            key={row.machine.id}
            className="hero-compare"
            style={{ '--accent': row.machine.accentColor }}
          >
            <div className="hero-compare__head">
              <span className="hero-compare__vs">vs</span>
              <h4 className="hero-compare__name">{row.machine.displayName}</h4>
            </div>

            <div className="hero-compare__stats">
              <div className="hero-compare__stat">
                <span className="eyebrow">Savings starts</span>
                <span className="hero-compare__value">
                  {row.breakeven != null
                    ? <>Yr <span className="mono">{row.breakeven.toFixed(1)}</span></>
                    : <span className="hero-compare__muted">&gt; {horizonYears} yr</span>}
                </span>
              </div>

              <span className="hero-compare__divider" aria-hidden="true" />

              <div className="hero-compare__stat">
                <span className="eyebrow">
                  {snapshotYear}-yr saving by going electric
                  {multiple && row.hasSavings && row.savings === bestSaving && (
                    <span className="hero-compare__tag">Biggest</span>
                  )}
                </span>
                <span className="hero-compare__value hero-compare__value--save">
                  {row.hasSavings
                    ? <span className="mono">{formatCurrency(row.savings)}</span>
                    : <span className="hero-compare__muted">—</span>}
                </span>
              </div>
            </div>

            <p className="hero-compare__caption">
              {row.breakeven != null
                ? `Electric is cheaper from year ${row.breakeven.toFixed(1)} onward.`
                : `Diesel stays cheaper within the ${horizonYears}-year horizon at these inputs — try adjusting utilization or duty mix.`}
            </p>
          </div>
        ))}
      </div>

      <p className="hero-stat__disclaimer">
        Planning estimate only. Final pricing, maintenance, finance and availability must be confirmed before purchase.
      </p>
    </div>
  );
}
