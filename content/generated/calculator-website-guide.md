# Using the ThinkQuip SANY loader savings calculator (website guide)

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
ThinkQuip, 11 Voyager Street, Linbro Park, JHB — www.thinkquip.co.za. Prepared-by contact on quotes: ThinkQuip, cell +27 83 973 1378, email mathew@thinkquip.co.za.

## Honest limitations
- The default electricity and diesel prices are placeholders, not live feeds — the salesperson should enter the customer's actual rates.
- The comparison covers the two SANY machine families only; there are no competitor machines, no solar option, and no tender logic in this tool.
- The battery-replacement event (30,000 h) falls beyond the 15,000 h comparison window and is not shown anywhere in the tool or the printed brochure — but the assistant can explain it if the customer asks.
