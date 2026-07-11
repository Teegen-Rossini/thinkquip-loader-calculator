// Builds the live "what's on the customer's screen right now" snapshot that
// the ChatWidget sends with every message, so the assistant can explain the
// page being viewed — which machine is cheaper, what the crossover means, what
// each figure is — using the calculator's own live numbers instead of guessing.
//
// Plain text on purpose: it is injected verbatim into the chat model's prompt.
// Keep it compact; the API caps it, and every extra line is latency + cost.

import { CALC_DEFAULTS, FUEL_THEFT_LEVELS } from '../data/machinesConfig';
import {
  annualHours,
  applyVat,
  cumulativeCostAtHours,
  operationBand,
  totalPerHourFor,
} from './calculationEngine';
import { formatCurrency, formatHours, variantName } from './format';

// What each page shows, in the words a salesperson would use — lets the
// assistant answer "what is this page?" without retrieval.
const PAGE_NOTES = {
  dashboard: 'the landing page, which introduces the tool and its five steps',
  inputs: 'the "01 Inputs" page, where the customer\'s operating parameters are entered (machines to compare, machine prices — editable, defaulting to list price, with a discount-off-list summary when lowered — daily hours, energy prices, fuel-theft control, fleet size)',
  comparison: 'the "02 Comparison" page: the comparison-window slider (its two-colour bar shows which machine is cheaper over which hours), a card for the cheapest machine at the chosen window, gap cards for the other machines, and per-1,000 h running-cost tallies per machine',
  chart: 'the "03 Cost Over Hours" page: the cumulative cost-over-operating-hours chart (purchase price plus all running costs), with the crossover point marked where the total-cost lines cross',
  details: 'the "04 Spec Sheet" page: the full specification and assumptions table for each selected machine',
  calculation: 'the "05 Calculations" page: every calculation shown transparently with the live numbers plugged in, each step explained in plain language',
};

const round = (v) => Math.round(v).toLocaleString('en-US');

function yearsAt(hours, hoursPerYear) {
  return hoursPerYear > 0 ? ` (~${(hours / hoursPerYear).toFixed(1)} years at this utilization)` : '';
}

/** One line per selected machine: identity, price, today's running cost, TCO. */
function machineLine(result, selection, inputs) {
  const { machine } = result;
  // Purchase and TCO come out of the engine already VAT-adjusted; the shared
  // per-hour figures do not, so match them to the display mode here.
  const perH = applyVat(totalPerHourFor(result), inputs);
  const isHero = machine.uid === selection.heroUid;
  const dieselNote = inputs.fuelIncludedInRate
    ? '(fuel incl. theft uplift + R29/h routine service)'
    : '(R29/h routine service only — fuel is excluded per the inputs)';
  const parts = [
    `${variantName(machine)} (${machine.type === 'electric' ? 'electric' : 'diesel'}):`,
    `purchase ${formatCurrency(result.purchaseFleet)},`,
    machine.type === 'electric'
      ? `running cost ${formatCurrency(perH)}/h at today's prices (electricity only — no mechanical service line),`
      : `running cost ${formatCurrency(perH)}/h at today's prices ${dieselNote},`,
    `total cost of ownership ${formatCurrency(result.tcoAtWindow)} at the ${round(selection.windowHours)} h window.`,
  ];
  if (isHero && selection.hasComparison) parts.push('CHEAPEST at the window — this anchors the comparison.');
  return `- ${parts.join(' ')}`;
}

/** One line per non-cheapest machine: its gap and the crossover, phrased the
 *  same way the Comparison page phrases them. */
function comparisonLine(comp, selection) {
  const heroName = variantName(selection.heroMachine);
  const name = variantName(comp.machine);
  if (comp.sameRunningCosts) {
    return `- ${name} runs at the same cost per hour as ${heroName}; the only difference is the ${formatCurrency(comp.priceGapFleet)} purchase-price gap, so it stays ${formatCurrency(comp.gapAtWindow)} more expensive at every hour.`;
  }
  let crossover;
  if (comp.crossoverHours == null) {
    crossover = `${heroName} is cheaper across the whole 0–${round(CALC_DEFAULTS.chartMaxHours)} h range (the lines never cross)`;
  } else if (comp.crossoverDirection === 'gains') {
    crossover = `the total-cost lines cross at ${formatHours(comp.crossoverHours)} — ${heroName} becomes the cheaper machine from that point onward`;
  } else {
    crossover = `the total-cost lines cross at ${formatHours(comp.crossoverHours)} — ${heroName} is cheaper until that point`;
  }
  return `- vs ${name}: costs ${formatCurrency(Math.abs(comp.gapAtWindow))} ${comp.gapAtWindow >= 0 ? 'more' : 'less'} than ${heroName} at the window; ${crossover}.`;
}

/**
 * Dense cumulative-cost table so "what does it cost / what do I save at X
 * hours?" is a direct row lookup for the chat model — never arithmetic it can
 * fumble. Each row: the cheapest-at-window machine's cumulative TCO, then
 * every other machine's, with its gap pre-computed in parentheses.
 */
function costTable(selection) {
  const step = 250;
  const hero = selection.hero;
  const others = selection.machines.filter((m) => m.machine.uid !== hero.machine.uid);
  const heroName = variantName(hero.machine);

  const header = selection.hasComparison
    ? `Cumulative total-cost table, sampled every ${step} h (purchase + running, fleet of ${selection.fleetSize}). Columns: ${heroName}, then ${others.map((m) => variantName(m.machine)).join(', ')} — each with its gap vs ${heroName} in parentheses ("+" = it costs that much MORE at that hour, i.e. choosing ${heroName} saves that amount; "−" = it costs that much less there):`
    : `Cumulative total-cost table for ${heroName}, sampled every ${step} h (purchase + running, fleet of ${selection.fleetSize}):`;

  const rows = [];
  for (let h = 0; h <= CALC_DEFAULTS.chartMaxHours; h += step) {
    const heroCost = cumulativeCostAtHours(hero.series, h);
    const cells = [formatCurrency(heroCost)];
    for (const m of others) {
      const cost = cumulativeCostAtHours(m.series, h);
      const gap = cost - heroCost;
      cells.push(`${formatCurrency(cost)} (${gap >= 0 ? '+' : '−'}${formatCurrency(Math.abs(gap))})`);
    }
    rows.push(`${round(h)} h: ${cells.join('; ')}`);
  }
  return [header, ...rows];
}

/**
 * The full snapshot. Returns a plain-text block describing the active page,
 * the live inputs, and the computed results the customer can see.
 */
export function buildPageContext({ activeTab, inputs, selection }) {
  const H = annualHours(inputs);
  const band = operationBand(inputs.operationSlider);
  const theft = FUEL_THEFT_LEVELS.find((l) => l.id === inputs.fuelTheftLevel) ?? FUEL_THEFT_LEVELS[1];
  const lines = [];

  lines.push(`Page being viewed: ${PAGE_NOTES[activeTab] ?? activeTab}.`);
  lines.push('');
  lines.push(
    'Live inputs: ' +
      `utilization ${inputs.dailyHours} h/day × ${inputs.daysPerWeek} days/week × ${inputs.weeksPerYear} weeks/year = ${round(H)} operating hours/year; ` +
      `operation intensity "${band.label}"; ` +
      `electricity R${inputs.electricityPrice}/kWh; diesel R${inputs.dieselPrice}/L (${inputs.fuelIncludedInRate ? 'fuel included in the rate' : 'fuel NOT included in the rate — diesel fuel cost and its theft uplift are excluded from the diesel total'}); ` +
      `fuel-theft control "${theft.label}" (θ ${(theft.theta * 100).toFixed(1)}% on diesel fuel only); ` +
      `fleet of ${inputs.fleetSize} machine${inputs.fleetSize > 1 ? 's' : ''} (all costs scale per machine); ` +
      `figures shown ${inputs.vatInclusive ? 'INCLUSIVE' : 'EXCLUSIVE'} of 15% VAT; ` +
      `comparison window ${round(selection.windowHours)} operating hours${yearsAt(selection.windowHours, selection.hoursPerYear)}.`,
  );
  lines.push('');

  lines.push(`On-screen results (fleet of ${inputs.fleetSize}, at the ${round(selection.windowHours)} h window):`);
  selection.machines.forEach((result) => lines.push(machineLine(result, selection, inputs)));
  lines.push(
    'Maintenance in these figures is differential: only the diesel engine\'s R29/h routine servicing is counted, because wear items common to both machines (tyres, bucket, hydraulics, general wear) cost the same on either and cancel out of the comparison — that is also why electric shows R0/h.',
  );

  if (selection.hasComparison) {
    lines.push('');
    lines.push(`Comparison vs the cheapest machine (${variantName(selection.heroMachine)}):`);
    selection.comparisons.forEach((comp) => lines.push(comparisonLine(comp, selection)));
  } else {
    lines.push('');
    lines.push('Only one machine is selected, so no comparison, gap or crossover figures are shown on screen — just its own total cost at the window.');
  }

  lines.push('');
  lines.push(...costTable(selection));

  // Battery replacement is deliberately NOT shown anywhere on screen or in the
  // printed brochure — it lives only here so the assistant can answer if asked.
  if (selection.battery) {
    lines.push('');
    lines.push(
      `Battery note (not shown anywhere on screen or in the brochure — mention only if the customer asks): the electric loader's battery replacement lands at ${round(selection.battery.atHours)} h` +
        `${selection.battery.year != null ? ` (~year ${selection.battery.year.toFixed(1)} at this utilization)` : ''} — beyond the ${round(CALC_DEFAULTS.chartMaxHours)} h chart and beyond the first owner's typical lifecycle, so it is never plotted on the curve or included in the TCO comparison; projected cost ${formatCurrency(selection.battery.escalatedCost)} (battery prices are projected to DECLINE 5%/year).`,
    );
  }

  return lines.join('\n');
}
