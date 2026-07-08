import { THINKQUIP_LOGO } from '../data/machinesConfig';
import { applyVat } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours, variantName } from '../lib/format';
import { PrintPage, PageHeader, Band, SpecRows } from './PrintKit';

function MachineColumn({ machine, result, inputs, isElectric, windowHours }) {
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
          <span className="print-compare__type">{isElectric ? 'Electric — charger included' : `Diesel${machine.variant ? ` — ${machine.variant}` : ''}`}</span>
        </span>
      </div>
      <SpecRows rows={[
        { label: `Unit price (${vatLabel})`, value: formatCurrency(result.purchaseFleet / result.fleetSize) },
        { label: `Fleet capital (×${result.fleetSize})`, value: formatCurrency(result.purchaseFleet) },
        { label: 'Consumption at your duty', value: isElectric ? `${Math.round(per.cElec)} kWh/h` : `${Math.round(per.cDiesel)} L/h` },
        { label: isElectric ? 'Electricity cost / h' : 'Fuel cost / h (incl. theft θ)', value: formatCurrency(energyPerH) },
        { label: 'Mechanical service / h', value: isElectric ? 'R0 — none' : formatCurrency(servicePerH) },
        { label: 'Total running cost / h (year 0)', value: formatCurrency(totalPerH) },
        { label: `Total cost @ ${formatHours(windowHours)}`, value: formatCurrency(result.tcoAtWindow) },
      ]} />
    </div>
  );
}

/** Brochure section 3 — the selected SANY machines side by side, ending in the
 *  neutral cheapest-machine callout (only when 2+ machines are compared).
 *  Every window-dependent figure uses the comparison window set on screen. */
export default function PrintComparisonPage({ selection, inputs, pageNumber, pageCount }) {
  const { machines, comparisons, hasComparison, heroMachine, hoursPerYear, windowHours, electricSelected } = selection;
  const heroName = variantName(heroMachine);
  // ONLY the two diesel brake variants selected — identical running costs, so
  // the upfront price gap is the whole story (surfaced once, up top).
  const dieselsOnlySamePrice = hasComparison && !electricSelected && comparisons.every((c) => c.sameRunningCosts);

  // Strongest figure for the callout: the widest gap at the window.
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.gapAtWindow ?? -Infinity) > (a.gapAtWindow ?? -Infinity) ? b : a))
    : null;
  const bestSaving = best?.gapAtWindow;

  const comparisonIntro = dieselsOnlySamePrice
    ? `These variants run at identical cost per hour at your inputs — the whole comparison is the ${formatCurrency(comparisons[0].priceGapFleet)} upfront price difference, which never closes or grows.`
    : `The selected machines are compared on total cost of ownership — purchase price plus escalated running costs — measured at your chosen window of ${formatHours(windowHours)} (~${formatYearsFromHours(windowHours, hoursPerYear)} at your hours). The cheapest machine at that window is highlighted.`;

  const crossoverValue = (c) => {
    if (c.sameRunningCosts || c.crossoverHours == null) {
      return `None in range — the ${heroName} is cheaper throughout`;
    }
    return c.crossoverDirection === 'loses'
      ? `${heroName} cheaper until ${formatHours(c.crossoverHours)} — ~${formatYearsFromHours(c.crossoverHours, hoursPerYear)} at your hours`
      : `${heroName} cheaper from ${formatHours(c.crossoverHours)} onward — ~${formatYearsFromHours(c.crossoverHours, hoursPerYear)} at your hours`;
  };

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount}>
      <PageHeader logo={THINKQUIP_LOGO} logoAlt="ThinkQuip" title="Machine Comparison" />
      <p className="print-intro">
        {hasComparison
          ? comparisonIntro
          : `The selected machine, costed over the same operating hours with your utilization, duty cycle and energy prices, measured at ${formatHours(windowHours)}. Select a second machine to see the comparison.`}
      </p>

      <div className={machines.length >= 3 ? 'print-compare print-compare--three' : 'print-compare'}>
        {machines.map((r) => (
          <MachineColumn key={r.machine.uid} machine={r.machine} result={r} inputs={inputs}
            isElectric={r.machine.type === 'electric'} windowHours={windowHours} />
        ))}
      </div>

      {hasComparison && (
        <>
          <Band>{dieselsOnlySamePrice ? 'The difference in price' : `Cheapest at ${formatHours(windowHours)}: ${heroName}`}</Band>
          <SpecRows rows={dieselsOnlySamePrice
            ? [
                {
                  label: `Upfront price difference — ${variantName(comparisons[0].machine)} vs ${heroName}`,
                  value: `${formatCurrency(comparisons[0].priceGapFleet)} upfront`,
                },
                {
                  label: 'Running costs',
                  value: 'Identical — the price gap holds at every operating hour',
                },
              ]
            : comparisons.flatMap((c) => [
                {
                  label: `Cost gap @ ${formatHours(windowHours)} — ${variantName(c.machine)} vs ${heroName}`,
                  value: c.gapAtWindow > 0 ? `${formatCurrency(c.gapAtWindow)} more` : 'Level at this window',
                },
                {
                  label: `Crossover vs ${variantName(c.machine)}`,
                  value: crossoverValue(c),
                },
              ])} />

          {best && bestSaving > 0 && (
            <div className="print-callout">
              <p className="print-callout__value">{formatCurrency(bestSaving)} saved by {formatHours(windowHours)}</p>
              <p className="print-callout__text">
                {best.sameRunningCosts
                  ? `The ${heroMachine.displayName} costs ${formatCurrency(best.priceGapFleet)} less to buy than the ${best.machine.displayName} for ${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} and runs at the same cost per hour — the saving holds at every operating hour.`
                  : `Total cost of ownership advantage of the ${heroMachine.displayName} over the ${best.machine.displayName} for ${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} at your ${formatHours(windowHours)} window, including purchase price, energy and service.`}
              </p>
            </div>
          )}
        </>
      )}

      <p className="print-note">
        Diesel fuel is {inputs.fuelIncludedInRate ? 'included' : 'excluded (not in the contract rate)'} in this comparison;
        electricity for the electric machine and the R29/h diesel routine service are always counted.
      </p>
    </PrintPage>
  );
}
