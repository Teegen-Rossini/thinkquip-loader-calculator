# How the ThinkQuip loader savings calculator works

The ThinkQuip SANY Electric Loader Savings Calculator produces a **neutral
total-cost-of-ownership (TCO) comparison** between the SANY SW956E electric
wheel loader and the SANY SYL956H5 diesel wheel loader, using the customer's
own operating numbers. TCO means purchase price plus all running costs. The
calculator highlights whichever machine is cheaper at the chosen comparison
point — the answer can be electric OR diesel, and it can flip as the
comparison window moves.

## The chart

The centerpiece is a cumulative cost-over-operating-hours chart running from
0 to 15,000 operating hours (not calendar years). Each machine's line starts
at its purchase price and climbs as running costs accumulate. Where two lines
cross is the **crossover point** — the operating hour where one machine
becomes cheaper to own than the other.

## The inputs, in plain language

- **Machine selection** — pick any combination of the three options: SANY
  SW956E (electric), SANY SYL956H5 (diesel, dry brake) and SANY SYL956H5
  (diesel, wet brake). One, two or all three can be compared at once. With a
  single machine selected there is nothing to compare, so only that machine's
  own cost is shown.
- **Fuel included in rate** — if the customer's contract rate already covers
  diesel fuel, choosing "No" removes diesel fuel cost from the diesel total.
  Electricity is always counted for the electric machine, and the R29/h diesel
  routine service is always counted.
- **Operation intensity** — a Light / Normal / Heavy slider describing how
  hard the machine works. It drives energy consumption only: roughly
  20–40 kWh/h for the electric loader and 10–16 L/h for the diesel,
  interpolated smoothly across the range.
- **Daily operating hours** — hours worked per day. Annual hours = daily
  hours × 6 days per week × 50 weeks per year. This converts operating hours
  to calendar years for the escalation math.
- **Electricity price (R/kWh) and diesel price (R/L)** — editable. The
  defaults (R2.80/kWh and R23.50/L) are placeholders only; always enter the
  customer's real rates.
- **Fuel-theft control** — an uplift applied to diesel fuel cost only: about
  10% for a low-control environment, 3.5% for a moderately controlled site,
  1% for a well-monitored site. Electricity is never affected.
- **Fleet size (1–4)** — multiplies every cost (purchase and running) by the
  number of machines.
- **Comparison window** — a slider on the Comparison page from 0 to 15,000
  operating hours (default 15,000). Every comparison figure — total costs,
  the "cheapest" call, cost gaps — is taken at this point. Salespeople set it
  to the hours the customer expects to keep the machine before selling or
  replacing it.
- **VAT toggle** — shows all figures including or excluding South African VAT
  (15%). It changes the display only, not the underlying comparison.

## Cost escalation

Projections are not flat: diesel fuel is escalated at +6% per year,
electricity at +8% per year, and diesel routine service at +6% per year, all
compounded. The electric loader's battery-replacement cost is projected to
**decline** at about 5% per year.

## What each machine's running cost includes

- **SANY SW956E (electric):** electricity only. There is no mechanical-service
  cost line for the electric machine. Its battery replacement lands at 30,000
  operating hours (base cost R1,120,000) — beyond the 15,000-hour chart and
  beyond the first owner's typical lifecycle, so it is never on the curve or
  in the TCO comparison, and it is not displayed anywhere in the tool or the
  printed brochure. Mention it only if the customer asks.
- **SANY SYL956H5 (diesel):** diesel fuel (with the theft uplift, when fuel is
  included in the rate) plus routine engine service at R29 per operating hour.
  There is no separate engine-overhaul event.

## Reading the result

At the chosen comparison window, the machine with the lowest total cost of
ownership is highlighted as the cheapest. For each other selected machine the
tool shows the cost gap at that point and the crossover hour — for example
"cheaper from 9,000 h onward" or "cheaper until 4,000 h". The same crossover
hour appears in the comparison text, on the chart marker and in the printed
brochure. The tool can also print a fixed-page A4 brochure of the full
comparison for the customer.

## Important caveats

Projections apply researched annual escalation trends to the operating inputs
and manufacturer figures — they are a planning estimate, not a forecast of
business income. Final pricing, maintenance, finance and availability must be
confirmed before purchase. Default energy prices are placeholders; the
customer's actual electricity tariff and diesel price should always be used.
