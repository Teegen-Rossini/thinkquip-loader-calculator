import {
  CONSUMPTION_BREAKPOINTS, FUEL_THEFT_LEVELS, DIESEL_SERVICE, CALC_DEFAULTS,
} from '../data/machinesConfig';
import { annualHours, cumulativeCostAtHours, totalPerHourFor } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours, variantName } from '../lib/format';
import MachineName from './MachineName';
import './CalculationView.css';

/** Linear-interpolation detail for display: the bracket used and the value. */
function interpDetail(pts, slider) {
  const s = Math.max(pts[0][0], Math.min(pts[pts.length - 1][0], slider));
  for (let i = 1; i < pts.length; i++) {
    const [a, Ca] = pts[i - 1];
    const [b, Cb] = pts[i];
    if (s <= b) return { a, b, Ca, Cb, s, C: Ca + ((s - a) / (b - a)) * (Cb - Ca) };
  }
  const last = pts[pts.length - 1];
  return { a: last[0], b: last[0], Ca: last[1], Cb: last[1], s, C: last[1] };
}

function n(value, digits = 2) {
  if (value == null || !Number.isFinite(value)) return '—';
  return Number(value.toFixed(digits)).toLocaleString('en-US');
}

/** One calculation with its plain-language explanation beside it (grey, right
 *  column) — the maths stays, the words say what it means. */
function CalcRow({ children, why }) {
  return (
    <div className="calc-row">
      <p className="calc-eq mono">{children}</p>
      {why && <p className="calc-why">{why}</p>}
    </div>
  );
}

export default function CalculationView({ selection, inputs }) {
  const {
    machines, hero, heroMachine, comparisons, hasComparison,
    fleetSize, windowHours,
  } = selection;
  const H = annualHours(inputs);
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  const elecInterp = interpDetail(CONSUMPTION_BREAKPOINTS.electric, inputs.operationSlider);
  const dieselInterp = interpDetail(CONSUMPTION_BREAKPOINTS.diesel, inputs.operationSlider);
  const theftLevel = FUEL_THEFT_LEVELS.find((l) => l.id === inputs.fuelTheftLevel) ?? FUEL_THEFT_LEVELS[1];
  const theta = theftLevel.theta;

  const vatFactor = inputs.vatInclusive ? 1 + CALC_DEFAULTS.vatRate : 1;
  // Normalize the VAT-applied, fleet-scaled figures back to per-machine ex-VAT
  // so the workings read cleanly regardless of the display toggles.
  const norm = (v) => (v == null ? null : v / vatFactor / fleetSize);
  const samples = [2500, 5000, 10000, maxHours];

  return (
    <div className="calc-view panel-surface">
      <div className="calc-view__intro">
        <h3 className="section-heading section-heading--flush">How the numbers are built</h3>
        <p>
          Every figure below uses your live inputs, for the {machines.length} machine{machines.length > 1 ? 's' : ''} you
          selected. Values are shown <strong>per machine, excluding VAT</strong> — fleet size (×{fleetSize}) and the VAT toggle
          scale the totals uniformly and change neither the crossover nor the logic. The grey notes beside each
          calculation explain it in plain language.
        </p>
      </div>

      <section className="calc-step">
        <h4><span className="calc-step__tag">a</span> Annual operating hours</h4>
        <CalcRow
          why="How many hours one machine actually works in a year: your daily hours × working days × working weeks. This is also how operating hours convert into calendar years — divide any hour count by this number."
        >
          H = {n(inputs.dailyHours)} h/day × {n(inputs.daysPerWeek, 0)} days × {n(inputs.weeksPerYear, 0)} weeks ={' '}
          <strong>{n(H, 0)} h/yr</strong>
        </CalcRow>
        <p className="calc-note">Hours convert to years with t(x) = x / H, e.g. {formatHours(maxHours)} ≈ {formatYearsFromHours(maxHours, H)}.</p>
      </section>

      <section className="calc-step">
        <h4><span className="calc-step__tag">d</span> Escalation applied to each 0.25-year slice (at its midpoint year t)</h4>
        <div className="calc-row">
          <ul className="calc-list mono">
            <li>Diesel fuel price × (1.06)<sup>t</sup> (+6%/yr)</li>
            <li>Electricity price × (1.08)<sup>t</sup> (+8%/yr)</li>
            <li>Routine service × (1.06)<sup>t</sup> (+6%/yr)</li>
          </ul>
          <p className="calc-why">
            Prices don&rsquo;t stand still, so each cost grows at its own yearly rate, compounded. &ldquo;× (1.06)<sup>t</sup>&rdquo;
            means &ldquo;grows 6% every year — t years from now the price has been multiplied by 1.06 that many
            times&rdquo;.
          </p>
        </div>
        <p className="calc-note">Steps b, c, e and f below are shown for each selected machine in turn.</p>
      </section>

      {machines.map((r) => {
        const m = r.machine;
        const isElec = m.type === 'electric';
        const per = r.perHour;
        const interp = isElec ? elecInterp : dieselInterp;
        return (
          <section key={m.uid} className="calc-machine">
            <MachineName machine={m} as="h4" className="calc-machine__name" />

            <div className="calc-step">
              <h5><span className="calc-step__tag">b</span> Duty slider → consumption</h5>
              <p className="calc-note">Slider at {inputs.operationSlider} (drives consumption only). Linear interpolation within the active bracket:</p>
              <CalcRow
                why="The duty slider sets how hard the machine works. Harder work burns energy faster, so consumption slides smoothly between the light-duty and heavy-duty factory figures instead of jumping in steps."
              >
                Consumption = {interp.Ca} + (({interp.s} − {interp.a}) / ({interp.b} − {interp.a})) × ({interp.Cb} − {interp.Ca}) ={' '}
                <strong>{n(interp.C)} {isElec ? 'kWh/h' : 'L/h'}</strong>
              </CalcRow>
            </div>

            <div className="calc-step">
              <h5><span className="calc-step__tag">c</span> Year-0 cost per hour</h5>
              {isElec ? (
                <>
                  <CalcRow why="What one hour of work costs today: the electricity used in that hour times your electricity price.">
                    Energy/h = {n(interp.C)} kWh/h × R{n(inputs.electricityPrice)} = <strong>{formatCurrency(per.elecEnergyPerH)}</strong>
                  </CalcRow>
                  <CalcRow why="The electric machine has no engine to service — no oil, filters or mechanical service line — so nothing is added on top of the electricity.">
                    Maintenance/h = <strong>R0</strong> (no mechanical service line)
                  </CalcRow>
                  <CalcRow why="An hour of electric work costs only its electricity.">
                    → Total/h = <strong>{formatCurrency(per.elecPerH)}</strong>
                  </CalcRow>
                </>
              ) : (
                <>
                  <CalcRow
                    why={per.includeFuel
                      ? `Litres burned in an hour times your diesel price, plus ${n(theta * 100, 1)}% extra to allow for fuel lost to theft on site.`
                      : 'Your contract rate covers the fuel, so no diesel fuel cost is counted against this machine here.'}
                  >
                    Fuel/h = {per.includeFuel
                      ? <>{n(interp.C)} L/h × R{n(inputs.dieselPrice)} × (1 + {n(theta, 3)}) = <strong>{formatCurrency(per.dieselFuelPerH)}</strong></>
                      : <><strong>R0</strong> (fuel not included in the rate)</>}
                  </CalcRow>
                  <CalcRow why="Routine engine servicing (oil, filters, wear parts) averages out to R29 for every hour the machine runs — R29,000 per 1,000 hours.">
                    Service/h = <strong>R{DIESEL_SERVICE.ratePerHour}</strong> (R29,000 per 1,000 h)
                  </CalcRow>
                  <CalcRow why="Fuel and servicing together: what one hour of diesel work costs today.">
                    → Total/h = <strong>{formatCurrency(per.dieselPerH)}</strong>
                  </CalcRow>
                  <p className="calc-note">
                    Theft level: {theftLevel.label} ({theftLevel.range}) → θ = {n(theta * 100, 1)}%. Applied to diesel fuel only.
                  </p>
                </>
              )}
            </div>

            <div className="calc-step">
              <h5><span className="calc-step__tag">e</span> Sampled cumulative cost (per machine, excl. VAT)</h5>
              <div className="calc-row">
                <div className="calc-table-scroll">
                  <table className="calc-table">
                    <thead>
                      <tr><th>Hours</th><th>≈ Years</th><th>TCO</th></tr>
                    </thead>
                    <tbody>
                      {samples.map((h) => (
                        <tr key={h}>
                          <td className="mono">{formatHours(h)}</td>
                          <td className="mono">{formatYearsFromHours(h, H)}</td>
                          <td className="mono">{formatCurrency(norm(cumulativeCostAtHours(r.series, h)))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="calc-why">
                  The running total of owning this machine: the purchase price up front, then every hour worked added
                  on — each quarter-year priced at its then-current (escalated) rates. These rows are checkpoints along
                  that total; the Cost Over Hours chart draws the whole line.
                </p>
              </div>
              <p className="calc-note">Each point = purchase price + Σ escalated slice costs up to that hour.</p>
            </div>

            <div className="calc-step calc-step--result">
              <h5><span className="calc-step__tag">f</span> Total cost of ownership</h5>
              <div className="calc-row">
                <div className="calc-output">
                  <span className="calc-output__label">TCO @ {formatHours(windowHours)} (your comparison window)</span>
                  <span className="calc-output__value mono">{formatCurrency(norm(r.tcoAtWindow))}</span>
                </div>
                <p className="calc-why">
                  Everything owning this machine costs up to your chosen comparison window — purchase price plus all
                  escalated running costs. This is the figure the machines are compared on.
                </p>
              </div>
            </div>
          </section>
        );
      })}

      {hasComparison && (
        <section className="calc-step calc-step--result">
          <h4><span className="calc-step__tag">g</span> Cost gap &amp; crossover (vs {variantName(heroMachine)}, the cheapest at {formatHours(windowHours)})</h4>
          {comparisons.map((c) => {
            const priceGap = heroMachine.price - c.machine.price;
            const hourlyGap = totalPerHourFor(c.result) - totalPerHourFor(hero);
            return (
              <div key={c.machine.uid} className="calc-breakeven">
                <CalcRow why={`How much more the ${variantName(c.machine)} costs in total at your comparison window, everything included.`}>
                  <strong>{variantName(heroMachine)} vs {variantName(c.machine)}</strong> — cost gap @ {formatHours(windowHours)} ={' '}
                  <strong>{formatCurrency(norm(c.gapAtWindow))}</strong>
                </CalcRow>
                <CalcRow
                  why="The quick sanity check: divide the extra purchase price by the money saved every hour. It ignores escalation, so it slightly differs from the full model below."
                >
                  Simple year-0 check = price gap ÷ hourly saving = R{n(priceGap, 0)} ÷ {formatCurrency(hourlyGap)}/h ={' '}
                  <strong>
                    {c.simpleBreakevenHours != null
                      ? `${formatHours(c.simpleBreakevenHours)} (~${formatYearsFromHours(c.simpleBreakevenHours, H)})`
                      : 'n/a (no capital premium to repay)'}
                  </strong>
                </CalcRow>
                <CalcRow
                  why="The full model replays every quarter-year with escalating prices and finds the exact hour where the two total-cost lines cross — the same crossover marked on the Cost Over Hours chart."
                >
                  Crossover (full model) ={' '}
                  <strong>
                    {c.crossoverHours != null && c.crossoverHours <= maxHours
                      ? `${variantName(heroMachine)} cheaper ${c.crossoverDirection === 'loses' ? 'until' : 'from'} ${formatHours(c.crossoverHours)} (~${formatYearsFromHours(c.crossoverHours, H)})`
                      : `none within ${formatHours(maxHours)} — cheaper throughout`}
                  </strong>
                </CalcRow>
              </div>
            );
          })}
          <p className="calc-note">
            The crossover hour is the same event on every page — the point where the two machines&rsquo; total-cost
            lines cross on the Cost Over Hours chart.
          </p>
        </section>
      )}
    </div>
  );
}
