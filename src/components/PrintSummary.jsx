import { annualHours } from '../lib/calculationEngine';
import './PrintSummary.css';

export default function PrintSummary({ inputs }) {
  const hours = annualHours(inputs);
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="print-only print-summary">
      <p className="print-summary__date">Generated {today}</p>
      <h3>Inputs used for this projection</h3>
      <ul>
        <li>Fleet size: {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}</li>
        <li>{inputs.dailyHours} h/day × {inputs.daysPerWeek} days/week × {inputs.weeksPerYear} weeks/year = {hours.toLocaleString()} h/year (per machine)</li>
        <li>Duty mix: {100 - inputs.operationMixHeavyPct}% light / {inputs.operationMixHeavyPct}% heavy</li>
        <li>Energy source: {inputs.energySource === 'solar' ? 'Solar' : 'Grid charger'}; charging infrastructure {inputs.chargingInfraInstalled ? 'already installed' : 'not yet installed (install cost included)'}</li>
        <li>Electricity price: R{inputs.electricityPrice}/kWh · Diesel price: R{inputs.dieselPrice}/L</li>
        <li>
          {inputs.isTenderJob
            ? `Tender job — fuel cost ${inputs.fuelIncludedInTender ? 'included in the comparison (customer pays fuel)' : 'excluded from the comparison (fuel not part of customer’s cost)'}`
            : 'Not a tender job'}
        </li>
      </ul>
    </div>
  );
}
