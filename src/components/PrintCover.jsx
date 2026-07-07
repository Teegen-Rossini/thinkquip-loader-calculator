import { cheapestAtYear } from '../lib/calculationEngine';
import { formatCurrency } from '../lib/format';
import './PrintCover.css';

function earliestBreakeven(comparators) {
  let best = null;
  comparators.forEach((c) => {
    if (c.breakeven == null) return;
    if (!best || c.breakeven < best.breakeven) best = c;
  });
  return best;
}

export default function PrintCover({ inputs, electricMachine, electricResult, comparators, horizonYears }) {
  const allResults = [{ machine: electricMachine, ...electricResult }, ...comparators];
  const snapshotYear = Math.min(5, horizonYears);
  const best = cheapestAtYear(allResults, snapshotYear);
  const payback = earliestBreakeven(comparators);

  const electricAtSnapshot = cheapestAtYear([{ machine: electricMachine, ...electricResult }], snapshotYear);
  const referenceComparator = comparators[0];
  const savings = referenceComparator
    ? cheapestAtYear([referenceComparator], snapshotYear)?.cost - (electricAtSnapshot?.cost ?? 0)
    : null;

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
          <span className="eyebrow print-cover__stat-label">Best-value machine</span>
          <p className="print-cover__stat-value">{best?.machine.name ?? electricMachine.name}</p>
          <p className="print-cover__stat-sub">{best?.machine.type === 'electric' ? 'Electric' : 'Diesel'}</p>
        </div>
        <div>
          <span className="eyebrow print-cover__stat-label">Estimated payback</span>
          <p className="print-cover__stat-value print-cover__stat-value--accent">
            {payback ? `Yr ${payback.breakeven.toFixed(1)}` : `>${horizonYears}yr`}
          </p>
          <p className="print-cover__stat-sub">{payback ? `vs ${payback.machine.displayName}` : 'beyond horizon'}</p>
        </div>
        <div>
          <span className="eyebrow print-cover__stat-label">{snapshotYear}-year fleet savings ({inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''})</span>
          <p className="print-cover__stat-value print-cover__stat-value--accent">
            {savings != null && savings > 0 ? formatCurrency(savings) : '—'}
          </p>
          <p className="print-cover__stat-sub">{referenceComparator ? `vs ${referenceComparator.machine.displayName}` : ''}</p>
        </div>
      </div>
    </div>
  );
}
