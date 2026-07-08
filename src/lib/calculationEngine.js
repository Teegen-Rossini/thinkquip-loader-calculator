/**
 * Calculation engine.
 * Pure functions only: everything here takes config (from
 * src/data/machinesConfig.js) plus customer inputs, and returns numbers.
 * No component or React state should duplicate this math.
 *
 * Model (spec sections 4-10):
 *  - The x-axis is OPERATING HOURS, 0 → 15,000 h.
 *  - Consumption is interpolated continuously from the operation slider.
 *  - Cumulative cost is built by stepping in Δt = 0.25-year time slices; each
 *    slice spans H·Δt hours and is escalated at its midpoint year.
 *  - Diesel: fuel (× (1+θ) theft, only if fuel is included) + R29/h routine
 *    service. Electric: electricity only (always counted); no service line.
 *  - Battery replacement lands at 30,000 h — BEYOND the chart, so it is never
 *    plotted; it is surfaced separately with its calendar year 30,000 / H.
 *  - Comparison framing is NEUTRAL: at the user-chosen comparison window
 *    (0 → 15,000 h) the machine with the lowest total cost of ownership —
 *    purchase price plus all running costs — is the "cheapest" anchor, be it
 *    electric or diesel. There is at most one crossover between any two
 *    total-cost lines; the same crossover hour feeds every view.
 */

import {
  CONSUMPTION_BREAKPOINTS,
  OPERATION_BANDS,
  FUEL_THEFT_LEVELS,
  DIESEL_SERVICE,
  ESCALATION,
  CALC_DEFAULTS,
} from '../data/machinesConfig';
import { ALL_MODELS, getModelById, orderedModelIds } from '../data/machinesRepo';

/** annual_hours H = daily_hours × days_per_week × weeks_per_year */
export function annualHours({ dailyHours, daysPerWeek, weeksPerYear }) {
  return dailyHours * daysPerWeek * weeksPerYear;
}

/**
 * Linear interpolation of consumption between the breakpoints for a machine
 * type ('electric' | 'diesel') at slider value s (clamped to 50–100).
 * C = Ca + ((s − a) / (b − a)) × (Cb − Ca)
 */
export function interpolateConsumption(type, slider) {
  const pts = CONSUMPTION_BREAKPOINTS[type];
  const s = Math.max(pts[0][0], Math.min(pts[pts.length - 1][0], slider));
  for (let i = 1; i < pts.length; i++) {
    const [a, Ca] = pts[i - 1];
    const [b, Cb] = pts[i];
    if (s <= b) return Ca + ((s - a) / (b - a)) * (Cb - Ca);
  }
  return pts[pts.length - 1][1];
}

/** The operation band (Light / Normal / Heavy) for the slider label. Upper
 *  boundary wins: 65 → Normal, 85 → Heavy. */
export function operationBand(slider) {
  const s = Math.max(50, Math.min(100, slider));
  if (s < OPERATION_BANDS[1].min) return OPERATION_BANDS[0];
  if (s < OPERATION_BANDS[2].min) return OPERATION_BANDS[1];
  return OPERATION_BANDS[2];
}

/** Diesel fuel-theft multiplier θ for the selected control level. */
export function theftTheta(inputs) {
  const level = FUEL_THEFT_LEVELS.find((l) => l.id === inputs.fuelTheftLevel);
  return (level ?? FUEL_THEFT_LEVELS[1]).theta;
}

export function applyVat(value, inputs) {
  return inputs?.vatInclusive ? value * (1 + CALC_DEFAULTS.vatRate) : value;
}

/**
 * Year-0 (today's-price) per-hour cost lines for both machines from the live
 * inputs. Electricity is ALWAYS counted for the electric machine; diesel fuel
 * (and its theft uplift) is dropped when fuel is not included in the rate;
 * diesel routine service (R29/h) is ALWAYS counted.
 */
export function perHourCosts(inputs) {
  const cElec = interpolateConsumption('electric', inputs.operationSlider);
  const cDiesel = interpolateConsumption('diesel', inputs.operationSlider);
  const theta = theftTheta(inputs);
  const includeFuel = inputs.fuelIncludedInRate;

  const elecEnergyPerH = cElec * inputs.electricityPrice;
  const dieselFuelPerH = includeFuel ? cDiesel * inputs.dieselPrice * (1 + theta) : 0;
  const dieselServicePerH = DIESEL_SERVICE.ratePerHour;

  return {
    cElec,
    cDiesel,
    theta,
    includeFuel,
    elecEnergyPerH,
    elecMaintPerH: 0, // electric has no mechanical service line
    elecPerH: elecEnergyPerH,
    dieselFuelPerH,
    dieselServicePerH,
    dieselPerH: dieselFuelPerH + dieselServicePerH,
  };
}

/**
 * Builds the cumulative-TCO series for one machine over 0 → chartMaxHours,
 * for a fleet of `fleetSize` identical units (all costs scale with N).
 * Steps in Δt-year slices; escalates each slice at its midpoint year. Returns
 * points keyed by operating hours. Returns `{ series, ... }`.
 */
export function buildCostSeries({ machine, inputs, fleetSize = 1 }) {
  const H = annualHours(inputs);
  const dt = CALC_DEFAULTS.sliceYears;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const isElectric = machine.type === 'electric';
  const per = perHourCosts(inputs);
  const purchaseFleet = machine.price * fleetSize;

  // Per-hour cost at fractional year t, escalated per spec section 8.
  const perHourAt = (t) =>
    isElectric
      ? per.elecPerH * (1 + ESCALATION.electricity) ** t
      : per.dieselFuelPerH * (1 + ESCALATION.dieselFuel) ** t +
        per.dieselServicePerH * (1 + ESCALATION.maintenance) ** t;

  const series = [{ hours: 0, year: 0, cumulativeCost: applyVat(purchaseFleet, inputs) }];

  let cumRunning = 0; // per single machine
  let hours = 0;
  let k = 0;
  const guard = 200000;
  while (H > 0 && hours < maxHours - 1e-9 && k < guard) {
    const nextHours = Math.min((k + 1) * H * dt, maxHours);
    const sliceHours = nextHours - hours;
    const tMid = ((hours + nextHours) / 2) / H; // midpoint year of this slice
    cumRunning += perHourAt(tMid) * sliceHours;
    hours = nextHours;
    k += 1;
    const raw = purchaseFleet + cumRunning * fleetSize;
    series.push({ hours, year: hours / H, cumulativeCost: applyVat(raw, inputs) });
  }

  const runningTotalAtMax = cumRunning; // per single machine, 0 → maxHours
  return {
    machine,
    series,
    hoursPerYear: H,
    perHour: per,
    runningTotalAtMax: applyVat(runningTotalAtMax, inputs),
    tcoAtMax: series[series.length - 1]?.cumulativeCost ?? applyVat(purchaseFleet, inputs),
    purchaseFleet: applyVat(purchaseFleet, inputs),
    fleetSize,
  };
}

/** Cumulative cost at an arbitrary operating-hours point, linearly
 *  interpolated between the series' breakpoints. */
export function cumulativeCostAtHours(series, hours) {
  if (!series.length) return null;
  if (hours <= series[0].hours) return series[0].cumulativeCost;
  for (let i = 1; i < series.length; i++) {
    if (series[i].hours >= hours) {
      const span = series[i].hours - series[i - 1].hours;
      const frac = span === 0 ? 0 : (hours - series[i - 1].hours) / span;
      return series[i - 1].cumulativeCost + frac * (series[i].cumulativeCost - series[i - 1].cumulativeCost);
    }
  }
  return series[series.length - 1].cumulativeCost;
}

/** Savings(x) = TCO_diesel(x) − TCO_electric(x). */
export function savingsAtHours(electricSeries, dieselSeries, hours) {
  const e = cumulativeCostAtHours(electricSeries, hours);
  const d = cumulativeCostAtHours(dieselSeries, hours);
  if (e == null || d == null) return null;
  return d - e;
}

/**
 * Smallest operating-hours point where Savings(x) ≥ 0 (electric TCO first
 * meets/undercuts diesel TCO). Both series share the same hour breakpoints,
 * so we scan them in step. Returns null if it never happens within the chart.
 */
export function findBreakevenHours(electricSeries, dieselSeries) {
  const xs = [...new Set([...electricSeries.map((p) => p.hours), ...dieselSeries.map((p) => p.hours)])].sort((a, b) => a - b);
  let prevDiff = null;
  let prevX = null;
  for (const x of xs) {
    const savings = savingsAtHours(electricSeries, dieselSeries, x);
    if (savings == null) continue;
    if (savings >= 0 && prevDiff == null) return x; // already non-negative at the first point
    if (prevDiff != null && prevDiff < 0 && savings >= 0) {
      const span = x - prevX;
      const frac = savings - prevDiff === 0 ? 0 : -prevDiff / (savings - prevDiff);
      return prevX + frac * span;
    }
    prevDiff = savings;
    prevX = x;
  }
  return null;
}

/**
 * The single hour (interpolated) where two total-cost lines cross — the point
 * where the sign of (costB − costA) flips — or null if they never cross
 * within the series (including two lines that only differ by a constant, e.g.
 * the two diesel brake variants). Direction-agnostic: this is THE one
 * crossover event every view (comparison text, chart marker, print) must
 * share, per the model's "at most one crossover between two machines".
 */
export function findCrossoverHours(seriesA, seriesB) {
  const xs = [...new Set([...seriesA.map((p) => p.hours), ...seriesB.map((p) => p.hours)])].sort((a, b) => a - b);
  let prevDiff = null;
  let prevX = null;
  for (const x of xs) {
    const a = cumulativeCostAtHours(seriesA, x);
    const b = cumulativeCostAtHours(seriesB, x);
    if (a == null || b == null) continue;
    const diff = b - a;
    if (prevDiff != null && ((prevDiff < 0 && diff >= 0) || (prevDiff > 0 && diff <= 0))) {
      const span = x - prevX;
      const frac = diff - prevDiff === 0 ? 0 : -prevDiff / (diff - prevDiff);
      return prevX + frac * span;
    }
    prevDiff = diff;
    prevX = x;
  }
  return null;
}

/**
 * The intuitive year-0 breakeven: capital price gap ÷ year-0 hourly saving.
 * A sanity-check companion to the fuller escalated breakeven.
 */
export function simpleBreakevenHours({ electricPrice, dieselPrice, per }) {
  const priceGap = electricPrice - dieselPrice;
  const hourlyGap = per.dieselPerH - per.elecPerH;
  if (hourlyGap <= 0) return null;
  return priceGap / hourlyGap;
}

/**
 * Escalated (declining) battery-replacement lump sum at its landing year, for
 * a given electric machine (defaults to the first electric model on file).
 */
export function batteryReplacementProjection(inputs, machine) {
  const electric = machine ?? ALL_MODELS.find((m) => m.type === 'electric');
  if (!electric?.batteryReplacement) return null;
  const H = annualHours(inputs);
  const { atHours, baseCost } = electric.batteryReplacement;
  const year = H > 0 ? atHours / H : null;
  const escalatedCost = year == null ? baseCost : baseCost * (1 + ESCALATION.batteryReplacement) ** year;
  return { atHours, baseCost, year, escalatedCost, rate: ESCALATION.batteryReplacement };
}

// ---------------------------------------------------------------------------
// Multi-select model
// ---------------------------------------------------------------------------

/** A machine's own year-0 total cost per hour, picking the right side of the
 *  shared per-hour object by machine type. */
export function totalPerHourFor(result) {
  return result.machine.type === 'electric' ? result.perHour.elecPerH : result.perHour.dieselPerH;
}

/** Canonicalise a selection of model ids to display order, dropping anything
 *  unknown. Never returns an empty list (falls back to the default models). */
export function orderedSelection(modelIds) {
  return orderedModelIds(modelIds);
}

/**
 * Year-0 "simple" break-even between a hero machine (higher capital, lower
 * running) and one opponent: hero's capital premium ÷ hero's hourly saving.
 * Returns null when the hero has no capital premium to repay or no hourly
 * advantage — with the neutral hero either side can hold either edge.
 */
export function simpleBreakevenBetween(hero, opponent) {
  const priceGap = hero.machine.price - opponent.machine.price;
  const hourlyGap = totalPerHourFor(opponent) - totalPerHourFor(hero);
  if (priceGap <= 0 || hourlyGap <= 0) return null;
  return priceGap / hourlyGap;
}

/**
 * Piecewise "who is cheaper" segments along 0 → maxHours, for the two-colour
 * comparison time bar. Returns [{ uid, from, to }] in order; each boundary is
 * the exact crossover hour between the adjacent segments' machines, so the
 * bar's colour-change point IS the crossover shown everywhere else. A single
 * machine yields one full-width segment.
 */
export function cheaperSegments(machines, maxHours) {
  if (!machines.length) return [];
  if (machines.length === 1) return [{ uid: machines[0].machine.uid, from: 0, to: maxHours }];

  const xs = [...new Set(machines.flatMap((m) => m.series.map((p) => p.hours)))]
    .filter((x) => x <= maxHours)
    .sort((a, b) => a - b);
  if (xs[xs.length - 1] < maxHours) xs.push(maxHours);

  const cheapestAt = (x) => machines.reduce((best, m) =>
    (cumulativeCostAtHours(m.series, x) < cumulativeCostAtHours(best.series, x) ? m : best), machines[0]);

  const segments = [];
  let current = cheapestAt(0);
  let from = 0;
  for (const x of xs) {
    const now = cheapestAt(x);
    if (now.machine.uid !== current.machine.uid) {
      // Boundary = the exact crossover between the outgoing and incoming lines.
      const cross = findCrossoverHours(current.series, now.series);
      const boundary = cross != null && cross > from && cross <= x ? cross : x;
      segments.push({ uid: current.machine.uid, from, to: boundary });
      current = now;
      from = boundary;
    }
  }
  segments.push({ uid: current.machine.uid, from, to: maxHours });
  return segments;
}

/**
 * Runs the full selected SET of machines. Each selected option becomes its own
 * cost series (fleet size applies per machine). Framing is NEUTRAL: the
 * machine with the lowest total cost of ownership at the user-chosen
 * comparison window (`inputs.comparisonWindowHours`, default = the chart
 * limit) anchors every comparison — electric or diesel, whichever is cheaper.
 * For each other machine it returns its cost gap at the window and the single
 * crossover hour between the two total-cost lines, with the direction the
 * cheapest machine's lead runs ('gains' = cheaper from X onward, 'loses' =
 * cheaper until X, null = cheaper across the whole range / no crossing).
 * Savings / crossover outputs are produced ONLY when 2+ machines are selected.
 */
export function runSelection({ inputs, fleetSize = 1 }) {
  const selected = orderedSelection(inputs.machineModelIds);
  const machines = selected.map((modelId) =>
    buildCostSeries({ machine: getModelById(modelId), inputs, fleetSize }));

  const electricSelected = machines.some((m) => m.machine.type === 'electric');

  // The comparison window (0 → chart limit). Every window-dependent figure —
  // totals, the cheapest call, gaps, crossover text — derives from this.
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const rawWindow = Number(inputs.comparisonWindowHours);
  const windowHours = Number.isFinite(rawWindow)
    ? Math.max(0, Math.min(maxHours, rawWindow))
    : maxHours;

  machines.forEach((m) => { m.tcoAtWindow = cumulativeCostAtHours(m.series, windowHours); });

  // Cheapest total cost of ownership at the window anchors the comparison.
  const cheapestIndex = machines.reduce(
    (best, m, i, arr) => (m.tcoAtWindow < arr[best].tcoAtWindow ? i : best), 0);
  const hero = machines[cheapestIndex];

  const hasComparison = machines.length >= 2;

  const comparisons = hasComparison
    ? machines
        .map((result, index) => ({ result, index }))
        .filter(({ index }) => index !== cheapestIndex)
        .map(({ result }) => {
          const crossoverHours = findCrossoverHours(hero.series, result.series);
          // Price gap at hour 0 tells which side of the crossover the cheapest
          // machine started on: more expensive at 0 → it GAINS the lead at the
          // crossover; cheaper at 0 → it LOSES the lead there.
          const diffAtZero = result.series[0].cumulativeCost - hero.series[0].cumulativeCost;
          return {
            machine: result.machine,
            result,
            // True when this machine runs at exactly the cheapest machine's
            // cost per hour (e.g. the two SYL956H5 brake variants, which
            // differ ONLY in price) — crossover framing is meaningless there,
            // so the views compare on the price gap instead.
            sameRunningCosts: totalPerHourFor(result) === totalPerHourFor(hero),
            priceGapFleet: result.purchaseFleet - hero.purchaseFleet,
            crossoverHours,
            crossoverDirection: crossoverHours == null ? null : (diffAtZero < 0 ? 'gains' : 'loses'),
            gapAtWindow: result.tcoAtWindow - hero.tcoAtWindow,
            simpleBreakevenHours: simpleBreakevenBetween(hero, result),
          };
        })
    : [];

  return {
    machines,
    hero,
    heroMachine: hero.machine,
    heroUid: hero.machine.uid,
    comparisons,
    hasComparison,
    electricSelected,
    bestValueUid: hero.machine.uid,
    windowHours,
    windowYears: hero.hoursPerYear > 0 ? windowHours / hero.hoursPerYear : null,
    segments: cheaperSegments(machines, maxHours),
    battery: electricSelected
      ? batteryReplacementProjection(inputs, machines.find((m) => m.machine.type === 'electric')?.machine)
      : null,
    hoursPerYear: hero.hoursPerYear,
    fleetSize,
  };
}
