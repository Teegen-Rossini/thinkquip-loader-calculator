import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { ESCALATION, DIESEL_SERVICE } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import './SummaryTable.css';

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%/yr`;
}

export default function SummaryTable({ comparison, inputs }) {
  const { electric, diesel, electricMachine, dieselMachine, breakevenHours, battery, hoursPerYear, fleetSize } = comparison;
  const maxHours = 20000;
  const vatInclusive = inputs.vatInclusive;
  const priceLabel = vatInclusive ? 'Unit price (incl. VAT)' : 'Unit price (excl. VAT)';

  const rows = [
    { machine: electricMachine, result: electric, isElectric: true },
    { machine: dieselMachine, result: diesel, isElectric: false },
  ];

  const perHourEnergy = (r) => applyVat(r.isElectric ? r.result.perHour.elecEnergyPerH : r.result.perHour.dieselFuelPerH, inputs);
  const perHourService = (r) => applyVat(r.isElectric ? r.result.perHour.elecMaintPerH : r.result.perHour.dieselServicePerH, inputs);
  const perHourTotal = (r) => applyVat(r.isElectric ? r.result.perHour.elecPerH : r.result.perHour.dieselPerH, inputs);

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
              <th>TCO @ {formatHours(maxHours)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, result }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td className="mono">{formatCurrency(result.purchaseFleet / result.fleetSize)}</td>
                <td className="mono">{formatCurrency(result.purchaseFleet)}</td>
                <td className="mono">{formatCurrency(result.tcoAtMax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Machine Specifications</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Operating weight</th>
              <th>Rated payload</th>
              <th>Bucket</th>
              <th>Tyres</th>
              <th>Engine / battery</th>
              <th>Warranty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ machine, isElectric }) => (
              <tr key={machine.id}>
                <td>{machine.displayName}</td>
                <td className="mono">{machine.operatingWeightKg.toLocaleString()} kg</td>
                <td className="mono">{machine.ratedPayloadKg.toLocaleString()} kg</td>
                <td className="mono">{machine.bucketCapacityM3} m³</td>
                <td className="mono">{machine.tyres}</td>
                <td className="mono">{isElectric ? `${machine.battery.capacityKWh} kWh · ${machine.battery.chargerRatingKW} kW charger (incl.)` : machine.engine}</td>
                <td className="mono">{machine.warranty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Year-0 Running Cost per Hour</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Consumption (current duty)</th>
              <th>Energy / fuel / h</th>
              <th>Service / h</th>
              <th>Total / h</th>
              <th>Savings starts (vs electric)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.machine.id}>
                <td>{r.machine.displayName}</td>
                <td className="mono">{r.isElectric ? `${r.result.perHour.cElec} kWh/h` : `${r.result.perHour.cDiesel} L/h`}</td>
                <td className="mono">{formatCurrency(perHourEnergy(r))}</td>
                <td className="mono">{r.isElectric ? 'R0' : formatCurrency(perHourService(r))}</td>
                <td className="mono">{formatCurrency(perHourTotal(r))}</td>
                <td className="mono">
                  {r.isElectric
                    ? '—'
                    : breakevenHours != null && breakevenHours <= maxHours
                      ? `${formatHours(breakevenHours)} (~${formatYearsFromHours(breakevenHours, hoursPerYear)})`
                      : `Beyond ${formatHours(maxHours)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-table-block">
        <h3>Engine / Battery Maintenance</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Maintenance</th>
              <th>Rate / interval</th>
              <th>Occurs at</th>
              <th>Escalation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{electricMachine.displayName}</td>
              <td>Battery replacement</td>
              <td className="mono">{formatCurrency(battery.baseCost)} base</td>
              <td className="mono">{formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)})</td>
              <td className="mono">{formatRate(battery.rate)}</td>
            </tr>
            <tr>
              <td>{dieselMachine.displayName}</td>
              <td>Routine engine service</td>
              <td className="mono">R{DIESEL_SERVICE.ratePerHour}/h (continuous)</td>
              <td className="mono">Ongoing</td>
              <td className="mono">{formatRate(ESCALATION.maintenance)}</td>
            </tr>
          </tbody>
        </table>
        <p className="summary-note">
          The electric machine carries no mechanical-maintenance line until its battery reaches replacement at
          {' '}{formatHours(battery.atHours)} — beyond the first owner’s lifecycle and the 20,000 h chart. That absence is the
          long-term advantage to highlight.
        </p>
      </div>

      <div className="summary-table-block">
        <h3>Source Notes</h3>
        <ul className="source-notes">
          <li><strong>Consumption:</strong> interpolated linearly from the SANY-supplied breakpoints (electric 20–40 kWh/h, diesel 10–16 L/h) across the 50–100 duty slider.</li>
          <li><strong>Diesel routine service:</strong> {DIESEL_SERVICE.note}</li>
          <li><strong>Fuel theft:</strong> diesel fuel cost × (1 + θ) for the selected site-control level; electricity is never affected.</li>
          <li>
            <strong>Escalation assumptions:</strong> diesel fuel {formatRate(ESCALATION.dieselFuel)}, electricity {formatRate(ESCALATION.electricity)},
            routine service {formatRate(ESCALATION.maintenance)}, battery replacement {formatRate(ESCALATION.batteryReplacement)} —
            researched trends applied per 0.25-year slice at its midpoint year, not flat projections.
          </li>
          <li><strong>Pricing shown:</strong> {vatInclusive ? 'Includes 15% VAT.' : 'Excludes VAT — toggle "Show prices including VAT" on the Inputs tab to add 15%.'}</li>
        </ul>
      </div>
    </div>
  );
}
