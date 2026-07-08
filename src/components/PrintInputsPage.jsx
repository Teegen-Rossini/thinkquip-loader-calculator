import {
  FUEL_THEFT_LEVELS, ESCALATION, CALC_DEFAULTS, THINKQUIP_LOGO,
} from '../data/machinesConfig';
import { annualHours, operationBand, interpolateConsumption, theftTheta } from '../lib/calculationEngine';
import { formatHours, formatYearsFromHours } from '../lib/format';
import { PrintPage, PageHeader, Band, SpecRows } from './PrintKit';

function pct(rate) {
  const p = Math.round(rate * 1000) / 10;
  return `${p > 0 ? '+' : ''}${p}% / yr`;
}

/** Brochure section 2 — every input and assumption behind the projection,
 *  in ruled spec rows so the customer can audit their own numbers. */
export default function PrintInputsPage({ selection, inputs, pageNumber, pageCount }) {
  const hours = annualHours(inputs);
  const band = operationBand(inputs.operationSlider);
  const cElec = interpolateConsumption('electric', inputs.operationSlider);
  const cDiesel = interpolateConsumption('diesel', inputs.operationSlider);
  const theta = theftTheta(inputs);
  const theft = FUEL_THEFT_LEVELS.find((l) => l.id === inputs.fuelTheftLevel) ?? FUEL_THEFT_LEVELS[1];
  const machinesLabel = selection.machines.map((m) => m.machine.displayName).join('; ');

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount}>
      <PageHeader logo={THINKQUIP_LOGO} logoAlt="ThinkQuip" title="Inputs & Assumptions" />
      <p className="print-intro">
        Every figure in this proposal is derived from the operating inputs below — supplied by you — combined
        with SANY factory data and researched escalation trends.
      </p>

      <Band>Your Operation</Band>
      <SpecRows rows={[
        { label: selection.machines.length > 1 ? 'Machines compared' : 'Machine selected', value: machinesLabel },
        { label: 'Fleet size', value: `${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} — all costs scale ×${inputs.fleetSize} per machine` },
        { label: 'Utilization', value: `${inputs.dailyHours} h/day × ${inputs.daysPerWeek} days/wk × ${inputs.weeksPerYear} wks/yr` },
        { label: 'Annual operating hours (per machine)', value: `${hours.toLocaleString('en-US')} h/yr` },
        { label: 'Comparison window', value: `${formatHours(selection.windowHours)} — ≈ ${formatYearsFromHours(selection.windowHours, hours)} at your hours` },
        { label: 'Duty cycle', value: `${band.label} — ${Math.round(cElec)} kWh/h electric · ${Math.round(cDiesel)} L/h diesel` },
      ]} />

      <Band>Energy Prices</Band>
      <SpecRows rows={[
        { label: 'Electricity price', value: `R${inputs.electricityPrice} / kWh` },
        { label: 'Diesel price', value: `R${inputs.dieselPrice} / L` },
      ]} />

      <Band>Site & Contract Terms</Band>
      <SpecRows rows={[
        {
          label: 'Fuel included in contract rate',
          value: inputs.fuelIncludedInRate
            ? 'Yes — diesel fuel counted in the comparison'
            : 'No — diesel fuel excluded (service still counted)',
        },
        { label: 'Fuel-theft control', value: `${theft.label} — θ = ${Math.round(theta * 1000) / 10}% on diesel fuel only` },
        { label: 'VAT treatment', value: inputs.vatInclusive ? 'Prices shown include 15% VAT' : 'Prices shown exclude VAT' },
      ]} />

      <Band>Escalation Assumptions</Band>
      <SpecRows rows={[
        { label: 'Diesel fuel', value: pct(ESCALATION.dieselFuel) },
        { label: 'Electricity', value: pct(ESCALATION.electricity) },
        { label: 'Routine service (diesel)', value: pct(ESCALATION.maintenance) },
        { label: 'Battery replacement (declines)', value: pct(ESCALATION.batteryReplacement) },
      ]} />

      <p className="print-note">
        The comparison runs over operating hours, 0 → {formatHours(CALC_DEFAULTS.chartMaxHours)}, stepping cost in
        quarter-year slices escalated at each slice midpoint. The electric machine carries no routine mechanical-service
        line (R0/h); the diesel R29/h routine service is always counted. Escalation rates are researched annual trends —
        not flat projections and not a forecast of your business income.
      </p>
    </PrintPage>
  );
}
