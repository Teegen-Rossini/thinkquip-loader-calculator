import { useState } from 'react';
import { formatCurrency } from '../lib/format';
import { cheapestAtYear } from '../lib/calculationEngine';
import ConfidenceBadge from './ConfidenceBadge';
import { ArrowRightIcon } from './icons';
import './ComparatorCard.css';

function bucketRange(machine) {
  if (!machine.bucketCapacityM3) return null;
  const [min, max] = machine.bucketCapacityM3;
  return `${min}–${max} m³`;
}

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%/yr`;
}

export default function ComparatorCard({ machine, result, breakeven, isElectric, allResults, horizonYears }) {
  const [expanded, setExpanded] = useState(false);
  const bucket = bucketRange(machine);

  const snapshotYear = Math.min(5, horizonYears ?? 5);
  const winner = allResults ? cheapestAtYear(allResults, snapshotYear) : null;
  const isBestValue = winner?.machine.id === machine.id;
  const unitPrice = result.capitalTotal / result.fleetSize;

  const isPendingQuote = machine.costConfidence === 'unconfirmed';
  const statusLabel = isPendingQuote ? 'Pending Quote' : (isElectric ? 'Electric' : 'Diesel');
  const statusStyle = isPendingQuote
    ? { background: 'var(--surface-alt)', color: 'var(--unconfirmed)', border: '1px solid var(--border)' }
    : { background: machine.accentColor, color: isElectric ? '#0A2E40' : '#1A1A1A' };

  const cardStyle = { '--card-accent': machine.accentColor };

  return (
    <div
      className={`comparator-card${isBestValue ? ' comparator-card--best' : ''}`}
      style={cardStyle}
    >
      {isBestValue && <span className="comparator-card__ribbon">Best Value · {snapshotYear}yr</span>}

      <div className="comparator-card__photo">
        <img src={machine.photo} alt={machine.displayName} loading="lazy" />
        <img src={machine.logo} alt={`${machine.brand} logo`} className="comparator-card__logo" />
      </div>

      <h4 className="comparator-card__name">{machine.displayName}</h4>

      <div className="comparator-card__cost">
        <span className="comparator-card__cost-value mono">{formatCurrency(unitPrice)}</span>
        <span
          className="status-badge tooltip-trigger"
          style={statusStyle}
          data-tooltip={isPendingQuote ? 'Machine price not yet quoted for this competitor — treated as R0 extra until a dealer quote comes in.' : undefined}
          tabIndex={isPendingQuote ? 0 : undefined}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="comparator-card__stats">
        <div>
          <dt>Annual energy</dt>
          <dd className="mono">{formatCurrency(result.annualEnergyCost)}</dd>
        </div>
        <div>
          <dt>Annual maintenance</dt>
          <dd className="mono">
            {result.maintenanceUnknown
              ? <ConfidenceBadge confidence="unconfirmed" tooltip="No maintenance figure yet for this competitor — pending a dealer quote." />
              : formatCurrency(result.annualMaintenanceCost)}
          </dd>
        </div>
        <div>
          <dt>Annual total</dt>
          <dd className="mono">{formatCurrency(result.annualTotalCost)}</dd>
        </div>
        {!isElectric ? (
          <div>
            <dt>Savings starts (vs electric)</dt>
            <dd className="mono">{breakeven != null ? `Yr ${breakeven.toFixed(1)}` : 'Beyond horizon'}</dd>
          </div>
        ) : (
          result.oneTimeYear0 > 0 && (
            <div>
              <dt>One-time cost</dt>
              <dd className="mono">{formatCurrency(result.oneTimeYear0)}</dd>
            </div>
          )
        )}
      </dl>

      <button
        type="button"
        className="comparator-card__toggle"
        style={{ color: machine.accentColor === '#FFC72C' ? 'var(--text)' : machine.accentColor }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        View details <ArrowRightIcon style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />
      </button>

      <div className={expanded ? 'comparator-card__details comparator-card__details--open' : 'comparator-card__details'}>
        <div className="comparator-card__details-inner">
          <div className="detail-row">
            <span className="detail-row__label">Operating weight</span>
            <span className="mono">{machine.operatingWeightKg.toLocaleString()} kg</span>
          </div>
          {bucket && (
            <div className="detail-row">
              <span className="detail-row__label">Bucket capacity</span>
              <span className="mono">{bucket}</span>
            </div>
          )}
          {machine.fuelTankL && (
            <div className="detail-row">
              <span className="detail-row__label">Fuel tank</span>
              <span className="mono">{machine.fuelTankL} L</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-row__label">Consumption ({machine.consumption.unit})</span>
            <span className="mono">
              Light {machine.consumption.light} &middot; Heavy {machine.consumption.heavy}{' '}
              <ConfidenceBadge confidence={machine.consumption.confidence} tooltip={machine.consumption.confidence === 'estimate' ? machine.consumption.note : undefined} />
            </span>
          </div>
          <p className="detail-note">{machine.consumption.note}</p>

          <div className="detail-row">
            <span className="detail-row__label">Maintenance basis</span>
            <span className="mono">
              {machine.maintenance.at2000 != null
                ? `${formatCurrency(machine.maintenance.at2000)}/yr @2,000h — ${formatCurrency(machine.maintenance.at3000)}/yr @3,000h, scaled linearly`
                : <ConfidenceBadge confidence="unconfirmed" tooltip="No maintenance figure yet for this competitor — pending a dealer quote." />}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-row__label">Warranty</span>
            <span className="mono">
              {machine.warranty?.machine
                ? <>{machine.warranty.machine}{machine.warranty.battery ? `; ${machine.warranty.battery}` : ''}</>
                : <ConfidenceBadge confidence="unconfirmed" tooltip="Warranty terms not yet quoted for this competitor — pending a dealer quote." />}
            </span>
          </div>

          {isElectric && machine.battery && (
            <>
              <div className="detail-row">
                <span className="detail-row__label">Battery</span>
                <span className="mono">{machine.battery.capacityKWh} kWh &middot; {machine.battery.chargeCycles}+ cycles</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">Battery replacement</span>
                <span className="mono">
                  {formatCurrency(result.eventBaseCost)} base, {formatRate(result.eventRate)}{' '}
                  <ConfidenceBadge confidence="confirmed" />
                </span>
              </div>
            </>
          )}

          {!isElectric && (
            <div className="detail-row">
              <span className="detail-row__label">Engine overhaul</span>
              <span className="mono">
                {formatCurrency(result.eventBaseCost)} base, {formatRate(result.eventRate)}{' '}
                <ConfidenceBadge confidence="estimate" tooltip="Industry-backed estimate (midpoint of published 12,000-15,000h interval and $15,000-$40,000 cost range) — reasoned from industry data, not a manufacturer quote." />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
