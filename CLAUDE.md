# CLAUDE.md

Guidance for working in this repository.

## What this is

The **ThinkQuip SANY Electric Loader Savings Calculator** — an in-person sales
tool. A salesperson enters a customer's operating parameters; the app produces a
**neutral** cost comparison between the **SANY SW956E electric wheel loader**
and the **SANY SYL956H5 diesel** loader, backed by the customer's own numbers.
It highlights whichever machine has the **lower total cost of ownership**
(purchase price + all running costs) at a **user-chosen comparison window** —
the answer can be electric OR diesel and may flip as the window moves. The
cumulative **cost-over-operating-hours** chart with the crossover point is the
centerpiece.

The tool models **one SANY family in two forms** — the SW956E electric loader
and the SYL956H5 diesel loader (dry or wet brake, which changes only the diesel
price). The user **multi-selects** any combination of the three options
(`electric`, `diesel-dry`, `diesel-wet`) to compare; the comparison anchor
("hero") is **whichever selected machine is cheapest at the window** — do NOT
hard-assume electric wins. There are **no competitor machines** (CAT / Komatsu /
Volvo were removed, including from the printed brochure), **no solar**, **no
tender logic**, and **no separate charging-infrastructure cost** (the charger is
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
- **`src/components/Print*.jsx`** — the printed brochure (see "The printed
  brochure" below). Shared primitives (A4 page shell, turquoise band, ruled spec
  rows) live in `PrintKit.jsx`; ALL print styling lives in the
  single `PrintBrochure.css`. The brochure consumes the same multi-select
  `selection` the screen uses.
- **`src/App.jsx`** — top-level state, tab routing, wires inputs → engine → views.
  The turquoise header + white tab strip are wrapped in a **sticky** `.app-topbar`
  so they persist across scroll and tab switches.

## App flow

Landing `Dashboard` → then a tab bar: **01 Inputs** → **02 Comparison** →
**03 Cost Over Time** → **04 Spec Sheet** → **05 Calculations**. Calculations is
deliberately **last** (swapped with Spec Sheet). Note: `activeTab` initializes
to `'dashboard'`, which is intentionally **not** a member of the `TABS` array —
the dashboard is a separate landing view rendered outside the tab bar. Keep that
in mind before touching navigation.

Every tab carries a `PageNav` footer: a yellow **NEXT** button bottom-right and
(except Inputs) a yellow **PREVIOUS** button bottom-left, all identical size.
The **Calculations** tab (the final page) has its next slot replaced by a
turquoise **PRINT / SAVE AS PDF** button (same action as the header button).
Nav/CTA buttons carry a subtle top-light gradient + inner highlight for depth —
texture only, never a size/position change. The header gradient runs **dark
left → light right** so the white ThinkQuip logo sits on the darker field. The
Dashboard's "how it works" tiles mirror the tab order (Calculations last).

Customer inputs are persisted to `localStorage` under
`thinkquip-loader-calc-draft-v2` and restored on load (a legacy single-select
`machineOption` draft is migrated to the `machineOptions` array on read). A
`?draft={json}` URL param overrides the inputs for that load (deep links and
print-preview generation) — while present, localStorage is neither read nor
written.

## The printed brochure

"Print / Save as PDF" (or `?printview=1`, which renders the brochure alone on
screen exactly as it prints) produces a fixed-page A4 brochure — the ONLY thing
that prints; every screen element carries `.no-print`. **The brochure renders
exactly the machines the user selected, driven by the same multi-select
`selection` the screen uses.** `PrintBrochure.jsx` assembles the page list and
computes `Page X of Y`, so page numbers stay correct whichever pages render:

1. **Cover** (`PrintCover`) — logos, customer/date fields, hero cutout, headline stats.
2. **Inputs & Assumptions** (`PrintInputsPage`) — lists every selected machine.
3. **Machine Comparison** (`PrintComparisonPage`) — one column per selected
   machine (totals at the comparison window); the neutral "Cheapest at X h"
   block with gaps and directional crossovers appears only when 2+ are
   selected. **The printed figures follow the on-screen window slider.**
4. **Cost Over Operating Hours** (`PrintTimelinePage`) — the chart re-rendered as
   **pure static SVG** (`PrintChart.jsx`, no Recharts — Recharts can't render in
   the hidden print DOM), plotting every selected series, plus a sampled-points
   table.
5. **Spec appendix** — one full page per selected machine (`PrintSpecSheet`);
   the two SYL956H5 brake variants each get their own sheet, priced and
   labelled for their brake variant.

Conventions: each `.print-page` is a fixed 296.5 mm sheet (footer pinned to the
bottom, `@page { size: A4; margin: 0 }`); design language follows ThinkQuip's
physical SANY spec sheets (turquoise bands with white bold-italic titles,
label-left/value-right ruled rows). `print-color-adjust: exact`
is set brochure-wide. Verify layout changes by loading
`?printview=1&draft={...}` and printing to PDF at fleet sizes 1 and 4, at
machine selections of one, two and all three.

## Inputs

- **Machine options** (`machineOptions`, an **array**): any combination of
  `electric`, `diesel-dry`, `diesel-wet` (one, two or all three; at least one is
  enforced). Each selected option becomes its own priced machine instance with a
  unique `uid` — so selecting **both** diesel variants yields two distinct
  lines/cards. Wet vs dry brake changes **only the diesel purchase price** (dry
  R1,850,000, wet R2,200,000; electric fixed R3,150,000, charger included). The
  selectable options and every downstream view (screen and brochure) show the
  machine's cutout image.
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
- **Comparison window** (`comparisonWindowHours`, 0 → 15,000, default 15,000):
  set by the slider on the **Comparison** page, not the Inputs tab. Drives every
  window-dependent figure on screen AND in the printed brochure (a salesman sets
  it to the customer's expected sell/replace hours, then prints).
- **Displayed decimals are rounded** (consumption readouts to whole kWh/h · L/h,
  θ to one decimal) — display only; the engine keeps full precision.

## The financial model (important conventions)

- **X-axis is OPERATING HOURS, 0 → 15,000 h** (`CALC_DEFAULTS.chartMaxHours` —
  lowered from 20,000 because most machines are sold before then), not years.
  Convert with `t(x) = x / H`.
- **Consumption is continuous.** Interpolated linearly between the breakpoints in
  `CONSUMPTION_BREAKPOINTS` (electric 20→40 kWh/h, diesel 10→16 L/h across slider
  50→100). The bands are only where the slope changes.
- **Cumulative cost is built in Δt = 0.25-year slices** (`CALC_DEFAULTS.sliceYears`);
  each slice spans `H·Δt` hours and is escalated at its **midpoint year**.
  Electric slice = C·price·(1.08)^t; diesel slice = fuel·(1.06)^t·(1+θ) +
  R29·(1.06)^t. See `buildCostSeries`.
- **Escalation is real, not flat.** Rates in `ESCALATION`: diesel fuel +6%,
  electricity +8%, maintenance/service +6%, battery replacement **−5%** (it
  declines — do not inflate it; chat-assistant knowledge only, see below).
- **Battery replacement — removed from the visible UI, kept in the chat
  assistant** (July 2026, at Michael's request). No screen tab, chart callout,
  Calculations step or printed-brochure element mentions the 30,000 h battery
  replacement — do **not** reintroduce it there. It survives ONLY in the chat
  assistant layer: the engine's `batteryReplacementProjection` and
  `selection.battery` feed `chatPageContext.js` and the generated knowledge
  base (`scripts/generate-knowledge.mjs`, `content/`), all framed as
  "background knowledge — mention only if the customer asks". Data lives in
  `machines.json` (`costs.batteryReplacement`: 30,000 h, R1,120,000).
- **No diesel overhaul event.** Diesel maintenance is the continuous R29/h
  routine-service line (`DIESEL_SERVICE`), linear R29,000 @1,000h → R377,000
  @13,000h, continued at the same rate to the chart limit. Electric carries **no
  mechanical-service line (R0/h)** — a deliberate long-term advantage to surface.
- **Fleet scaling:** every cost (capital, energy, service) scales ×N. The charger
  is included in the electric price, so there is no separate infra line.
- **Selection & the neutral hero (`runSelection`):** the engine builds one cost
  series per selected option (fleet size applies **per machine**). The **hero**
  that anchors comparisons is the machine with the **lowest TCO at the
  comparison window** (`inputs.comparisonWindowHours`) — never hard-coded to
  electric. For every other selected machine it returns `gapAtWindow`
  (TCO_other − TCO_hero at the window), the single `crossoverHours` between the
  two total-cost lines (`findCrossoverHours`) with `crossoverDirection`
  (`'gains'` = hero cheaper from X onward, `'loses'` = hero cheaper until X,
  `null` = no crossing in range), and a simple year-0 breakeven (price gap ÷
  hourly saving) as a sanity check. It also returns `segments`
  (`cheaperSegments`) — the piecewise cheapest machine along 0 → 15,000 h that
  drives the **two-colour time bar** under the window slider; the bar's colour
  change point IS the crossover hour.
- **One crossover, everywhere.** The crossover hour shown in the Comparison
  text, the chart's marker ("Savings start" / "Cheaper until"), and the print
  pages is the SAME `crossoverHours` value — never compute it twice.
- **Single-selection hides comparison:** when only one machine is selected there
  is nothing to compare, so **all** gap / crossover / "vs" outputs are
  **hidden entirely** (not blanked or zeroed) across every tab; the machine
  shows only its own total cost at the window. `selection.hasComparison` gates
  this. The time bar is then a single solid colour.
- **Wet/dry price-gap placement:** when ONLY the two diesels are selected, the
  R350,000 upfront gap is surfaced ONCE in the Comparison page's top summary —
  never repeated in the machine cards. When electric is also selected (3
  machines), the wet/dry price difference is not called out anywhere; each
  non-cheapest machine just shows its gap vs the cheapest.
- **Two-diesel shading:** the second diesel model gets a **darker yellow**
  (`COLORS.dieselAccentDark`, assigned in `machinesRepo`) so two diesel chart
  lines / bar segments stay distinguishable everywhere.
- **VAT** is a display toggle (`vatInclusive`), applied at the engine's output
  boundary via `applyVat`, at the SA rate in `CALC_DEFAULTS.vatRate` (15%).

## The Comparison page

`HeroStat` is the top summary: the **0 → 15,000 h window slider**
(`TimeWindowSlider`) whose track is the two-colour cheaper-machine bar (hours +
equivalent years shown live), a highlighted "Cheapest at X h" card, and one
card per other machine showing its cost gap at the window and the directional
crossover ("cheaper from X h onward" / "cheaper until X h"). Below it, each
`ComparatorCard` shows exactly **three per-1,000 h figures** — Cost of energy
("(Electricity)" / "(Diesel)"), Mechanical maintenance ("(None needed)" /
"(Mechanical service line)"), and Running cost laid out as their **tally** (a
ruled "=" total row) — plus the price header and the expandable spec details.
No savings/crossover info lives in the machine cards.

The Cost Over Time chart's hover tooltip includes a **Difference** row (the
price gap between the machines at the hovered hour); its crossover marker is a
thick dotted line with a bold label, directional like the Comparison text.

## The Calculations tab (now the LAST tab)

`CalculationView` transparently shows, with the live input numbers plugged in:
global H and the three escalation formulas once, then **for each selected machine**
the slider→consumption interpolation arithmetic (the variable is written
**"Consumption"**, not "C"), its year-0 per-hour cost lines, and sampled (hour,
year, cumulative) points, ending in that machine's TCO at the comparison window. A final cost
gap / crossover section (simple year-0 check + full escalated crossover)
appears **only when 2+ machines are selected**. Figures are normalized to
per-machine, ex-VAT for readability. **Every calculation carries a
plain-language explanation** in grey to its right (`CalcRow` / `.calc-why` —
two-column grid, stacking below ~720px): concepts are explained in words
("grows 6% every year, compounded"), not just symbols — keep that pattern when
adding steps.

## Data confidence system — fully removed from the UI

The confidence system was removed from the on-screen UI (the
`ConfidenceBadge`/`ConfidenceLegend` components, `confidenceMeta.js`, the
`.badge` styles and the screen usages are gone) and later (July 2026, at
Michael's request) from the **printed brochure** as well — no confidence dots,
no "Confirmed / Estimate / Pending dealer quote" legend, no "Pending dealer
quote" italic values. Do **not** reintroduce it in either place.

`machinesConfig.js` still carries the `'confirmed' | 'estimate' |
'unconfirmed'` string fields (`priceConfidence`, `*PriceConfidence`, per-spec
`confidence`) as data-provenance bookkeeping; nothing renders them. If a value
is ever truly unknown, leave it out or resolve it — never print an invented
number.

Note: some `machinesConfig.js` fields are **printed-spec-sheet data only** and
deliberately do NOT feed the TCO engine: `specConsumption` (rated 38 kWh/h /
14 L/h — the engine interpolates `CONSUMPTION_BREAKPOINTS` instead),
`maintenanceSchedule` (SANY's scheduled-maintenance figures per year — the
engine uses R0/h electric and R29/h diesel), `warrantyTiers`, `serviceLifeHours`
and the battery charging details.

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
