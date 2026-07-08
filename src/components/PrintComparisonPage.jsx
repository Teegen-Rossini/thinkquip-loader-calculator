import { CALC_DEFAULTS, THINKQUIP_LOGO } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { PrintPage, PageHeader, Band, SpecRows, DotLegend } from './PrintKit';

function MachineColumn({ machine, result, inputs, isElectric }) {
  const per = result.perHour;
  const energyPerH = applyVat(isElectric ? per.elecEnergyPerH : per.dieselFuelPerH, inputs);
  const servicePerH = applyVat(isElectric ? per.elecMaintPerH : per.dieselServicePerH, inputs);
  const totalPerH = applyVat(isElectric ? per.elecPerH : per.dieselPerH, inputs);
  const vatLabel = inputs.vatInclusive ? 'incl. VAT' : 'excl. VAT';

  return (
    <div className="print-compare__col">
      <div className="print-compare__head" style={{ borderTopColor: machine.accentColor }}>
        <img src={machine.logo} alt={machine.brand} />
        <span className="print-compare__name">
          {machine.name}
          <span className="print-compare__type">{isElectric ? 'Electric — charger included' : `Diesel — ${machine.brake} brake`}</span>
        </span>
      </div>
      <SpecRows rows={[
        { label: `Unit price (${vatLabel})`, value: formatCurrency(result.purchaseFleet / result.fleetSize), confidence: machine.priceConfidence },
        { label: `Fleet capital (×${result.fleetSize})`, value: formatCurrency(result.purchaseFleet), confidence: machine.priceConfidence },
        { label: 'Consumption at your duty', value: isElectric ? `${per.cElec} kWh/h` : `${per.cDiesel} L/h` },
        { label: isElectric ? 'Electricity cost / h' : 'Fuel cost / h (incl. theft θ)', value: formatCurrency(energyPerH) },
        { label: 'Mechanical service / h', value: isElectric ? 'R0 — none' : formatCurrency(servicePerH) },
        { label: 'Total running cost / h (year 0)', value: formatCurrency(totalPerH) },
        { label: `Cumulative cost @ ${formatHours(CALC_DEFAULTS.chartMaxHours)}`, value: formatCurrency(result.tcoAtMax) },
      ]} />
    </div>
  );
}

/** Brochure section 3 — the selected SANY machines side by side, ending in the
 *  headline savings callout (only when 2+ machines are compared). */
export default function PrintComparisonPage({ selection, inputs, pageNumber, pageCount }) {
  const { machines, comparisons, hasComparison, heroMachine, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  // Strongest saving for the callout.
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.savingsAtMax ?? -Infinity) > (a.savingsAtMax ?? -Infinity) ? b : a))
    : null;
  const bestSaving = best?.savingsAtMax;

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount}>
      <PageHeader logo={THINKQUIP_LOGO} logoAlt="ThinkQuip" title="Machine Comparison" />
      <p className="print-intro">
        {hasComparison
          ? 'The selected machines are compared over the same operating hours with your utilization, duty cycle and energy prices. The diesel machine is cheaper to buy; the electric machine is cheaper to run every hour after that.'
          : 'The selected machine, costed over the same operating hours with your utilization, duty cycle and energy prices. Select a second machine to see savings and the break-even point.'}
      </p>

      <div className="print-compare">
        {machines.map((r) => (
          <MachineColumn key={r.machine.uid} machine={r.machine} result={r} inputs={inputs} isElectric={r.machine.type === 'electric'} />
        ))}
      </div>

      {hasComparison && (
        <>
          <Band>Where the lines cross</Band>
          <SpecRows rows={comparisons.flatMap((c) => [
            {
              label: `Savings start — ${heroMachine.name} vs ${c.machine.name}`,
              value: c.breakevenHours != null && c.breakevenHours <= maxHours
                ? `${formatHours(c.breakevenHours)} — ~${formatYearsFromHours(c.breakevenHours, hoursPerYear)} at your hours`
                : `Beyond ${formatHours(maxHours)} at these inputs`,
            },
            {
              label: `Simple year-0 check vs ${c.machine.name} (price gap ÷ hourly saving)`,
              value: c.simpleBreakevenHours != null ? formatHours(c.simpleBreakevenHours) : 'No year-0 hourly saving at these inputs',
            },
          ])} />

          {best && bestSaving > 0 && (
            <div className="print-callout">
              <p className="print-callout__value">{formatCurrency(bestSaving)} saved by {formatHours(maxHours)}</p>
              <p className="print-callout__text">
                Total cost of ownership advantage of the {heroMachine.displayName} over the {best.machine.displayName} for{' '}
                {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''}, including purchase price, energy and service.
              </p>
            </div>
          )}
        </>
      )}

      <p className="print-note">
        Diesel fuel is {inputs.fuelIncludedInRate ? 'included' : 'excluded (not in the contract rate)'} in this comparison;
        electricity for the electric machine and the R29/h diesel routine service are always counted.
      </p>
      <DotLegend />
    </PrintPage>
  );
}
