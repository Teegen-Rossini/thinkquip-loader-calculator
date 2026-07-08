import { formatCurrency } from '../lib/format';
import { DIESEL_OVERHAUL, ESCALATION } from '../data/machinesConfig';
import ConfidenceBadge from './ConfidenceBadge';
import './SummaryTable.css';

function bucketRange(machine) {
  if (!machine.bucketCapacityM3) return '—';
  const [min, max] = machine.bucketCapacityM3;
  return `${min}–${max} m³`;
}

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%/yr`;
}

function RequestQuoteButton({ machine }) {
  const subject = encodeURIComponent(`Quote request — ${machine.displayName}`);
  const body = encodeURIComponent(
    `Hi,\n\nPlease provide a confirmed dealer quote for the ${machine.displayName}, including machine price, maintenance schedule and warranty terms.\n\nThanks.`
  );
  return (
    <a className="request-quote-btn" href={`mailto:quotes@thinkquip.co.za?subject=${subject}&body=${body}`}>
      Request Confirmed Quote
    </a>
  );
}

export default function SummaryTable({ electricMachine, electricResult, comparators, horizonYears, fleetSize, vatInclusive }) {
  const rows = [
    { machine: electricMachine, result: electricResult, breakeven: null },
    ...comparators.map((c) => ({ machine: c.machine, result: c, breakeven: c.breakeven })),
  ];
  const priceLabel = vatInclusive ? 'Unit price (incl. VAT)' : 'Unit price (excl. VAT)';

  return (
    <div className="summary-tables panel-surface" id="spec-sheet-assumptions">
      <div className="summary-table-block">
        <h3>Capital &amp; Fleet Cost — {fleetSize} machine{fleetSize > 1 ? 's' : ''}</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>{priceLabel}</th>
              <th>Fleet capital (×{fleetSize})</th>
              <th>One-time infra cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, result }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td>
                  {formatCurrency(result.capitalTotal / result.fleetSize)} <ConfidenceBadge confidence={machine.costConfidence} tooltip={machine.costConfidence === 'unconfirmed' ? 'Machine price not yet quoted — pending a dealer quote.' : undefined} />
                </td>
                <td>{formatCurrency(result.capitalTotal)}</td>
                <td>{result.oneTimeYear0 > 0 ? formatCurrency(result.oneTimeYear0) : '—'}</td>
                <td>{machine.costConfidence === 'unconfirmed' ? <RequestQuoteButton machine={machine} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Annual Running Cost (per machine, year-1 base rate)</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Operating weight</th>
              <th>Bucket capacity</th>
              <th>Annual energy</th>
              <th>Annual maintenance</th>
              <th>Annual total</th>
              <th>Fleet annual total (×{fleetSize})</th>
              <th>Savings starts (vs electric)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, result, breakeven }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td>{machine.operatingWeightKg.toLocaleString()} kg</td>
                <td>{bucketRange(machine)}</td>
                <td>{formatCurrency(result.annualEnergyCost)}</td>
                <td>
                  {result.maintenanceUnknown
                    ? <ConfidenceBadge confidence="unconfirmed" tooltip="No maintenance figure yet — pending a dealer quote." />
                    : formatCurrency(result.annualMaintenanceCost)}
                </td>
                <td>{formatCurrency(result.annualTotalCost)}</td>
                <td>{formatCurrency(result.annualRunningTotal)}</td>
                <td>
                  {machine.type === 'electric'
                    ? '—'
                    : breakeven != null
                      ? `Yr ${breakeven.toFixed(1)}`
                      : `Beyond ${horizonYears}yr horizon`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Lifecycle Event Basis</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Event</th>
              <th>Interval</th>
              <th>Base cost</th>
              <th>Annual escalation</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, result }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td>{machine.type === 'electric' ? 'Battery replacement' : 'Engine overhaul'}</td>
                <td>{machine.type === 'electric' ? `${machine.battery.lifeHours.toLocaleString()} h` : `${DIESEL_OVERHAUL.intervalHours.toLocaleString()} h`}</td>
                <td>{formatCurrency(result.eventBaseCost)}</td>
                <td>{formatRate(result.eventRate)}</td>
                <td>
                  {machine.type === 'electric'
                    ? <ConfidenceBadge confidence="confirmed" />
                    : <ConfidenceBadge confidence="estimate" tooltip={DIESEL_OVERHAUL.note} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Warranty &amp; Confidence</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Warranty</th>
              <th>Price</th>
              <th>Consumption</th>
              <th>Maintenance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, result }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td>
                  {machine.warranty?.machine
                    ? <>{machine.warranty.machine}{machine.warranty.battery ? `; ${machine.warranty.battery}` : ''}</>
                    : <ConfidenceBadge confidence="unconfirmed" tooltip="Warranty terms not yet quoted — pending a dealer quote." />}
                </td>
                <td><ConfidenceBadge confidence={machine.costConfidence} /> {machine.costConfidence === 'confirmed' && 'Confirmed'}</td>
                <td><ConfidenceBadge confidence={machine.consumption.confidence} tooltip={machine.consumption.confidence !== 'confirmed' ? machine.consumption.note : undefined} /> {machine.consumption.confidence === 'confirmed' && 'Confirmed'}</td>
                <td>{result.maintenanceUnknown ? <ConfidenceBadge confidence="unconfirmed" /> : <><ConfidenceBadge confidence={machine.maintenance.confidence} /> Confirmed</>}</td>
                <td>{(machine.costConfidence === 'unconfirmed' || machine.warranty?.confidence === 'unconfirmed') ? <RequestQuoteButton machine={machine} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Source Notes</h3>
        <ul className="source-notes">
          {rows.map(({ machine }) => (
            <li key={machine.id}>
              <strong>{machine.displayName} consumption:</strong> {machine.consumption.note}
            </li>
          ))}
          <li><strong>Diesel overhaul cost &amp; interval:</strong> {DIESEL_OVERHAUL.note}</li>
          <li>
            <strong>Escalation assumptions:</strong> diesel price {formatRate(ESCALATION.dieselPrice)}, electricity price {formatRate(ESCALATION.electricityPrice)},
            maintenance {formatRate(ESCALATION.maintenance)}, diesel overhaul cost {formatRate(ESCALATION.dieselOverhaul)}, battery replacement cost {formatRate(ESCALATION.batteryReplacement)} —
            researched industry trends applied to running costs and lifecycle event lump sums, not flat projections.
          </li>
          <li><strong>Pricing shown:</strong> {vatInclusive ? `Includes 15% VAT.` : `Excludes VAT — toggle "Show prices including VAT" on the Inputs tab to add 15%.`}</li>
        </ul>
      </div>
    </div>
  );
}
