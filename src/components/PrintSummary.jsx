import { annualHours, operationBand, interpolateConsumption, theftTheta } from '../lib/calculationEngine';
import { MACHINE_OPTIONS, FUEL_THEFT_LEVELS } from '../data/machinesConfig';
import './PrintSummary.css';

export default function PrintSummary({ inputs }) {
  const hours = annualHours(inputs);
  const band = operationBand(inputs.operationSlider);
  const cElec = interpolateConsumption('electric', inputs.operationSlider);
  const cDiesel = interpolateConsumption('diesel', inputs.operationSlider);
  const theta = theftTheta(inputs);
  const selectedOptions = MACHINE_OPTIONS.filter((o) => (inputs.machineOptions ?? []).includes(o.id));
  const theftLabel = (FUEL_THEFT_LEVELS.find((l) => l.id === inputs.fuelTheftLevel) ?? FUEL_THEFT_LEVELS[1]).label;
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="print-only print-summary">
      <p className="print-summary__date">Generated {today}</p>
      <h3>Inputs used for this projection</h3>
      <ul>
        <li>Machines compared: {selectedOptions.length ? selectedOptions.map((o) => o.label).join('; ') : '—'}</li>
        <li>Fleet size: {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''} (all costs scale ×{inputs.fleetSize})</li>
        <li>{inputs.dailyHours} h/day × {inputs.daysPerWeek} days/week × {inputs.weeksPerYear} weeks/year = {hours.toLocaleString()} h/year (per machine)</li>
        <li>Duty: {band.label} — {cElec} kWh/h electric, {cDiesel} L/h diesel</li>
        <li>Electricity price: R{inputs.electricityPrice}/kWh · Diesel price: R{inputs.dieselPrice}/L</li>
        <li>Fuel {inputs.fuelIncludedInRate ? 'included in the rate' : 'not included (diesel fuel excluded from comparison)'}</li>
        <li>Fuel-theft control: {theftLabel} (θ = {theta * 100}% on diesel fuel)</li>
      </ul>
    </div>
  );
}
