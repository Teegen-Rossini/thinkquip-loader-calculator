import { CALC_DEFAULTS, ESCALATION, THINKQUIP_LOGO } from '../data/machinesConfig';
import { cumulativeCostAtHours, savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import { PrintPage, PageHeader, Band } from './PrintKit';
import PrintChart from './PrintChart';

function pct(rate) {
  const p = Math.round(rate * 1000) / 10;
  return `${p > 0 ? '+' : ''}${p}%`;
}

/** Brochure section 4 — the centerpiece cumulative cost-over-hours chart as
 *  static print SVG, its sampled data table, and (when electric is selected)
 *  the battery-replacement callout that lands beyond the chart. */
export default function PrintTimelinePage({ selection, inputs, pageNumber, pageCount }) {
  const { machines, hero, heroMachine, comparisons, hasComparison, battery, hoursPerYear } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const sampleHours = [2500, 5000, 10000, 15000];

  // Best opponent for the "advantage" column (widest gap at the window).
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.gapAtWindow ?? -Infinity) > (a.gapAtWindow ?? -Infinity) ? b : a))
    : null;

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount}>
      <PageHeader logo={THINKQUIP_LOGO} logoAlt="ThinkQuip" title="Cost Over Operating Hours" />
      <p className="print-intro">
        Cumulative cost of ownership for {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''} — purchase price
        plus escalated energy and service — from day one to {formatHours(maxHours)}.
      </p>

      <div className="print-chart">
        <div className="print-chart__legend">
          {machines.map((m) => (
            <span key={m.machine.uid} className="print-chart__legend-item">
              <span className="print-chart__legend-swatch" style={{ background: m.machine.chartColor }} />
              {m.machine.displayName}
            </span>
          ))}
        </div>
        <PrintChart selection={selection} />
      </div>

      <Band>Sampled points along the curve</Band>
      <table className="print-table">
        <thead>
          <tr>
            <th>Operating hours</th>
            <th>≈ Calendar year</th>
            {machines.map((m) => (
              <th key={m.machine.uid} className="num">
                {m.machine.variant ? `${m.machine.name} (${m.machine.variant})` : m.machine.name} cumulative
              </th>
            ))}
            {best && <th className="num">{heroMachine.name} advantage</th>}
          </tr>
        </thead>
        <tbody>
          {sampleHours.map((h) => (
            <tr key={h}>
              <td>{formatHours(h)}</td>
              <td>{formatYearsFromHours(h, hoursPerYear)}</td>
              {machines.map((m) => (
                <td key={m.machine.uid} className="num">{formatCurrency(cumulativeCostAtHours(m.series, h))}</td>
              ))}
              {best && (() => {
                const saving = savingsAtHours(hero.series, best.result.series, h);
                return <td className="num">{saving > 0 ? formatCurrency(saving) : `−${formatCurrency(Math.abs(saving))}`}</td>;
              })()}
            </tr>
          ))}
        </tbody>
      </table>

      {battery && (
        <div className="print-callout">
          <p className="print-callout__value">Battery replacement: {formatHours(battery.atHours)}</p>
          <p className="print-callout__text">
            The SW956E battery reaches replacement at {formatHours(battery.atHours)} — roughly{' '}
            {formatYearsFromHours(battery.atHours, hoursPerYear)} at your hours, beyond this {formatHours(maxHours)} window
            and the first owner&rsquo;s typical lifecycle, so it is not on the curve above. Projected cost per machine when it
            lands (battery prices are falling {pct(ESCALATION.batteryReplacement)}/yr): <strong>{formatCurrency(battery.escalatedCost)}</strong>.
          </p>
        </div>
      )}

      <p className="print-note">
        Projection escalates diesel fuel {pct(ESCALATION.dieselFuel)}/yr, electricity {pct(ESCALATION.electricity)}/yr and
        routine service {pct(ESCALATION.maintenance)}/yr, applied per quarter-year slice. The electric machine carries no
        mechanical-service line across the whole window.
      </p>
    </PrintPage>
  );
}
