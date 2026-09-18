// Generates the chatbot's knowledge base about the calculator itself.
//
// Reads the REAL app data (src/data/machines.json) and the REAL calculation
// engine (src/lib/calculationEngine.js — imported via the loader hooks in
// knowledge-loader-hooks.mjs), and writes complete markdown summaries into
// ./content/generated/. Because every figure is read or computed from the live
// code, the chatbot's answers can never drift from what the website shows.
//
//   npm run generate-knowledge   # write the files
//   npm run ingest               # regenerates first, then embeds + upserts
//
import { register } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

register(new URL('./knowledge-loader-hooks.mjs', import.meta.url));

const config = await import('../src/data/machinesConfig.js');
const engine = await import('../src/lib/calculationEngine.js');
const machinesData = JSON.parse(
  await fs.readFile(new URL('../src/data/machines.json', import.meta.url), 'utf8'),
);

const OUT_DIR = './content/generated';

const { CALC_DEFAULTS, ESCALATION, DEFAULT_PRICES, DIESEL_SERVICE, FUEL_THEFT_LEVELS,
  OPERATION_BANDS, CONSUMPTION_BREAKPOINTS, COMPANY } = config;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const num = (n, dp = 0) =>
  Number(n).toLocaleString('en-ZA', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    .replace(/[  ]/g, ' ');
const R = (n, dp = 0) => `R${num(n, dp)}`;
const pct = (r) => `${(r * 100).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}%`;
const hrs = (n) => `${num(Math.round(n))} h`;
const withVat = (n) => n * (1 + CALC_DEFAULTS.vatRate);

// ---------------------------------------------------------------------------
// Machines, straight from machines.json (the editable source of truth)
// ---------------------------------------------------------------------------
const models = machinesData.machineTypes.flatMap((t) =>
  t.models.map((m) => ({ ...m, machineTypeName: t.displayName })));

/** Minimal machine object the engine's buildCostSeries needs. */
function engineMachine(m) {
  return {
    uid: m.id,
    type: m.energyType,
    displayName: m.displayName,
    price: m.costs.priceExVat,
    batteryReplacement: m.costs.batteryReplacement
      ? { atHours: m.costs.batteryReplacement.atHours, baseCost: m.costs.batteryReplacement.cost }
      : undefined,
  };
}

// Default inputs — mirrors DEFAULT_INPUTS in src/App.jsx.
const DEFAULT_INPUTS = {
  fuelIncludedInRate: true,
  dailyHours: 8,
  daysPerWeek: CALC_DEFAULTS.daysPerWeek,
  weeksPerYear: CALC_DEFAULTS.weeksPerYear,
  operationSlider: CALC_DEFAULTS.operationSliderDefault,
  electricityPrice: DEFAULT_PRICES.electricityPricePerKWh,
  dieselPrice: DEFAULT_PRICES.dieselPricePerLiter,
  fuelTheftLevel: 'moderate',
  vatInclusive: false,
  comparisonWindowHours: CALC_DEFAULTS.chartMaxHours,
};

// ---------------------------------------------------------------------------
// 1. Machines & prices
// ---------------------------------------------------------------------------
function specLines(m) {
  const s = m.specs;
  const lines = [];
  const add = (label, v) => { if (v !== undefined && v !== null && v !== '') lines.push(`- ${label}: ${v}`); };
  add('Operating weight', `${num(s.operatingWeightKg)} kg`);
  add('Rated payload', `${num(s.ratedPayloadKg)} kg`);
  add('Bucket capacity', `${s.bucketCapacityM3} m³`);
  add('Tyres', s.tyres);
  add('Engine', s.engine);
  add('Fuel tank', s.fuelTankL ? `${s.fuelTankL} L` : undefined);
  add('Rated consumption (spec sheet, typical heavy duty)', s.ratedConsumption ? `${s.ratedConsumption.value} ${s.ratedConsumption.unit}` : undefined);
  add('Battery capacity', s.batteryCapacityKWh ? `${s.batteryCapacityKWh} kWh` : undefined);
  add('Charger', s.chargerRatingKW ? `${s.chargerRatingKW} kW, ${s.gunsPerCharger} charge guns (included in the purchase price)` : undefined);
  add('Charge time', s.chargeTime20to80 ? `${s.chargeTime20to80}; ${s.chargeTime20to100}` : undefined);
  add('Work per charge', s.workHoursPerCharge);
  add('Battery cycle life', s.chargeCycles);
  add('Operating life', s.operatingLifeHours);
  add('Warranty', s.warrantySummary);
  return lines;
}

function machinesDoc() {
  const parts = [
    '# SANY loader models, prices and specifications (ThinkQuip savings calculator)',
    '',
    `The ThinkQuip savings calculator compares the following SANY machines. All prices are in South African Rand, excluding VAT (${pct(CALC_DEFAULTS.vatRate)} VAT can be toggled on in the tool). The two SYL956H5 diesel brake variants (dry vs wet) have identical specifications — only the selling price differs.`,
    '',
  ];
  for (const m of models) {
    const price = m.costs.priceExVat;
    parts.push(`## ${m.displayName}`, '');
    parts.push(`- Machine type: ${m.machineTypeName}${m.variant ? ` (${m.variant})` : ''}`);
    parts.push(`- Energy type: ${m.energyType}`);
    parts.push(`- Selling price: ${R(price)} excluding VAT (${R(withVat(price))} including ${pct(CALC_DEFAULTS.vatRate)} VAT)${m.energyType === 'electric' ? ' — the 320 kW charger is included in this price; there is no separate charging-infrastructure cost' : ''}`);
    parts.push(...specLines(m));
    if (m.specs.warrantyTiers?.length) {
      parts.push('- Warranty tiers:');
      for (const t of m.specs.warrantyTiers) parts.push(`  - ${t.item}: ${t.terms}`);
    }
    parts.push(`- Scheduled maintenance (SANY spec-sheet figures): ${R(m.costs.maintenancePerYearAt2000h)}/year at 2,000 h/year utilization; ${R(m.costs.maintenancePerYearAt3000h)}/year at 3,000 h/year. (These are printed spec-sheet figures — the cost model instead uses ${m.energyType === 'electric' ? 'R0/h for electric' : `R${DIESEL_SERVICE.ratePerHour}/h routine service for diesel`}.)`);
    if (m.costs.batteryReplacement) {
      parts.push(`- Battery replacement: ${R(m.costs.batteryReplacement.cost)} (today's cost) at ${hrs(m.costs.batteryReplacement.atHours)} — beyond the 15,000 h comparison chart and beyond the first owner's typical lifecycle, so it is not part of the TCO comparison and is not shown anywhere in the tool or brochure. Battery prices are projected to DECLINE ${pct(-ESCALATION.batteryReplacement)} per year, so the actual future cost is lower.`);
    }
    if (m.energyType === 'diesel') {
      parts.push('- There is no separate engine-overhaul event in the cost model — diesel engine care is the continuous routine-service line.');
    }
    parts.push('');
  }
  parts.push(`Price difference between the two diesel brake variants: ${R(models.find((m) => m.id.endsWith('wet')).costs.priceExVat - models.find((m) => m.id.endsWith('dry')).costs.priceExVat)} (wet brake costs more upfront).`);
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// 2. The financial model
// ---------------------------------------------------------------------------
function bpTable(pts, unit) {
  return pts.map(([s, c]) => `slider ${s} → ${c} ${unit}`).join('; ');
}

function financialModelDoc() {
  const theft = FUEL_THEFT_LEVELS.map((l) => `- ${l.label} (typical loss ${l.range}): diesel fuel cost is multiplied by ${(1 + l.theta).toFixed(3)} (θ = ${pct(l.theta)})`).join('\n');
  const bands = OPERATION_BANDS.map((b) => `${b.label} (${b.min}–${b.max})`).join(', ');
  return `# How the ThinkQuip savings calculator computes costs (the financial model)

The calculator produces a NEUTRAL total-cost-of-ownership (TCO) comparison: purchase price plus all running costs, plotted over OPERATING HOURS from 0 to ${num(CALC_DEFAULTS.chartMaxHours)} h (not years). The machine with the lowest TCO at the user-chosen comparison window is highlighted — that can be the electric OR a diesel machine, and the answer can flip as the window moves.

## Annual operating hours
H = daily hours × days per week × weeks per year. Defaults: ${CALC_DEFAULTS.daysPerWeek} days/week and ${CALC_DEFAULTS.weeksPerYear} weeks/year (daily hours is entered by the customer, default 8 → H = ${num(engine.annualHours(DEFAULT_INPUTS))} hours/year). Operating hours convert to calendar years as t = hours ÷ H.

## Energy consumption (the operation slider)
An operation slider from ${CALC_DEFAULTS.operationSliderMin} to ${CALC_DEFAULTS.operationSliderMax} describes how hard the machine works: ${bands}. Consumption is interpolated LINEARLY between these breakpoints:
- Electric: ${bpTable(CONSUMPTION_BREAKPOINTS.electric, 'kWh/h')}
- Diesel: ${bpTable(CONSUMPTION_BREAKPOINTS.diesel, 'L/h')}
The slider affects consumption only — never the time axis.

## Year-0 cost per operating hour
- Electric: consumption (kWh/h) × electricity price (R/kWh). Electricity is ALWAYS counted. The electric machine carries NO mechanical-service line (R0/h) — a genuine long-term advantage, not a missing value.
- Diesel: consumption (L/h) × diesel price (R/L) × (1 + θ fuel-theft uplift) + R${DIESEL_SERVICE.ratePerHour}/h routine engine service. The R${DIESEL_SERVICE.ratePerHour}/h service (R29,000 per 1,000 h) is ALWAYS counted; the fuel component is dropped entirely if the customer's rate does not include fuel. There is NO separate diesel engine-overhaul event.

## What the maintenance figure covers (differential maintenance only)
The maintenance line in the comparison is DIFFERENTIAL: it counts only the maintenance that differs between the machines — the diesel engine's routine servicing (the R${DIESEL_SERVICE.ratePerHour}/h line: oil, filters and related engine consumables). Wear-and-tear items the two machines share — tyres, bucket and ground-engaging tools, hydraulics, pins and bushes, general structural wear — cost essentially the same on either machine, so they are deliberately left out: they would add the same amount to both totals and cancel out of a head-to-head comparison, without changing the cost gap, the crossover or which machine is cheapest. That is also why the electric machine shows R0/h mechanical maintenance: it has no diesel engine to service, and everything else it shares with the diesel is excluded on both sides. If a customer asks about total maintenance or servicing costs in absolute terms (not as a comparison), explain this scope honestly — the calculator's maintenance figures are comparison figures, not a full workshop budget.

## Fuel-theft control (diesel fuel only — never electricity)
${theft}

## Price escalation (compounded annually, applied at each time-slice's midpoint year)
- Diesel fuel: +${pct(ESCALATION.dieselFuel)} per year
- Electricity: +${pct(ESCALATION.electricity)} per year
- Maintenance / diesel routine service: +${pct(ESCALATION.maintenance)} per year
- Battery replacement cost: ${pct(ESCALATION.batteryReplacement)} per year (it DECLINES — battery prices are falling)

Cumulative cost is built in ${CALC_DEFAULTS.sliceYears}-year time slices; each slice spans H × ${CALC_DEFAULTS.sliceYears} operating hours and is escalated at its midpoint year.

## Battery replacement (electric only — background knowledge, not shown in the tool)
The battery reaches replacement at 30,000 operating hours — BEYOND the ${num(CALC_DEFAULTS.chartMaxHours)} h chart and beyond the first owner's typical lifecycle, so it is never part of the plotted curve or the TCO comparison window. It is not displayed anywhere on screen or in the printed brochure; mention it only if the customer asks. If asked: today's cost is escalated (downward, since battery prices fall) to its landing year (30,000 ÷ H).

## Fleet size
Fleet size (1–${CALC_DEFAULTS.fleetSizeMax}) multiplies ALL costs — capital, energy and service — per machine. The charger is included in the electric machine's price, so there is no separate charging-infrastructure line at any fleet size.

## The comparison window and crossover
The user sets a comparison window (0 → ${num(CALC_DEFAULTS.chartMaxHours)} h) on the Comparison page — typically the customer's expected sell/replace hours. Every figure (totals, "cheapest" call, cost gaps) is evaluated at that window. Between any two machines' total-cost lines there is at most ONE crossover hour — the point where the cheaper machine changes. The same crossover value appears in the comparison text, the chart marker and the printed brochure.

## VAT
All engine figures are ex-VAT; a display toggle applies ${pct(CALC_DEFAULTS.vatRate)} South African VAT to displayed values.

## Default energy prices (PLACEHOLDERS — always confirm the customer's real rates)
- Electricity: ${R(DEFAULT_PRICES.electricityPricePerKWh, 2)}/kWh. ${DEFAULT_PRICES.electricityPriceNote}
- Diesel: ${R(DEFAULT_PRICES.dieselPricePerLiter, 2)}/L. ${DEFAULT_PRICES.dieselPriceNote}
Both are editable on the Inputs page.`;
}

// ---------------------------------------------------------------------------
// 3. Worked example at the app's default inputs, computed by the REAL engine
// ---------------------------------------------------------------------------
function workedExampleDoc() {
  const inputs = DEFAULT_INPUTS;
  const H = engine.annualHours(inputs);
  const per = engine.perHourCosts(inputs);
  const results = models.map((m) => engine.buildCostSeries({ machine: engineMachine(m), inputs, fleetSize: 1 }));
  const windows = [5000, 10000, CALC_DEFAULTS.chartMaxHours];

  const parts = [
    '# Worked example — calculator results at the default inputs',
    '',
    `Assumptions (the app's defaults; every one is adjustable on screen): ${inputs.dailyHours} h/day × ${inputs.daysPerWeek} days/week × ${inputs.weeksPerYear} weeks/year = ${num(H)} operating hours per year; operation slider ${inputs.operationSlider} (Normal); electricity ${R(inputs.electricityPrice, 2)}/kWh and diesel ${R(inputs.dieselPrice, 2)}/L (placeholder prices); fuel included in the rate; moderately controlled site (fuel-theft uplift θ = ${pct(per.theta)} on diesel fuel); fleet of 1; all figures excluding VAT.`,
    '',
    '## Year-0 running cost per operating hour',
    `- Electric SW956E: ${per.cElec.toFixed(1)} kWh/h × ${R(inputs.electricityPrice, 2)}/kWh = ${R(per.elecPerH, 2)}/h (no mechanical service).`,
    `- Diesel SYL956H5: ${per.cDiesel.toFixed(1)} L/h × ${R(inputs.dieselPrice, 2)}/L × ${(1 + per.theta).toFixed(3)} theft uplift = ${R(per.dieselFuelPerH, 2)}/h fuel, plus R${DIESEL_SERVICE.ratePerHour}/h routine service = ${R(per.dieselPerH, 2)}/h total.`,
    `- Year-0 hourly saving of electric over diesel: ${R(per.dieselPerH - per.elecPerH, 2)} per operating hour (before escalation; electricity escalates +${pct(ESCALATION.electricity)}/yr vs diesel fuel +${pct(ESCALATION.dieselFuel)}/yr).`,
    '',
    '## Cumulative total cost of ownership (purchase price + escalated running costs)',
  ];

  for (const w of windows) {
    parts.push(`At ${hrs(w)} (about ${num(w / H, 1)} years at these hours):`);
    for (const r of results) {
      parts.push(`- ${r.machine.displayName}: ${R(engine.cumulativeCostAtHours(r.series, w))}`);
    }
    parts.push('');
  }

  parts.push('## Crossover points (where the cheaper machine changes)');
  const electric = results.find((r) => r.machine.type === 'electric');
  for (const r of results.filter((x) => x.machine.type === 'diesel')) {
    const cross = engine.findCrossoverHours(electric.series, r.series);
    if (cross == null) {
      const cheaper = engine.cumulativeCostAtHours(electric.series, CALC_DEFAULTS.chartMaxHours) <
        engine.cumulativeCostAtHours(r.series, CALC_DEFAULTS.chartMaxHours) ? electric : r;
      parts.push(`- ${electric.machine.displayName} vs ${r.machine.displayName}: the lines never cross within ${hrs(CALC_DEFAULTS.chartMaxHours)}; ${cheaper.machine.displayName} is cheaper across the whole range.`);
    } else {
      parts.push(`- ${electric.machine.displayName} vs ${r.machine.displayName}: the diesel is cheaper up to ${hrs(cross)}; from ${hrs(cross)} onward (about ${num(cross / H, 1)} years at these hours) the electric machine's total cost is lower and the gap keeps widening.`);
    }
  }
  parts.push('- The two SYL956H5 brake variants have identical running costs, so their lines never cross — the wet-brake variant simply stays the fixed purchase-price gap more expensive.');
  parts.push('');

  const proj = engine.batteryReplacementProjection(inputs, engineMachine(models.find((m) => m.energyType === 'electric')));
  if (proj) {
    parts.push('## Battery replacement projection (electric — background knowledge, not shown in the tool)');
    parts.push(`At ${num(H)} h/year, the 30,000 h battery replacement lands around year ${num(proj.year, 1)}. Today's cost ${R(proj.baseCost)} declining ${pct(-proj.rate)}/year projects to about ${R(proj.escalatedCost)} at that point. This is beyond the first owner's typical lifecycle and is NOT included in the 0–${num(CALC_DEFAULTS.chartMaxHours)} h comparison or displayed anywhere in the tool.`);
  }
  parts.push('', 'Different inputs (hours, prices, slider, theft level, fleet size, VAT) change all of these figures — the website recalculates live, and the printed brochure uses whatever the user set on screen.');
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// 4. Website / app user guide
// ---------------------------------------------------------------------------
function websiteGuideDoc() {
  return `# Using the ThinkQuip SANY loader savings calculator (website guide)

The calculator is an in-person sales tool by ThinkQuip, an authorized SANY distributor. A salesperson enters a customer's own operating parameters and the tool produces a neutral cost comparison between the SANY SW956E electric wheel loader and the SANY SYL956H5 diesel wheel loader (dry- or wet-brake variant), highlighting whichever machine has the lower total cost of ownership at the chosen comparison window.

## Page flow
The landing Dashboard explains the process, then five tabs:
1. **01 Inputs** — machine selection and all customer parameters.
2. **02 Comparison** — the headline result: a 0–15,000 h comparison-window slider (its track is a two-colour bar showing which machine is cheaper along the range), a "Cheapest at X h" card, cost-gap cards for the other machines, and per-machine cards with three per-1,000 h running-cost figures (energy, mechanical maintenance, total).
3. **03 Cost Over Time** — the cumulative cost-over-operating-hours chart with the crossover marker; hovering shows each machine's total and the difference at that hour.
4. **04 Spec Sheet** — full specifications per machine.
5. **05 Calculations** — every formula shown transparently with the live numbers plugged in and plain-language explanations, ending in each machine's TCO at the window.
Yellow PREVIOUS/NEXT buttons navigate between tabs; the final tab has a PRINT / SAVE AS PDF button.

## Inputs available
- **Machine selection (multi-select):** any combination of SW956E electric, SYL956H5 diesel dry brake, and SYL956H5 diesel wet brake (at least one). Wet vs dry brake changes only the diesel purchase price.
- **Fuel included in rate (Yes/No):** "No" removes diesel fuel (and its theft uplift) from the diesel total; electricity is always counted for the electric machine, and the R29/h diesel service is always counted.
- **Operation slider (Light / Normal / Heavy):** how hard the machines work; drives energy consumption only.
- **Utilization:** hours per day (days/week and weeks/year default to 6 and 50).
- **Energy prices:** editable electricity (R/kWh) and diesel (R/L) prices, pre-filled with placeholder defaults — always confirm the customer's real rates.
- **Fuel-theft control:** low / moderate / well-monitored site — an uplift on diesel fuel cost only.
- **Fleet size (1–4):** multiplies every cost.
- **VAT toggle:** show figures including or excluding 15% VAT.
- **Comparison window (on the Comparison page):** 0–15,000 operating hours; set it to the customer's expected sell/replace hours. Every window-dependent figure on screen AND in the printed brochure follows it.

Inputs are saved in the browser (localStorage) and restored on the next visit.

## The printed brochure
"Print / Save as PDF" produces a fixed A4 brochure containing exactly the machines selected on screen: a cover page (with Prepared For / Prepared By fields and the quote date), an Inputs & Assumptions page, a Machine Comparison page (figures at the on-screen comparison window), the Cost Over Operating Hours chart with a sampled-points table, and one full spec-sheet page per selected machine. Page numbers adjust to the selection.

## Who to contact
${COMPANY.name}, ${COMPANY.address} — ${COMPANY.website}. Quotes, finance and follow-up go through the ThinkQuip salesperson using the calculator with the customer (their name and contact details appear on the printed brochure's Prepared By block).

## Honest limitations
- The default electricity and diesel prices are placeholders, not live feeds — the salesperson should enter the customer's actual rates.
- The comparison covers the two SANY machine families only; there are no competitor machines, no solar option, and no tender logic in this tool.
- The battery-replacement event (30,000 h) falls beyond the 15,000 h comparison window and is not shown anywhere in the tool or the printed brochure — but the assistant can explain it if the customer asks.`;
}

// ---------------------------------------------------------------------------
// Write everything
// ---------------------------------------------------------------------------
const docs = {
  'calculator-machines-and-prices.md': machinesDoc(),
  'calculator-financial-model.md': financialModelDoc(),
  'calculator-worked-example.md': workedExampleDoc(),
  'calculator-website-guide.md': websiteGuideDoc(),
};

await fs.mkdir(OUT_DIR, { recursive: true });
// Remove stale generated files so renames/deletions here never leave orphans.
for (const f of await fs.readdir(OUT_DIR)) {
  if (f.endsWith('.md')) await fs.rm(path.join(OUT_DIR, f));
}
for (const [name, body] of Object.entries(docs)) {
  await fs.writeFile(path.join(OUT_DIR, name), `${body}\n`, 'utf8');
  console.log(`Wrote ${OUT_DIR}/${name} (${body.length} chars)`);
}
console.log('Knowledge base generated from live machines.json + calculationEngine.js.');
