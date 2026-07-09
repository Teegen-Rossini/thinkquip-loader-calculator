import { useState } from 'react';
import { formatCurrency } from '../lib/format';
import { applyVat } from '../lib/calculationEngine';
import MachineName from './MachineName';
import { ArrowRightIcon } from './icons';
import './ComparatorCard.css';

export default function ComparatorCard({ result, selection, inputs }) {
  const [expanded, setExpanded] = useState(false);

  const machine = result.machine;
  const isElectric = machine.type === 'electric';
  const { hasComparison } = selection;
  const per = result.perHour;
  const unitPrice = result.purchaseFleet / result.fleetSize;

  const isBestValue = hasComparison && machine.uid === selection.bestValueUid;

  // Exactly three figures, per 1,000 h: energy, maintenance, and their tally.
  const energyPer1000 = applyVat((isElectric ? per.elecEnergyPerH : per.dieselFuelPerH) * 1000, inputs);
  const maintPer1000 = applyVat((isElectric ? per.elecMaintPerH : per.dieselServicePerH) * 1000, inputs);
  const runningPer1000 = applyVat((isElectric ? per.elecPerH : per.dieselPerH) * 1000, inputs);
  const consumption = isElectric ? `${Math.round(per.cElec)} kWh/h` : `${Math.round(per.cDiesel)} L/h`;

  const statusLabel = `${isElectric ? 'Electric' : 'Diesel'}${machine.variant ? ` · ${machine.variant}` : ''}`;
  const statusStyle = { background: machine.accentColor, color: isElectric ? '#0A2E40' : '#1A1A1A' };
  const cardStyle = { '--card-accent': machine.accentColor };

  return (
    <div className={`comparator-card${isBestValue ? ' comparator-card--best' : ''}`} style={cardStyle}>
      {isBestValue && <span className="comparator-card__ribbon">Lowest cost at your window</span>}

      <div className="comparator-card__photo">
        <img src={machine.photo} alt={machine.displayName} loading="lazy" />
        <img src={machine.logo} alt={`${machine.brand} logo`} className="comparator-card__logo" />
      </div>

      <MachineName machine={machine} as="h4" className="comparator-card__name" />

      <div className="comparator-card__cost">
        <span className="comparator-card__cost-value mono">{formatCurrency(unitPrice)}</span>
        <span className="status-badge" style={statusStyle}>{statusLabel}</span>
      </div>

      <dl className="comparator-card__tally">
        <div className="comparator-card__tally-row">
          <dt>Cost of energy / 1,000 h <span className="comparator-card__tally-hint">({isElectric ? 'Electricity' : 'Diesel'})</span></dt>
          <dd className="mono">{formatCurrency(energyPer1000)}</dd>
        </div>
        <div className="comparator-card__tally-row">
          <dt>Mechanical maintenance / 1,000 h <span className="comparator-card__tally-hint">({isElectric ? 'None needed' : 'Mechanical service line'})</span></dt>
          <dd className="mono">{isElectric ? 'R0' : formatCurrency(maintPer1000)}</dd>
        </div>
        <div className="comparator-card__tally-row comparator-card__tally-row--total">
          <dt>Running cost / 1,000 h</dt>
          <dd className="mono">= {formatCurrency(runningPer1000)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className="comparator-card__toggle"
        style={{ color: machine.accentColor === '#F2A93E' ? 'var(--text)' : machine.accentColor }}
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
          <div className="detail-row">
            <span className="detail-row__label">Rated payload</span>
            <span className="mono">{machine.ratedPayloadKg.toLocaleString()} kg</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Bucket capacity</span>
            <span className="mono">{machine.bucketCapacityM3} m³</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Tyres</span>
            <span className="mono">{machine.tyres}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Consumption (at current duty)</span>
            <span className="mono">{consumption}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row__label">Warranty</span>
            <span className="mono">{machine.warranty}</span>
          </div>

          {isElectric ? (
            <>
              <div className="detail-row">
                <span className="detail-row__label">Battery / charger</span>
                <span className="mono">{machine.battery.capacityKWh} kWh · {machine.battery.chargerRatingKW} kW charger (incl.)</span>
              </div>
              <p className="detail-note">
                The electric machine carries no mechanical-maintenance line — its running cost is electricity only.
              </p>
            </>
          ) : (
            <>
              <div className="detail-row">
                <span className="detail-row__label">Engine</span>
                <span className="mono">{machine.engine}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row__label">Routine service</span>
                <span className="mono">R29/h (continuous)</span>
              </div>
              <p className="detail-note">
                Routine engine service runs continuously at R29/h (R29,000 per 1,000 h) — there is no separate overhaul event.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
