# CLAUDE.md

Guidance for working in this repository.

## What this is

The **ThinkQuip SANY Electric Loader Savings Calculator** — an in-person sales
tool. A salesperson enters a customer's operating parameters; the app produces a
cost comparison arguing for the **SANY SW956E electric wheel loader** vs. the
**SANY SYL956H5 diesel** loader, backed by the customer's own numbers. The
cumulative **cost-over-operating-hours** chart with the crossover (breakeven)
point is the centerpiece.

The tool compares **exactly two machine families** — SW956E electric vs
SYL956H5 diesel. There are **no competitor machines** (CAT / Komatsu / Volvo
were removed), **no solar**, **no tender logic**, and **no separate charging-
infrastructure cost** (the charger is included in the electric price).

Stack: **React 19 + Vite 8**, charts via **Recharts 3**, linting via **Oxlint**.
No TypeScript. No test framework is set up yet.

## Commands

```bash
npm run dev      # Vite dev server (HMR)
npm run build    # production build
npm run preview  # preview a production build
npm run lint     # oxlint
```

## Architecture & where things live

- **`src/data/machinesConfig.js`** — the single source of truth for all specs,
  prices, consumption breakpoints, escalation rates and calc defaults. **All
  figures live here and nowhere else.** As real figures firm up, update values
  here — the engine and components should not need to change.
- **`src/lib/calculationEngine.js`** — pure functions only. Takes config +
  customer inputs, returns numbers. No React state duplicates this math. If a
  calculation exists, it belongs here.
- **`src/lib/format.js`** — display formatting (currency, hours, years).
- **`src/data/confidenceMeta.js`** — metadata for the confidence-badge system
  (now used mainly for the placeholder energy prices).
- **`src/components/`** — the tabbed UI (see flow below), each with a colocated
  `.css` file.
- **`src/App.jsx`** — top-level state, tab routing, wires inputs → engine → views.

## App flow

Landing `Dashboard` → then a tab bar: **01 Inputs** → **02 Comparison** →
**03 Cost Over Time** → **04 Calculation** → **05 Spec Sheet**. Note: `activeTab`
initializes to `'dashboard'`, which is intentionally **not** a member of the
`TABS` array — the dashboard is a separate landing view rendered outside the tab
bar. Keep that in mind before touching navigation.

Customer inputs are persisted to `localStorage` under
`thinkquip-loader-calc-draft` and restored on load.

## Inputs

- **Machine option** (`machineOption`): one of three — `electric`, `diesel-dry`,
  `diesel-wet`. Both the electric and a diesel line are always compared; wet vs
  dry brake changes **only the diesel purchase price** (dry R1,850,000, wet
  R2,200,000; electric fixed R3,150,000, charger included).
- **Fuel included in rate** (`fuelIncludedInRate`): `No` drops diesel **fuel**
  cost (and its theft uplift) from the diesel total. Electricity is **always**
  counted for the electric machine; the R29/h diesel service is **always**
  counted.
- **Operation slider** (`operationSlider`, 50–100): drives **consumption only**,
  never the time axis. UI shows the band label (Light/Normal/Heavy) and the
  resulting kWh/h · L/h — never the raw percentage.
- **Utilization**: `dailyHours` × `daysPerWeek` (6) × `weeksPerYear` (50) → H.
- **Energy prices**: editable, auto-filled placeholders (`DEFAULT_PRICES`).
- **Fuel-theft control** (`fuelTheftLevel`): low/moderate/well → θ 10/3.5/1% on
  diesel fuel only.
- **Fleet size** (1–4): multiplies all costs by N.

## The financial model (important conventions)

- **X-axis is OPERATING HOURS, 0 → 20,000 h** (`CALC_DEFAULTS.chartMaxHours`),
  not years. Convert with `t(x) = x / H`.
- **Consumption is continuous.** Interpolated linearly between the breakpoints in
  `CONSUMPTION_BREAKPOINTS` (electric 20→40 kWh/h, diesel 10→16 L/h across slider
  50→100). The bands are only where the slope changes.
- **Cumulative cost is built in Δt = 0.25-year slices** (`CALC_DEFAULTS.sliceYears`);
  each slice spans `H·Δt` hours and is escalated at its **midpoint year**.
  Electric slice = C·price·(1.08)^t; diesel slice = fuel·(1.06)^t·(1+θ) +
  R29·(1.06)^t. See `buildCostSeries`.
- **Escalation is real, not flat.** Rates in `ESCALATION`: diesel fuel +6%,
  electricity +8%, maintenance/service +6%, battery replacement **−5%** (it
  declines — do not inflate it).
- **Battery replacement @ 30,000 h** (electric only, base R1,120,000, escalated
  by (0.95)^t). This is **beyond the 20,000 h chart** — it is **never plotted on
  the curve**. It is surfaced in the lifecycle/spec tables and a chart callout,
  labelled as occurring beyond the first owner's lifecycle. Its calendar year =
  30,000 / H (`batteryReplacementProjection`).
- **No diesel overhaul event.** Diesel maintenance is the continuous R29/h
  routine-service line (`DIESEL_SERVICE`), linear R29,000 @1,000h → R377,000
  @13,000h, continued at the same rate to 20,000 h. Electric carries **no
  mechanical-service line (R0/h)** — a deliberate long-term advantage to surface.
- **Fleet scaling:** every cost (capital, energy, service) scales ×N. The charger
  is included in the electric price, so there is no separate infra line.
- **Outputs:** `Savings(x) = TCO_diesel − TCO_electric`; breakeven = smallest
  hour where Savings ≥ 0 (`findBreakevenHours`); a simple year-0 breakeven
  (`simpleBreakevenHours` = price gap ÷ hourly saving) is shown alongside the
  escalated one as a sanity check.
- **VAT** is a display toggle (`vatInclusive`), applied at the engine's output
  boundary via `applyVat`, at the SA rate in `CALC_DEFAULTS.vatRate` (15%).

## The Calculation tab

`CalculationView` transparently shows, with the live input numbers plugged in:
H, the slider→consumption interpolation arithmetic, the year-0 per-hour cost
lines, the four escalation formulas, sampled (hour, year, cumulative) points, the
battery-replacement injection, and the final TCO / savings / breakeven (both the
simple year-0 and the fuller escalated figure). It normalizes figures to
per-machine, ex-VAT for readability.

## Data confidence system

Every figure carries a confidence level: `'confirmed'` | `'estimate'` |
`'unconfirmed'`. With the two-machine SANY scope, most specs are `confirmed`; the
placeholder **energy prices** are `estimate`. Preserve/set these accurately in
`machinesConfig.js`.

## Known open items

- **Placeholder prices:** electricity (R2.80/kWh) and diesel (R23.50/L) defaults
  are placeholders — no live feed wired up yet. Always confirm against the
  customer's real rates.
- **Not yet built (spec):** client-info capture/save for follow-up (POPIA
  consent), and live-ish diesel/electricity price sourcing.

## Reference

`thinkquip-electric-loader-calculator-spec.md` is the older project spec — note
that the current two-machine, hours-based model in this file (and the code)
supersedes it where they conflict. Brand colors are in `COLORS` in
`machinesConfig.js` — turquoise chrome, yellow CTA, electric line blue, diesel
line amber/yellow. Use those exact hex values.
