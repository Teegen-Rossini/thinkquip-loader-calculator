import { THINKQUIP_LOGO_TURQUOISE, DIESEL_SERVICE } from '../data/machinesConfig';
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
        { label: 'Consumption at your duty cycle', value: isElectric ? `${Math.round(per.cElec)} kWh/h` : `${Math.round(per.cDiesel)} L/h` },
        { label: isElectric ? 'Energy cost / h (Electricity)' : 'Energy cost / h (Diesel, incl. theft θ)', value: formatCurrency(energyPerH) },
        { label: 'Routine service / h', value: isElectric ? 'No mechanical service line — R0/h' : formatCurrency(servicePerH) },
        { label: 'Running cost / h (year 0)', value: formatCurrency(totalPerH) },
        { label: `TCO @ ${formatHours(windowHours)}`, value: formatCurrency(result.tcoAtWindow), emph: true },
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
      <PageHeader logo={THINKQUIP_LOGO_TURQUOISE} logoAlt="ThinkQuip" title="Machine Comparison" />
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
                  label: `Saving @ ${formatHours(windowHours)} — ${heroName} vs ${variantName(c.machine)}`,
                  value: c.gapAtWindow > 0 ? `${formatCurrency(c.gapAtWindow)} saved` : 'Level at this window',
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
                  ? `The ${variantName(heroMachine)} costs ${formatCurrency(best.priceGapFleet)} less to buy than the ${variantName(best.machine)} for ${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} and runs at the same cost per hour — the saving holds at every operating hour.`
                  : `Total cost of ownership saving of the ${variantName(heroMachine)} over the ${variantName(best.machine)} for ${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} at your ${formatHours(windowHours)} window, including purchase price, energy and service.`}
              </p>
            </div>
          )}
        </>
      )}

      <p className="print-note">
        Diesel fuel is {inputs.fuelIncludedInRate ? 'included' : 'excluded (not in the contract rate)'} in this comparison;
        electricity for the electric machine and the R{DIESEL_SERVICE.ratePerHour}/h diesel routine service are always counted.
      </p>
    </PrintPage>
  );
}
