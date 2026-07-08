# CLAUDE.md

Guidance for working in this repository.

## What this is

The **ThinkQuip SANY Electric Loader Savings Calculator** — an in-person sales
tool. A salesperson enters a customer's operating parameters; the app produces a
cost comparison arguing for the **SANY SW956E electric wheel loader** vs. the
**SANY SYL956H5 diesel** loader, backed by the customer's own numbers. The
cumulative **cost-over-operating-hours** chart with the crossover (breakeven)
point is the centerpiece.

The tool models **one SANY family in two forms** — the SW956E electric loader
and the SYL956H5 diesel loader (dry or wet brake, which changes only the diesel
price). The user **multi-selects** any combination of the three options
(`electric`, `diesel-dry`, `diesel-wet`) to compare; the electric machine is the
"hero" that savings/breakeven are measured against. There are **no competitor
machines** (CAT / Komatsu / Volvo were removed), **no solar**, **no tender
logic**, and **no separate charging-infrastructure cost** (the charger is
included in the electric price).

ThinkQuip owns the tool and is an **authorized SANY distributor**; this is
surfaced as co-branding in the sticky header and the print cover. Brand roles
are kept distinct: **SANY red** for SANY machine identity/marks, **ThinkQuip
turquoise** for the tool's own chrome (header, nav) with **yellow** primary CTAs.

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
- **`src/components/MachineName.jsx`** — renders a machine's name in a condensed
  industrial face (Saira Condensed, a free stand-in — **not** SANY's real font),
  with the leading brand word "SANY" swapped for the transparent SANY logo mark.
  Use this everywhere a machine name is shown.
- **`src/components/PageNav.jsx`** — the per-page previous/next (and final print)
  navigation footer; identical sizing/positions on every tab.
- **`src/components/`** — the tabbed UI (see flow below), each with a colocated
  `.css` file. Machine imagery uses the background-removed cutouts in
  `src/thinkquip-assets-v3/machines-cutout/`; the SANY logo is in
  `src/thinkquip-assets-v3/logos-transparent/`.
- **`src/App.jsx`** — top-level state, tab routing, wires inputs → engine → views.
  The turquoise header + white tab strip are wrapped in a **sticky** `.app-topbar`
  so they persist across scroll and tab switches.

## App flow

Landing `Dashboard` → then a tab bar: **01 Inputs** → **02 Comparison** →
**03 Cost Over Time** → **04 Calculations** → **05 Spec Sheet**. Note: `activeTab`
initializes to `'dashboard'`, which is intentionally **not** a member of the
`TABS` array — the dashboard is a separate landing view rendered outside the tab
bar. Keep that in mind before touching navigation.

Every tab carries a `PageNav` footer: a yellow **NEXT** button bottom-right and
(except Inputs) a yellow **PREVIOUS** button bottom-left, all identical size. The
Spec Sheet's next slot is replaced by a turquoise **PRINT / SAVE AS PDF** button
(same action as the header button). The Dashboard's five "how it works" tiles
mirror the five tabs.

Customer inputs are persisted to `localStorage` under
`thinkquip-loader-calc-draft-v2` and restored on load (a legacy single-select
`machineOption` draft is migrated to the `machineOptions` array on read).

## Inputs

- **Machine options** (`machineOptions`, an **array**): any combination of
  `electric`, `diesel-dry`, `diesel-wet` (one, two or all three; at least one is
  enforced). Each selected option becomes its own priced machine instance with a
  unique `uid` — so selecting **both** diesel variants yields two distinct
  lines/cards. Wet vs dry brake changes **only the diesel purchase price** (dry
  R1,850,000, wet R2,200,000; electric fixed R3,150,000, charger included). The
  selectable options and every downstream view show the machine's cutout image.
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
- **Selection & hero (`runSelection`):** the engine builds one cost series per
  selected option (fleet size applies **per machine**). A single **hero** anchors
  comparisons — the electric machine when selected, else the cheapest selected
  machine. For every other selected machine it returns `Savings(x) =
  TCO_other − TCO_hero`, breakeven = smallest hour where Savings ≥ 0
  (`findBreakevenHours`), and a simple year-0 breakeven (price gap ÷ hourly saving)
  as a sanity check.
- **Single-selection hides comparison:** when only one machine is selected there
  is nothing to compare, so **all** savings / breakeven / "vs" outputs are
  **hidden entirely** (not blanked or zeroed) across every tab; the machine's own
  standalone results still show. `selection.hasComparison` gates this.
- **VAT** is a display toggle (`vatInclusive`), applied at the engine's output
  boundary via `applyVat`, at the SA rate in `CALC_DEFAULTS.vatRate` (15%).

## The Calculations tab

`CalculationView` transparently shows, with the live input numbers plugged in:
global H and the four escalation formulas once, then **for each selected machine**
the slider→consumption interpolation arithmetic, its year-0 per-hour cost lines,
sampled (hour, year, cumulative) points, and (electric only) the
battery-replacement injection, ending in that machine's TCO. A final savings /
breakeven section (simple year-0 + escalated) appears **only when 2+ machines are
selected**. Figures are normalized to per-machine, ex-VAT for readability.

## Data confidence system — REMOVED

The old `'confirmed' | 'estimate' | 'unconfirmed'` confidence badges, dots and
legend (and `confidenceMeta.js`, `ConfidenceBadge`, `ConfidenceLegend`, the
`.badge` styles and the `*Confidence` config fields) have been **removed** — with
only SANY machines modelled they added no value. Do not reintroduce them.

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
