# How the ThinkQuip savings calculator computes costs (the financial model)

The calculator produces a NEUTRAL total-cost-of-ownership (TCO) comparison: purchase price plus all running costs, plotted over OPERATING HOURS from 0 to 15 000 h (not years). The machine with the lowest TCO at the user-chosen comparison window is highlighted — that can be the electric OR a diesel machine, and the answer can flip as the window moves.

## Annual operating hours
H = daily hours × days per week × weeks per year. Defaults: 6 days/week and 50 weeks/year (daily hours is entered by the customer, default 8 → H = 2 400 hours/year). Operating hours convert to calendar years as t = hours ÷ H.

## Energy consumption (the operation slider)
An operation slider from 50 to 100 describes how hard the machine works: Light (50–65), Normal (65–85), Heavy (85–100). Consumption is interpolated LINEARLY between these breakpoints:
- Electric: slider 50 → 20 kWh/h; slider 65 → 30 kWh/h; slider 85 → 35 kWh/h; slider 100 → 40 kWh/h
- Diesel: slider 50 → 10 L/h; slider 65 → 12 L/h; slider 85 → 14 L/h; slider 100 → 16 L/h
The slider affects consumption only — never the time axis.

## Year-0 cost per operating hour
- Electric: consumption (kWh/h) × electricity price (R/kWh). Electricity is ALWAYS counted. The electric machine carries NO mechanical-service line (R0/h) — a genuine long-term advantage, not a missing value.
- Diesel: consumption (L/h) × diesel price (R/L) × (1 + θ fuel-theft uplift) + R29/h routine engine service. The R29/h service (R29,000 per 1,000 h) is ALWAYS counted; the fuel component is dropped entirely if the customer's rate does not include fuel. There is NO separate diesel engine-overhaul event.

## What the maintenance figure covers (differential maintenance only)
The maintenance line in the comparison is DIFFERENTIAL: it counts only the maintenance that differs between the machines — the diesel engine's routine servicing (the R29/h line: oil, filters and related engine consumables). Wear-and-tear items the two machines share — tyres, bucket and ground-engaging tools, hydraulics, pins and bushes, general structural wear — cost essentially the same on either machine, so they are deliberately left out: they would add the same amount to both totals and cancel out of a head-to-head comparison, without changing the cost gap, the crossover or which machine is cheapest. That is also why the electric machine shows R0/h mechanical maintenance: it has no diesel engine to service, and everything else it shares with the diesel is excluded on both sides. If a customer asks about total maintenance or servicing costs in absolute terms (not as a comparison), explain this scope honestly — the calculator's maintenance figures are comparison figures, not a full workshop budget.

## Fuel-theft control (diesel fuel only — never electricity)
- Low control environment (typical loss 5–15%): diesel fuel cost is multiplied by 1.100 (θ = 10%)
- Moderately controlled site (typical loss 2–5%): diesel fuel cost is multiplied by 1.035 (θ = 3,5%)
- Well-monitored site (typical loss <2%): diesel fuel cost is multiplied by 1.010 (θ = 1%)

## Price escalation (compounded annually, applied at each time-slice's midpoint year)
- Diesel fuel: +6% per year
- Electricity: +8% per year
- Maintenance / diesel routine service: +6% per year
- Battery replacement cost: -5% per year (it DECLINES — battery prices are falling)

Cumulative cost is built in 0.25-year time slices; each slice spans H × 0.25 operating hours and is escalated at its midpoint year.

## Battery replacement (electric only — background knowledge, not shown in the tool)
The battery reaches replacement at 30,000 operating hours — BEYOND the 15 000 h chart and beyond the first owner's typical lifecycle, so it is never part of the plotted curve or the TCO comparison window. It is not displayed anywhere on screen or in the printed brochure; mention it only if the customer asks. If asked: today's cost is escalated (downward, since battery prices fall) to its landing year (30,000 ÷ H).

## Fleet size
Fleet size (1–4) multiplies ALL costs — capital, energy and service — per machine. The charger is included in the electric machine's price, so there is no separate charging-infrastructure line at any fleet size.

## The comparison window and crossover
The user sets a comparison window (0 → 15 000 h) on the Comparison page — typically the customer's expected sell/replace hours. Every figure (totals, "cheapest" call, cost gaps) is evaluated at that window. Between any two machines' total-cost lines there is at most ONE crossover hour — the point where the cheaper machine changes. The same crossover value appears in the comparison text, the chart marker and the printed brochure.

## VAT
All engine figures are ex-VAT; a display toggle applies 15% South African VAT to displayed values.

## Default energy prices (PLACEHOLDERS — always confirm the customer's real rates)
- Electricity: R2,80/kWh. Placeholder default — no single "current" commercial tariff exists. Confirm the customer’s actual rate before presenting.
- Diesel: R23,50/L. Placeholder default — wire up to the SA official fuel price feed (updates monthly) when available.
Both are editable on the Inputs page.
