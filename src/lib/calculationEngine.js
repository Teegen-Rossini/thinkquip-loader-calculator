/**
 * Calculation engine.
 * Pure functions only: everything here takes config (from
 * src/data/machinesConfig.js) plus customer inputs, and returns numbers.
 * No component or React state should duplicate this math.
 *
 * Model (spec sections 4-10):
 *  - The x-axis is OPERATING HOURS, 0 → 20,000 h.
 *  - Consumption is interpolated continuously from the operation slider.
 *  - Cumulative cost is built by stepping in Δt = 0.25-year time slices; each
 *    slice spans H·Δt hours and is escalated at its midpoint year.
 *  - Diesel: fuel (× (1+θ) theft, only if fuel is included) + R29/h routine
 *    service. Electric: electricity only (always counted); no service line.
 *  - Battery replacement lands at 30,000 h — BEYOND the chart, so it is never
 *    plotted; it is surfaced separately with its calendar year 30,000 / H.
 */

import {
  ELECTRIC_MACHINE,
  CONSUMPTION_BREAKPOINTS,
  OPERATION_BANDS,
  FUEL_THEFT_LEVELS,
  DIESEL_SERVICE,
  ESCALATION,
  CALC_DEFAULTS,
  getDieselMachineForOption,
} from '../data/machinesConfig';

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
 * The intuitive year-0 breakeven: capital price gap ÷ year-0 hourly saving.
 * A sanity-check companion to the fuller escalated breakeven.
 */
export function simpleBreakevenHours({ electricPrice, dieselPrice, per }) {
  const priceGap = electricPrice - dieselPrice;
  const hourlyGap = per.dieselPerH - per.elecPerH;
  if (hourlyGap <= 0) return null;
  return priceGap / hourlyGap;
}

/** Escalated (declining) battery-replacement lump sum at its landing year. */
export function batteryReplacementProjection(inputs) {
  const H = annualHours(inputs);
  const { atHours, baseCost } = ELECTRIC_MACHINE.batteryReplacement;
  const year = H > 0 ? atHours / H : null;
  const escalatedCost = year == null ? baseCost : baseCost * (1 + ESCALATION.batteryReplacement) ** year;
  return { atHours, baseCost, year, escalatedCost, rate: ESCALATION.batteryReplacement };
}

/**
 * Runs the electric machine against the selected diesel variant. Returns both
 * cost series, the escalated breakeven (hours), the simple year-0 breakeven
 * and the battery-replacement projection.
 */
export function runComparison({ inputs, fleetSize = 1 }) {
  const electricMachine = ELECTRIC_MACHINE;
  const dieselMachine = getDieselMachineForOption(inputs.machineOption);

  const electric = buildCostSeries({ machine: electricMachine, inputs, fleetSize });
  const diesel = buildCostSeries({ machine: dieselMachine, inputs, fleetSize });

  const breakevenHours = findBreakevenHours(electric.series, diesel.series);
  const per = electric.perHour;
  const simpleBreakeven = simpleBreakevenHours({
    electricPrice: electricMachine.price,
    dieselPrice: dieselMachine.price,
    per,
  });
  const battery = batteryReplacementProjection(inputs);

  return {
    electricMachine,
    dieselMachine,
    electric,
    diesel,
    breakevenHours,
    simpleBreakevenHours: simpleBreakeven,
    battery,
    hoursPerYear: electric.hoursPerYear,
    fleetSize,
  };
}
