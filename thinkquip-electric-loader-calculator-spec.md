# ThinkQuip Electric Loader Savings Calculator — Project Spec

**Purpose:** In-person sales tool. Salesperson enters a customer's operating parameters; app outputs a cost comparison that makes the case for the SANY SW956E electric wheel loader vs its diesel equivalents, backed by the customer's own numbers.

**Status of this doc:** v1 — real data where confirmed, clearly flagged estimates elsewhere. Update as dealer quotes come back.

---

## 1. Machines in the comparison

| | SANY SW956E (Electric) | SANY SYL956H5 (Diesel, same brand) | CAT 950M/GC | Komatsu WA380-8 | Volvo L120H |
|---|---|---|---|---|---|
| Operating weight | 19,000 kg | 17,100 kg | 19,069 kg | ~18,900 kg | ~20,000 kg |
| Rated load | 5,800 kg | 5,000 kg | — | — | — |
| Bucket capacity | 2.7–5.0 m³ | — | 2.7–4.4 m³ | 2.7–3.3 m³ | 3.0–3.6 m³ |
| Fuel tank | — | 300 L | 290 L | 300 L | 270 L |
| Machine cost (excl. VAT) | R3,450,000 ✅ | R2,050,000 ✅ | ~R2,900,000 🟡 est. | ~R2,800,000 🟡 est. | ~R2,800,000 🟡 est. |

✅ = confirmed from SANY factory docs · 🟡 = estimate, pending dealer quote

---

## 2. Fixed variables — SANY SW956E (Electric)

**Confirmed from SANY factory materials:**
- Battery capacity: 422 kWh (client-confirmed; factory doc range 282/350/359/423 kWh across configs)
- Charger rating: 320 kW
- Consumption: 38 kWh/h (from SANY's own worked example)
- Working hours per charge: 7–9 h
- Charging time: 0.8 h (20→80%), 1.5 h (20→100%)
- Charge cycles: 4,000+
- Total operating life: 30,000–35,000 h
- Battery replacement cost: R1,120,000
- Warranty: whole machine 24 mo/5,000 h; battery + drive motor + electric control 60 mo/10,000 h; axle + hydraulic pump + gearbox 24 mo/5,000 h
- Maintenance cost/year: R53,877 (@2,000 h/yr) / R75,377 (@3,000 h/yr) — scale linearly between/beyond these two anchor points

---

## 3. Fixed variables — Diesel comparators

**Fuel consumption (L/h), by duty cycle:**

| Machine | Light | Medium | Heavy | Confidence |
|---|---|---|---|---|
| SANY SYL956H5 | — | 14 (flat) | — | ✅ confirmed (SANY's own worked example) |
| CAT 950M | 7.3–10.3 | 10.3–12.4 | 12.4–14.9 | ✅ confirmed (CAT's official Owning & Operating Cost Guide, Ed. 46 — real Product Link telematics data) |
| Komatsu WA380-8 | ~6.5 | ~9.5 | ~12.5 | 🟡 estimate — scaled from CAT's real data by engine power ratio; genuine older-gen Komatsu figures (WA380-3) run much higher but that's an outdated engine, not representative |
| Volvo L120H | ~6.5 | ~9 | ~11 | 🟡 estimate — same CAT baseline, adjusted for Volvo's documented efficiency edge (OptiShift). Volvo doesn't publish absolute L/h anywhere |

**Maintenance cost/year:**

| Machine | @2,000 h/yr | @3,000 h/yr | Confidence |
|---|---|---|---|
| SYL956H5 | R74,873 | R91,373 | ✅ confirmed |
| CAT / Komatsu / Volvo | — | — | 🔴 not yet sourced — need dealer quotes |

**Machine price, warranty terms:** 🔴 not yet sourced for CAT/Komatsu/Volvo — dealer quotes needed (see Section 7).

---

## 4. Variable inputs (salesperson enters per customer)

Binary/branching flow, per client direction:

1. **Tender job?** Yes / No
   - If Yes → **Fuel cost included in tender?** Yes (customer pays fuel) / No (fuel excluded from their cost calc)
2. **Daily operating hours:** [number]
3. **Days per week:** [number] (default 6, editable)
4. **Weeks per year:** [number] (default 50, editable — accounts for downtime/maintenance/holidays)
   → App calculates: `annual_hours = daily_hours × days_per_week × weeks_per_year`
4. **Operation mix:** slider 0–100% heavy / light → blended consumption rate: `rate = heavy% × heavy_rate + light% × light_rate`
5. **Energy source (electric only):** Grid charger / Solar
6. **Charging infrastructure already installed?** Yes / No → No adds a one-time install cost (not just a comparative line item)
7. **Electricity price (R/kWh):** auto-filled from best available source, editable
8. **Diesel price (R/L):** auto-filled from SA official fuel price, editable
9. **Comparison machines:** SYL956H5 (auto-included) + multi-select from CAT 950 / Komatsu WA380 / Volvo L120H

---

## 5. Calculation logic

Mirrors SANY's own worked example (Section 1, factory presentation) — same shape, made dynamic:

```
consumption_rate = (heavy% × heavy_L_per_hr) + (light% × light_L_per_hr)   [or kWh/h for electric]
annual_energy_cost = consumption_rate × annual_hours × price_per_unit
annual_total_cost = annual_energy_cost + annual_maintenance_cost
cumulative_cost[year] = machine_cost + Σ(annual_total_cost) up to that year
                          + one-time costs where applicable (charger install, battery replacement at year X if operating hours exceed battery life)
recoup_point = year/month where cumulative_cost(electric) first drops below cumulative_cost(diesel)
```

Run this per selected diesel comparator, in parallel, against the one electric machine.

**Not doing:** no prediction of customer's future income/business — every input above is either a fixed spec or something the customer states directly (hours, prices). The "breakeven" is a projection of stated inputs forward, not a forecast of anything about the customer.

---

## 6. Outputs

- Capital cost comparison
- Cost-over-time chart (cumulative cost per machine, line graph, crossover point marked — this is the centerpiece)
- Annual cost breakdown (energy + maintenance)
- Spec + cost comparison table across all selected machines
- Printable / shareable link
- Client info capture (name, company, inputs used) → saved for follow-up + future reference (POPIA-conscious: consent checkbox, secure storage)

---

## 7. Open items — dealer questions to send (Komatsu SA, Volvo SA/Bell Equipment)

Same 5 questions to both, for the WA380-8 and L120H respectively, in a config comparable to ~19t operating weight / ~3.5m³ bucket:

1. Average fuel consumption (L/h), broken down light / medium / heavy duty
2. Current list price excl. VAT, standard configuration
3. Typical annual scheduled maintenance cost at 2,000 h/yr and 3,000 h/yr
4. Standard warranty terms — whole machine, and powertrain/major components separately
5. Confirm standard bucket capacity and rated load capacity for that configuration

**Also still needed:**
- Live-ish diesel price source (SA official fuel price, updates monthly — feasible)
- Live-ish electricity price source (harder — no single "current price," will pre-fill a reasonable default with manual override, "last updated" date shown)

---

## 8. Branding

- ThinkQuip: turquoise + white
- SANY: red + white
- Roller PDF resources = color/logo reference only (different machine, not data source)
- Creative freedom on layout — palette accuracy matters more than exact template match

---

## 9. Not in scope (v1)

- Compaction roller (separate machine, future brochure needed)
- Multiple electric machine selection (only SW956E for now, architecture should allow adding more later)
- Financing/monthly repayment view (client sells outright or to plant-hire cos, always paid in full)
- Breakeven tied to customer's business income/predictions
