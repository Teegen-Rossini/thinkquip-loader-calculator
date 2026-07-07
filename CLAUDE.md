# CLAUDE.md

Guidance for working in this repository.

## What this is

The **ThinkQuip SANY Electric Loader Savings Calculator** — an in-person sales
tool. A salesperson enters a customer's operating parameters; the app produces a
cost comparison arguing for the **SANY SW956E electric wheel loader** vs. its
diesel equivalents, backed by the customer's own numbers. The cumulative
cost-over-time chart with the crossover (breakeven) point is the centerpiece.

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

- **`src/data/machinesConfig.js`** — the single source of truth for all
  manufacturer specs, prices, consumption, maintenance, escalation rates and
  calc defaults. **All figures live here and nowhere else.** As real dealer
  quotes come back, update values here — the engine and components should not
  need to change.
- **`src/lib/calculationEngine.js`** — pure functions only. Takes machine config
  + customer inputs, returns numbers. No React state duplicates this math. If a
  calculation exists, it belongs here.
- **`src/lib/format.js`** — display formatting (currency, etc.).
- **`src/data/confidenceMeta.js`** — metadata for the confidence-badge system.
- **`src/components/`** — the tabbed UI (see flow below), each with a colocated
  `.css` file.
- **`src/App.jsx`** — top-level state, tab routing, wires inputs → engine → views.

## App flow

Landing `Dashboard` → then a tab bar: **01 Inputs** → **02 Comparison** →
**03 Cost Over Time** → **04 Spec Sheet**. Note: `activeTab` initializes to
`'dashboard'`, which is intentionally **not** a member of the `TABS` array — the
dashboard is a separate landing view rendered outside the tab bar. Keep that in
mind before touching navigation.

Customer inputs are persisted to `localStorage` under
`thinkquip-loader-calc-draft` and restored on load.

## The financial model (important conventions)

- **Escalation is real, not flat.** Running costs (energy + maintenance)
  compound annually, sampled monthly for a smooth curve. Rates live in
  `ESCALATION` in `machinesConfig.js` (note `batteryReplacement` is **negative**
  — battery cost is projected to fall).
- **Lifecycle events** (battery replacement for electric, engine overhaul for
  diesel) land as sharp vertical steps at their *true fractional year*, computed
  from the machine's real hours/year vs. its interval — not a fixed year. Their
  lump sums are escalated/de-escalated to the price level of the year they land.
- **Fleet scaling:** capital, energy, maintenance and event costs scale with
  fleet size; charging infrastructure does **not** scale 1:1 — one charger
  (2 guns) serves 2 machines, so `chargersNeeded = ceil(N / 2)`.
- **Tender jobs:** if it's a tender job and fuel is excluded, energy cost is
  dropped from the comparison entirely (`shouldIncludeFuelCost`).
- **Horizon auto-extends** from `horizonYears` (10) up to `horizonYearsMax` (20)
  if no breakeven is found in the default window.
- **VAT** is a display toggle (`vatInclusive`), applied at the engine's output
  boundary via `applyVat`, at the SA rate in `CALC_DEFAULTS.vatRate` (15%).

## Data confidence system

Every figure carries a confidence level: `'confirmed'` | `'estimate'` |
`'unconfirmed'`. `unconfirmed` maintenance/cost renders as "Pending quote" in the
UI and (for maintenance) is treated as `null` by the engine. Preserve and set
these accurately whenever you touch data in `machinesConfig.js`.

## Known open items

- **Pending dealer quotes:** CAT / Komatsu / Volvo machine prices, maintenance
  costs and warranty terms are estimates or unconfirmed. Komatsu & Volvo fuel
  figures are reasoned estimates scaled from CAT telematics data.
- **Placeholder prices:** electricity, diesel, charger-install and solar costs
  are placeholder defaults — no live feeds wired up yet (see spec §7).
- **Not yet built (spec):** client-info capture/save for follow-up (POPIA
  consent), and live-ish diesel/electricity price sourcing.

## Reference

`thinkquip-electric-loader-calculator-spec.md` is the authoritative project spec
(machines, variables, calc logic, outputs, open questions, branding). Consult it
before adding features or changing the model. Brand colors are defined in
`COLORS` in `machinesConfig.js` — use those exact hex values.
