/**
 * Calculation engine.
 * Pure functions only: everything here takes machine config (from
 * src/data/machinesConfig.js) and customer inputs, and returns numbers.
 * No component or React state should duplicate this math.
 *
 * Financial model: running costs (energy + maintenance) escalate annually
 * (compounding, sampled monthly for a smooth curve). Lifecycle events
 * (battery replacement / engine overhaul) are lump sums escalated or
 * de-escalated to the cost level of the exact fractional year they land in,
 * landing as a genuine sharp vertical step at that precise point in time.
 */

import { ONE_TIME_COSTS, DIESEL_OVERHAUL, CALC_DEFAULTS, ESCALATION } from '../data/machinesConfig';

const MONTHS_PER_YEAR = 12;

export function annualHours({ dailyHours, daysPerWeek, weeksPerYear }) {
  return dailyHours * daysPerWeek * weeksPerYear;
}

/** rate = heavy% x heavy_rate + light% x light_rate */
export function blendedConsumptionRate(machine, heavyPct) {
  const heavyFrac = heavyPct / 100;
  const lightFrac = 1 - heavyFrac;
  return machine.consumption.heavy * heavyFrac + machine.consumption.light * lightFrac;
}

/**
 * Maintenance cost/year is given at two anchor points (2,000 h/yr and
 * 3,000 h/yr) and scales linearly between/beyond them. Returns null when
 * the machine has no maintenance data yet (pending dealer quote).
 */
export function annualMaintenanceCost(machine, hours) {
  const { at2000, at3000 } = machine.maintenance;
  if (at2000 == null || at3000 == null) return null;
  const slopePerHour = (at3000 - at2000) / 1000;
  return at2000 + slopePerHour * (hours - 2000);
}

export function annualEnergyCost(machine, heavyPct, hours, pricePerUnit) {
  return blendedConsumptionRate(machine, heavyPct) * hours * pricePerUnit;
}

/**
 * Determines whether energy (fuel/electricity) cost should count toward the
 * comparison at all: if it's a tender job and fuel is excluded from the
 * customer's cost calc, energy cost is irrelevant to them.
 */
export function shouldIncludeFuelCost({ isTenderJob, fuelIncludedInTender }) {
  if (!isTenderJob) return true;
  return fuelIncludedInTender;
}

export function chargersNeeded(fleetSize) {
  return Math.ceil(fleetSize / CALC_DEFAULTS.chargingPortsPerCharger);
}

export function applyVat(value, inputs) {
  return inputs?.vatInclusive ? value * (1 + CALC_DEFAULTS.vatRate) : value;
}

/** Fractional-year times (within horizon) at which a lifecycle event
 *  (battery replacement / engine overhaul) lands, based on the machine's
 *  real hours/year — not a fixed year. */
export function eventTimes(hoursPerYear, intervalHours, horizonYears) {
  if (!hoursPerYear || !intervalHours) return [];
  const times = [];
  let k = 1;
  while (true) {
    const t = (k * intervalHours) / hoursPerYear;
    if (t > horizonYears) break;
    times.push(t);
    k += 1;
  }
  return times;
}

/** Escalates (or de-escalates, for negative rates) a lump-sum cost to the
 *  price level of the year it lands in. */
export function escalatedEventCost(baseCost, rate, eventYear) {
  return baseCost * (1 + rate) ** eventYear;
}

/**
 * Precomputes cumulative running-cost (energy + maintenance, per single
 * machine, pre-fleet-scaling) at each month boundary, with the escalation
 * rate stepping up once per full year elapsed. Cost accrues linearly within
 * a month (rate is constant inside a month), so any fractional-year point
 * can be read off exactly via linear interpolation between month boundaries.
 */
function buildMonthlyRunningCost({ monthlyEnergyBase, energyRate, monthlyMaintenanceBase, maintenanceRate, horizonYears }) {
  const totalMonths = Math.round(horizonYears * MONTHS_PER_YEAR);
  const cumulative = new Array(totalMonths + 1);
  cumulative[0] = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const yearIndex = Math.floor((m - 1) / MONTHS_PER_YEAR);
    const energy = monthlyEnergyBase * (1 + energyRate) ** yearIndex;
    const maintenance = monthlyMaintenanceBase * (1 + maintenanceRate) ** yearIndex;
    cumulative[m] = cumulative[m - 1] + energy + maintenance;
  }
  return cumulative;
}

function runningCostAt(t, cumulativeMonthly) {
  const totalMonths = cumulativeMonthly.length - 1;
  const mFloat = t * MONTHS_PER_YEAR;
  const mLow = Math.min(Math.floor(mFloat), totalMonths);
  const mHigh = Math.min(mLow + 1, totalMonths);
  const frac = mLow >= totalMonths ? 0 : mFloat - mLow;
  return cumulativeMonthly[mLow] + frac * (cumulativeMonthly[mHigh] - cumulativeMonthly[mLow]);
}

/**
 * Builds the cumulative-cost-per-year series for one machine, for a fleet of
 * `fleetSize` identical units. Capital, energy, maintenance and lifecycle
 * event costs all scale with fleet size. Charging infrastructure does not
 * scale 1:1 — one charger (2 guns) serves 2 machines (2 ports each), so
 * chargersNeeded = ceil(N / 2).
 */
export function buildCostSeries({ machine, inputs, horizonYears, fleetSize = 1 }) {
  const hours = annualHours(inputs);
  const isElectric = machine.type === 'electric';
  const includeFuelCost = shouldIncludeFuelCost(inputs);

  const pricePerUnit = isElectric
    ? (inputs.energySource === 'solar' ? ONE_TIME_COSTS.solarEffectivePricePerKWh : inputs.electricityPrice)
    : inputs.dieselPrice;

  const maintenance = annualMaintenanceCost(machine, hours);
  const maintenanceUnknown = maintenance == null;
  const maintenanceAnnual = maintenance ?? 0;

  const energyAnnual = includeFuelCost
    ? annualEnergyCost(machine, inputs.operationMixHeavyPct, hours, pricePerUnit)
    : 0;

  const annualTotalCost = energyAnnual + maintenanceAnnual; // per single machine, year-1 base rate
  const capitalTotal = machine.machineCost * fleetSize;

  const needed = chargersNeeded(fleetSize);
  let oneTimeInfra = 0;
  let intervalHours;
  let eventBaseCost;
  let eventRate;

  if (isElectric) {
    if (!inputs.chargingInfraInstalled) {
      oneTimeInfra = inputs.energySource === 'solar'
        ? ONE_TIME_COSTS.solarSystemInstallCost * fleetSize
        : ONE_TIME_COSTS.chargerInstallCost * needed;
    }
    intervalHours = machine.battery.lifeHours;
    eventBaseCost = machine.battery.replacementCost;
    eventRate = ESCALATION.batteryReplacement;
  } else {
    intervalHours = DIESEL_OVERHAUL.intervalHours;
    eventBaseCost = DIESEL_OVERHAUL.cost;
    eventRate = ESCALATION.dieselOverhaul;
  }

  const energyRate = isElectric ? ESCALATION.electricityPrice : ESCALATION.dieselPrice;
  const maintenanceRate = ESCALATION.maintenance;

  const cumulativeMonthly = buildMonthlyRunningCost({
    monthlyEnergyBase: energyAnnual / MONTHS_PER_YEAR,
    energyRate,
    monthlyMaintenanceBase: maintenanceAnnual / MONTHS_PER_YEAR,
    maintenanceRate,
    horizonYears,
  });

  const rawEvents = eventTimes(hours, intervalHours, horizonYears);
  const events = rawEvents.map((year) => {
    const escalated = escalatedEventCost(eventBaseCost, eventRate, year);
    return { year, baseCost: eventBaseCost, escalatedCost: escalated, rate: eventRate, fleetCost: escalated * fleetSize };
  });

  // Grid: one point per month (smooth escalation curve) plus exact
  // before/after straddle points at each event's true fractional year, so
  // the jump renders as a genuine sharp vertical step, not a fixed year.
  const EPS = Math.min(0.0005, horizonYears / 10000 || 0.0005);
  const totalMonths = Math.round(horizonYears * MONTHS_PER_YEAR);
  const xsSet = new Set();
  for (let m = 0; m <= totalMonths; m++) xsSet.add(m / MONTHS_PER_YEAR);
  events.forEach((e) => {
    xsSet.add(Math.max(0, e.year - EPS));
    xsSet.add(Math.min(horizonYears, e.year + EPS));
  });
  const xs = [...xsSet].sort((a, b) => a - b);

  const series = xs.map((t) => {
    const running = runningCostAt(t, cumulativeMonthly) * fleetSize;
    const eventsCost = events.reduce((sum, e) => (e.year <= t + 1e-9 ? sum + e.fleetCost : sum), 0);
    const raw = capitalTotal + oneTimeInfra + running + eventsCost;
    return { year: t, cumulativeCost: applyVat(raw, inputs) };
  });

  return {
    series,
    events,
    eventBaseCost,
    eventRate,
    eventLabel: isElectric ? 'Battery replacement' : 'Engine overhaul',
    annualEnergyCost: applyVat(energyAnnual, inputs), // per-machine, year-1 base rate
    annualMaintenanceCost: applyVat(maintenanceAnnual, inputs), // per-machine, year-1 base rate
    annualTotalCost: applyVat(annualTotalCost, inputs), // per-machine, year-1 base rate
    annualRunningTotal: applyVat(annualTotalCost * fleetSize, inputs), // fleet-wide, year-1 base rate
    capitalTotal: applyVat(capitalTotal, inputs), // fleet-wide
    maintenanceUnknown,
    oneTimeYear0: applyVat(oneTimeInfra, inputs),
    hours,
    includeFuelCost,
    fleetSize,
    chargersNeeded: needed,
  };
}

/**
 * Cumulative cost at an arbitrary (possibly fractional) year, linearly
 * interpolated between the series' breakpoints. Returns null if the
 * requested year is beyond the series' range.
 */
export function cumulativeCostAtYear(series, year) {
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1].year <= year && series[i].year >= year) {
      const span = series[i].year - series[i - 1].year;
      const frac = span === 0 ? 0 : (year - series[i - 1].year) / span;
      return series[i - 1].cumulativeCost + frac * (series[i].cumulativeCost - series[i - 1].cumulativeCost);
    }
  }
  return null;
}

/**
 * Finds the fractional-year point where the electric series first drops
 * below (and stays at/below) the diesel series. Merges both series'
 * breakpoints so every sub-interval checked is genuinely linear on both
 * sides, making the crossing point exact rather than approximated.
 * Returns null if it never happens within the horizon.
 */
export function findBreakeven(electricSeries, dieselSeries) {
  const xs = [...new Set([...electricSeries.map((p) => p.year), ...dieselSeries.map((p) => p.year)])].sort((a, b) => a - b);

  let prevDiff = null;
  let prevX = null;
  for (const x of xs) {
    const e = cumulativeCostAtYear(electricSeries, x);
    const d = cumulativeCostAtYear(dieselSeries, x);
    if (e == null || d == null) continue;
    const diff = e - d;
    if (prevDiff != null && prevDiff > 0 && diff <= 0) {
      const span = x - prevX;
      const frac = span === 0 ? 0 : prevDiff / (prevDiff - diff);
      return prevX + frac * span;
    }
    prevDiff = diff;
    prevX = x;
  }
  return null;
}

/** Whichever machine has the lowest cumulative cost at a given point in time. */
export function cheapestAtYear(results, year) {
  let best = null;
  results.forEach((r) => {
    const cost = cumulativeCostAtYear(r.series, year);
    if (cost == null) return;
    if (!best || cost < best.cost) best = { cost, machine: r.machine, result: r };
  });
  return best;
}

/**
 * Every machine's lifecycle events out to `horizonYears` (independent of the
 * chart's display horizon — used for long-range lifecycle planning), for the
 * "Lifecycle Events" table: one row per chronological occurrence, grouping
 * machines that land on the same event in the same year.
 */
export function buildLifecycleTable({ electricMachine, dieselMachines, inputs, horizonYears }) {
  const hours = annualHours(inputs);
  const allMachines = [electricMachine, ...dieselMachines];

  const perMachineEvents = allMachines.map((machine) => {
    const isElectric = machine.type === 'electric';
    const intervalHours = isElectric ? machine.battery.lifeHours : DIESEL_OVERHAUL.intervalHours;
    const label = isElectric ? 'Battery replacement' : 'Engine overhaul';
    const years = eventTimes(hours, intervalHours, horizonYears);
    return { machine, label, years };
  });

  // Flatten to individual (machine, label, year) rows, then merge rows that
  // share the same event label and land within a rounding tolerance of the
  // same year (all diesel machines share the same hours/interval, so they
  // land exactly together).
  const flat = [];
  perMachineEvents.forEach(({ machine, label, years }) => {
    years.forEach((year) => flat.push({ machine, label, year }));
  });
  flat.sort((a, b) => a.year - b.year || a.label.localeCompare(b.label));

  const rows = [];
  flat.forEach((item) => {
    const existing = rows.find(
      (r) => r.label === item.label && Math.abs(r.year - item.year) < 0.05 && !r.byMachine[item.machine.id]
    );
    if (existing) {
      existing.byMachine[item.machine.id] = item.year;
    } else {
      rows.push({ label: item.label, year: item.year, byMachine: { [item.machine.id]: item.year } });
    }
  });

  return { machines: allMachines, rows };
}

/**
 * Runs the electric machine against every selected diesel comparator.
 * Automatically extends the horizon (up to CALC_DEFAULTS.horizonYearsMax)
 * if no breakeven is found within the default window.
 */
export function runComparison({ electricMachine, dieselMachines, inputs, fleetSize = 1 }) {
  const tryHorizon = (horizonYears) => {
    const electric = buildCostSeries({ machine: electricMachine, inputs, horizonYears, fleetSize });
    const comparators = dieselMachines.map((machine) => {
      const result = buildCostSeries({ machine, inputs, horizonYears, fleetSize });
      const breakeven = findBreakeven(electric.series, result.series);
      return { machine, ...result, breakeven };
    });
    return { electric, comparators, horizonYears };
  };

  let result = tryHorizon(CALC_DEFAULTS.horizonYears);
  const anyBreakevenFound = result.comparators.some((c) => c.breakeven != null);
  if (!anyBreakevenFound && CALC_DEFAULTS.horizonYearsMax > CALC_DEFAULTS.horizonYears) {
    result = tryHorizon(CALC_DEFAULTS.horizonYearsMax);
  }
  return { ...result, fleetSize };
}
