import { CALC_DEFAULTS, ESCALATION, THINKQUIP_LOGO_TURQUOISE } from '../data/machinesConfig';
import { cumulativeCostAtHours, savingsAtHours } from '../lib/calculationEngine';
import { formatCurrency, formatHours, formatYearsFromHours, variantName } from '../lib/format';
import { PrintPage, PageHeader, Band } from './PrintKit';
import { printSeriesInk } from '../lib/printInks';
import PrintChart from './PrintChart';

function pct(rate) {
  const p = Math.round(rate * 1000) / 10;
  return `${p > 0 ? '+' : ''}${p}%`;
}

/** Brochure section 4 — the centerpiece cumulative cost-over-hours chart as
 *  static print SVG, plus its sampled data table. */
export default function PrintTimelinePage({ selection, inputs, pageNumber, pageCount }) {
  const { machines, hero, heroMachine, comparisons, hasComparison, hoursPerYear, windowHours } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  // Sample points derive from the live chart horizon; the customer's chosen
  // comparison window is always among them (highlighted below).
  const sampleHours = [...new Set(
    [maxHours / 6, maxHours / 3, (2 * maxHours) / 3, maxHours, windowHours]
      .map(Math.round)
      .filter((h) => h > 0),
  )].sort((a, b) => a - b);

  // Best opponent for the "advantage" column (widest gap at the window).
  const best = hasComparison
    ? comparisons.reduce((a, b) => ((b.gapAtWindow ?? -Infinity) > (a.gapAtWindow ?? -Infinity) ? b : a))
    : null;

  return (
    <PrintPage pageNumber={pageNumber} pageCount={pageCount}>
      <PageHeader logo={THINKQUIP_LOGO_TURQUOISE} logoAlt="ThinkQuip" title="Cost Over Operating Hours" />
      <p className="print-intro">
        Cumulative total cost of ownership (TCO) for {inputs.fleetSize} machine{inputs.fleetSize > 1 ? 's' : ''} — purchase price
        plus escalated energy and service — from day one to {formatHours(maxHours)}.
      </p>

      <div className="print-chart">
        <div className="print-chart__legend">
          {machines.map((m) => (
            <span key={m.machine.uid} className="print-chart__legend-item">
              <span className="print-chart__legend-swatch" style={{ background: printSeriesInk(m.machine) }} />
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
            <th>≈ Years</th>
            {machines.map((m) => (
              <th key={m.machine.uid} className="num">
                {variantName(m.machine)} cumulative
              </th>
            ))}
            {best && <th className="num">{variantName(heroMachine)} saving</th>}
          </tr>
        </thead>
        <tbody>
          {sampleHours.map((h) => (
            <tr key={h} className={h === windowHours ? 'print-table__window' : undefined}>
              <td>{formatHours(h)}{h === windowHours ? ' — your window' : ''}</td>
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

      <p className="print-note">
        Projection escalates diesel fuel {pct(ESCALATION.dieselFuel)}/yr, electricity {pct(ESCALATION.electricity)}/yr and
        routine service {pct(ESCALATION.maintenance)}/yr, applied per quarter-year slice. The electric machine carries no
        mechanical-service line across the whole window.
      </p>
    </PrintPage>
  );
}
