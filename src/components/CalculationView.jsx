import {
  CONSUMPTION_BREAKPOINTS, FUEL_THEFT_LEVELS, DIESEL_SERVICE, CALC_DEFAULTS,
} from '../data/machinesConfig';
import { annualHours, cumulativeCostAtHours, totalPerHourFor } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
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

export default function CalculationView({ selection, inputs }) {
  const { machines, hero, heroMachine, comparisons, hasComparison, battery, fleetSize } = selection;
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
          scale the totals uniformly and change neither the break-even nor the logic.
        </p>
      </div>

      <section className="calc-step">
        <h4><span className="calc-step__tag">a</span> Annual operating hours</h4>
        <p className="calc-eq mono">
          H = {n(inputs.dailyHours)} h/day × {n(inputs.daysPerWeek, 0)} days × {n(inputs.weeksPerYear, 0)} weeks ={' '}
          <strong>{n(H, 0)} h/yr</strong>
        </p>
        <p className="calc-note">Hours convert to years with t(x) = x / H, e.g. 20,000 h ≈ {formatYearsFromHours(maxHours, H)}.</p>
      </section>

      <section className="calc-step">
        <h4><span className="calc-step__tag">d</span> Escalation applied to each 0.25-year slice (at its midpoint year t)</h4>
        <ul className="calc-list mono">
          <li>Diesel fuel price × (1.06)<sup>t</sup> (+6%/yr)</li>
          <li>Electricity price × (1.08)<sup>t</sup> (+8%/yr)</li>
          <li>Routine service × (1.06)<sup>t</sup> (+6%/yr)</li>
          <li>Battery replacement × (0.95)<sup>t</sup> (−5%/yr — declines)</li>
        </ul>
        <p className="calc-note">Steps b, c, e, f and g below are shown for each selected machine in turn.</p>
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
              <p className="calc-eq mono">
                C = {interp.Ca} + (({interp.s} − {interp.a}) / ({interp.b} − {interp.a})) × ({interp.Cb} − {interp.Ca}) ={' '}
                <strong>{n(interp.C)} {isElec ? 'kWh/h' : 'L/h'}</strong>
              </p>
            </div>

            <div className="calc-step">
              <h5><span className="calc-step__tag">c</span> Year-0 cost per hour</h5>
              {isElec ? (
                <>
                  <p className="calc-eq mono">
                    Energy/h = {n(interp.C)} kWh/h × R{n(inputs.electricityPrice)} = <strong>{formatCurrency(per.elecEnergyPerH)}</strong>
                  </p>
                  <p className="calc-eq mono">Maintenance/h = <strong>R0</strong> (no mechanical service line)</p>
                  <p className="calc-eq mono">→ Total/h = <strong>{formatCurrency(per.elecPerH)}</strong></p>
                </>
              ) : (
                <>
                  <p className="calc-eq mono">
                    Fuel/h = {per.includeFuel
                      ? <>{n(interp.C)} L/h × R{n(inputs.dieselPrice)} × (1 + {theta}) = <strong>{formatCurrency(per.dieselFuelPerH)}</strong></>
                      : <><strong>R0</strong> (fuel not included in the rate)</>}
                  </p>
                  <p className="calc-eq mono">Service/h = <strong>R{DIESEL_SERVICE.ratePerHour}</strong> (R29,000 per 1,000 h)</p>
                  <p className="calc-eq mono">→ Total/h = <strong>{formatCurrency(per.dieselPerH)}</strong></p>
                  <p className="calc-note">
                    Theft level: {theftLevel.label} ({theftLevel.range}) → θ = {theta * 100}%. Applied to diesel fuel only.
                  </p>
                </>
              )}
            </div>

            <div className="calc-step">
              <h5><span className="calc-step__tag">e</span> Sampled cumulative cost (per machine, ex VAT)</h5>
              <div className="calc-table-scroll">
                <table className="calc-table">
                  <thead>
                    <tr><th>Hours</th><th>≈ Years</th><th>Cumulative TCO</th></tr>
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
              <p className="calc-note">Each point = purchase price + Σ escalated slice costs up to that hour.</p>
            </div>

            {isElec && battery && (
              <div className="calc-step">
                <h5><span className="calc-step__tag">f</span> Battery replacement injection</h5>
                <p className="calc-eq mono">
                  Lands at {formatHours(battery.atHours)} → year {n(battery.year, 1)} = 30,000 / {n(H, 0)}.
                  Cost = {formatCurrency(battery.baseCost)} × (0.95)<sup>{n(battery.year, 1)}</sup> = <strong>{formatCurrency(battery.escalatedCost)}</strong>
                </p>
                <p className="calc-note">Beyond the 20,000 h chart and the first owner’s lifecycle, so it is not plotted on the curve.</p>
              </div>
            )}

            <div className="calc-step calc-step--result">
              <h5><span className="calc-step__tag">g</span> Total cost of ownership</h5>
              <div className="calc-output">
                <span className="calc-output__label">TCO @ {formatHours(maxHours)}</span>
                <span className="calc-output__value mono">{formatCurrency(norm(r.tcoAtMax))}</span>
              </div>
            </div>
          </section>
        );
      })}

      {hasComparison && (
        <section className="calc-step calc-step--result">
          <h4><span className="calc-step__tag">g</span> Savings &amp; break-even (vs {heroMachine.name})</h4>
          {comparisons.map((c) => {
            const priceGap = heroMachine.price - c.machine.price;
            const hourlyGap = totalPerHourFor(c.result) - totalPerHourFor(hero);
            return (
              <div key={c.machine.uid} className="calc-breakeven">
                <p className="calc-eq mono">
                  <strong>{heroMachine.name} vs {c.machine.name}</strong> — saving @ {formatHours(maxHours)} ={' '}
                  <strong>{formatCurrency(norm(c.savingsAtMax))}</strong>
                </p>
                <p className="calc-eq mono">
                  Simple year-0 break-even = price gap ÷ hourly saving = R{n(priceGap, 0)} ÷ {formatCurrency(hourlyGap)}/h ={' '}
                  <strong>
                    {c.simpleBreakevenHours != null
                      ? `${formatHours(c.simpleBreakevenHours)} (~${formatYearsFromHours(c.simpleBreakevenHours, H)})`
                      : 'n/a (no capital premium to repay)'}
                  </strong>
                </p>
                <p className="calc-eq mono">
                  Escalated break-even (full model) ={' '}
                  <strong>
                    {c.breakevenHours != null && c.breakevenHours <= maxHours
                      ? `${formatHours(c.breakevenHours)} (~${formatYearsFromHours(c.breakevenHours, H)})`
                      : `beyond ${formatHours(maxHours)}`}
                  </strong>
                </p>
              </div>
            );
          })}
          <p className="calc-note">
            The escalated break-even lands slightly earlier than the simple one because diesel costs grow faster than electricity.
          </p>
        </section>
      )}
    </div>
  );
}
