import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { ESCALATION, DIESEL_SERVICE, CALC_DEFAULTS } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import MachineName from './MachineName';
import './SummaryTable.css';

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%/yr`;
}

export default function SummaryTable({ selection, inputs }) {
  const { machines, comparisons, hasComparison, battery, heroMachine, electricSelected, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const vatInclusive = inputs.vatInclusive;
  const priceLabel = vatInclusive ? 'Unit price (incl. VAT)' : 'Unit price (excl. VAT)';

  const isElec = (r) => r.machine.type === 'electric';
  const perHourEnergy = (r) => applyVat(isElec(r) ? r.perHour.elecEnergyPerH : r.perHour.dieselFuelPerH, inputs);
  const perHourService = (r) => applyVat(isElec(r) ? r.perHour.elecMaintPerH : r.perHour.dieselServicePerH, inputs);
  const perHourTotal = (r) => applyVat(isElec(r) ? r.perHour.elecPerH : r.perHour.dieselPerH, inputs);
  const cmpFor = (r) => comparisons.find((c) => c.machine.uid === r.machine.uid);

  return (
    <div className="summary-tables panel-surface" id="spec-sheet-assumptions">
      <div className="summary-table-block">
        <h3>Capital &amp; Fleet Cost — {selection.fleetSize} machine{selection.fleetSize > 1 ? 's' : ''}</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>{priceLabel}</th>
              <th>Fleet capital (×{selection.fleetSize})</th>
              <th>TCO @ {formatHours(maxHours)}</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((r) => (
              <tr key={r.machine.uid}>
                <td><MachineName machine={r.machine} /></td>
                <td className="mono">{formatCurrency(r.purchaseFleet / r.fleetSize)}</td>
                <td className="mono">{formatCurrency(r.purchaseFleet)}</td>
                <td className="mono">{formatCurrency(r.tcoAtMax)}</td>
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
            {machines.map((r) => {
              const m = r.machine;
              return (
                <tr key={m.uid}>
                  <td>
                    <span className="summary-machine">
                      <img src={m.photo} alt="" className="summary-machine__thumb" loading="lazy" />
                      <MachineName machine={m} />
                    </span>
                  </td>
                  <td className="mono">{m.operatingWeightKg.toLocaleString()} kg</td>
                  <td className="mono">{m.ratedPayloadKg.toLocaleString()} kg</td>
                  <td className="mono">{m.bucketCapacityM3} m³</td>
                  <td className="mono">{m.tyres}</td>
                  <td className="mono">{isElec(r) ? `${m.battery.capacityKWh} kWh · ${m.battery.chargerRatingKW} kW charger (incl.)` : m.engine}</td>
                  <td className="mono">{m.warranty}</td>
                </tr>
              );
            })}
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
              {hasComparison && <th>Savings starts (vs {heroMachine.name})</th>}
            </tr>
          </thead>
          <tbody>
            {machines.map((r) => {
              const cmp = cmpFor(r);
              return (
                <tr key={r.machine.uid}>
                  <td><MachineName machine={r.machine} /></td>
                  <td className="mono">{isElec(r) ? `${r.perHour.cElec} kWh/h` : `${r.perHour.cDiesel} L/h`}</td>
                  <td className="mono">{formatCurrency(perHourEnergy(r))}</td>
                  <td className="mono">{isElec(r) ? 'R0' : formatCurrency(perHourService(r))}</td>
                  <td className="mono">{formatCurrency(perHourTotal(r))}</td>
                  {hasComparison && (
                    <td className="mono">
                      {!cmp
                        ? '—'
                        : cmp.breakevenHours != null && cmp.breakevenHours <= maxHours
                          ? `${formatHours(cmp.breakevenHours)} (~${formatYearsFromHours(cmp.breakevenHours, hoursPerYear)})`
                          : `Beyond ${formatHours(maxHours)}`}
                    </td>
                  )}
                </tr>
              );
            })}
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
            {machines.map((r) => {
              const m = r.machine;
              if (m.type === 'electric') {
                return (
                  <tr key={m.uid}>
                    <td><MachineName machine={m} /></td>
                    <td>Battery replacement</td>
                    <td className="mono">{formatCurrency(battery.baseCost)} base</td>
                    <td className="mono">{formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)})</td>
                    <td className="mono">{formatRate(battery.rate)}</td>
                  </tr>
                );
              }
              return (
                <tr key={m.uid}>
                  <td><MachineName machine={m} /></td>
                  <td>Routine engine service</td>
                  <td className="mono">R{DIESEL_SERVICE.ratePerHour}/h (continuous)</td>
                  <td className="mono">Ongoing</td>
                  <td className="mono">{formatRate(ESCALATION.maintenance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {electricSelected && (
          <p className="summary-note">
            The electric machine carries no mechanical-maintenance line until its battery reaches replacement at
            {' '}{formatHours(battery.atHours)} — beyond the first owner’s lifecycle and the 20,000 h chart. That absence is the
            long-term advantage to highlight.
          </p>
        )}
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
