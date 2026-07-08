import { useState } from 'react';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { applyVat } from '../lib/calculationEngine';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import MachineName from './MachineName';
import { ArrowRightIcon } from './icons';
import './ComparatorCard.css';

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%/yr`;
}

export default function ComparatorCard({ result, selection, inputs }) {
  const [expanded, setExpanded] = useState(false);

  const machine = result.machine;
  const isElectric = machine.type === 'electric';
  const { battery, hoursPerYear, hasComparison, heroMachine } = selection;
  const per = result.perHour;
  const unitPrice = result.purchaseFleet / result.fleetSize;
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  // Comparison metrics for this machine vs the hero (only present for opponents
  // when 2+ machines are selected). The hero card carries no "vs" row.
  const cmp = selection.comparisons.find((c) => c.machine.uid === machine.uid);
  const isBestValue = hasComparison && machine.uid === selection.bestValueUid;

  const energyPerH = applyVat(isElectric ? per.elecEnergyPerH : per.dieselFuelPerH, inputs);
  const servicePerH = applyVat(isElectric ? per.elecMaintPerH : per.dieselServicePerH, inputs);
  const totalPerH = applyVat(isElectric ? per.elecPerH : per.dieselPerH, inputs);
  const consumption = isElectric ? `${per.cElec} kWh/h` : `${per.cDiesel} L/h`;

  const statusLabel = isElectric ? 'Electric' : `Diesel · ${machine.brake === 'wet' ? 'wet' : 'dry'} brake`;
  const statusStyle = { background: machine.accentColor, color: isElectric ? '#0A2E40' : '#1A1A1A' };
  const cardStyle = { '--card-accent': machine.accentColor };

  return (
    <div className={`comparator-card${isBestValue ? ' comparator-card--best' : ''}`} style={cardStyle}>
      {isBestValue && <span className="comparator-card__ribbon">Lowest lifetime cost</span>}

      <div className="comparator-card__photo">
        <img src={machine.photo} alt={machine.displayName} loading="lazy" />
        <img src={machine.logo} alt={`${machine.brand} logo`} className="comparator-card__logo" />
      </div>

      <MachineName machine={machine} as="h4" className="comparator-card__name" />

      <div className="comparator-card__cost">
        <span className="comparator-card__cost-value mono">{formatCurrency(unitPrice)}</span>
        <span className="status-badge" style={statusStyle}>{statusLabel}</span>
      </div>

      <dl className="comparator-card__stats">
        <div>
          <dt>{isElectric ? 'Energy / h (yr 0)' : 'Fuel / h (yr 0)'}</dt>
          <dd className="mono">{formatCurrency(energyPerH)}</dd>
        </div>
        <div>
          <dt>{isElectric ? 'Maintenance / h' : 'Service / h'}</dt>
          <dd className="mono">{isElectric ? 'R0' : formatCurrency(servicePerH)}</dd>
        </div>
        <div>
          <dt>Total / h (yr 0)</dt>
          <dd className="mono">{formatCurrency(totalPerH)}</dd>
        </div>
        <div>
          <dt>Cost at {formatHours(maxHours)}</dt>
          <dd className="mono">{formatCurrency(result.tcoAtMax)}</dd>
        </div>
        {cmp && (
          <div>
            <dt>Savings start (vs {heroMachine.name})</dt>
            <dd className="mono">
              {cmp.breakevenHours != null && cmp.breakevenHours <= maxHours
                ? `${formatHours(cmp.breakevenHours)} (~${formatYearsFromHours(cmp.breakevenHours, hoursPerYear)})`
                : `Beyond ${formatHours(maxHours)}`}
            </dd>
          </div>
        )}
        {isElectric && (
          <div>
            <dt>Mechanical service line</dt>
            <dd className="mono">None (R0/h)</dd>
          </div>
        )}
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
              {battery && (
                <div className="detail-row">
                  <span className="detail-row__label">Battery replacement</span>
                  <span className="mono">
                    {formatCurrency(battery.baseCost)} base @ {formatHours(battery.atHours)}, {formatRate(battery.rate)}
                  </span>
                </div>
              )}
              {battery && (
                <p className="detail-note">
                  Battery reaches replacement at {formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)}) —
                  beyond the 20,000 h chart and the first owner’s lifecycle. It carries no mechanical-maintenance line before then.
                </p>
              )}
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
