import { CALC_DEFAULTS } from '../data/machinesConfig';
import { cumulativeCostAtHours } from '../lib/calculationEngine';
import { formatCurrencyCompact, formatHoursCompact } from '../lib/format';
import { printSeriesInk } from '../lib/printInks';

const W = 740;
const H = 380;
const M = { top: 26, right: 118, bottom: 40, left: 66 };
const INK_MUTED = '#6B6D63';
const GRID = '#E3E4DD';

/** Short end-of-line label: model code, plus the variant's first word when the
 *  same model prints twice (dry + wet brake), so no two labels ever read alike. */
function endLabel(machine) {
  return machine.variant ? `${machine.name} (${machine.variant.split(' ')[0]})` : machine.name;
}

/** "Nice" y-axis tick step: 1/2/2.5/5 × 10^k covering max in 4–6 ticks. */
function niceTicks(maxValue) {
  const target = maxValue / 4.5;
  const mag = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => maxValue / s <= 6) ?? 10 * mag;
  const ticks = [];
  for (let v = 0; ; v += step) {
    ticks.push(v);
    if (v >= maxValue) break; // last tick must cover the max so no line escapes the plot
  }
  return ticks;
}

/**
 * Static, print-resolution SVG version of the cumulative-cost chart — pure
 * vector, no Recharts, no interactivity, no layout measurement, so it renders
 * identically in the hidden print DOM and in the final PDF. Plots every selected
 * machine's series; identity is carried by the print-safe brand line colors,
 * direct end labels, and the sampled-points table on the same page.
 */
export default function PrintChart({ selection }) {
  const { machines, hero, comparisons } = selection;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const maxCost = Math.max(...machines.map((m) => m.tcoAtMax));
  const yTicks = niceTicks(maxCost);
  const yMax = yTicks[yTicks.length - 1];
  // Six equal x divisions of the live chart horizon, whatever it is set to.
  const xTicks = Array.from({ length: 7 }, (_, i) => (maxHours * i) / 6);

  const x = (hours) => M.left + (hours / maxHours) * (W - M.left - M.right);
  const y = (cost) => H - M.bottom - (cost / yMax) * (H - M.top - M.bottom);
  const path = (series) => series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hours).toFixed(1)},${y(p.cumulativeCost).toFixed(1)}`).join(' ');

  // Crossover markers: cheapest-at-window vs each opponent, within the chart —
  // the SAME crossover hour shown on the Comparison page.
  const markerInk = printSeriesInk(hero.machine);
  const breakevens = comparisons
    .filter((c) => c.crossoverHours != null && c.crossoverHours > 0 && c.crossoverHours <= maxHours)
    .map((c) => ({
      hours: c.crossoverHours,
      direction: c.crossoverDirection,
      yPos: cumulativeCostAtHours(hero.series, c.crossoverHours),
    }));

  // End labels: stack them so they never overlap when lines finish close together.
  const ends = machines
    .map((m) => ({
      label: endLabel(m.machine),
      ink: printSeriesInk(m.machine),
      yEnd: y(m.tcoAtMax),
      yPos: y(m.tcoAtMax),
      xEnd: x(m.series[m.series.length - 1].hours),
    }))
    .sort((a, b) => a.yPos - b.yPos);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].yPos - ends[i - 1].yPos < 14) ends[i].yPos = ends[i - 1].yPos + 14;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative cost over operating hours for the selected machines">
      {/* grid + y axis */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? INK_MUTED : GRID} strokeWidth="1" />
          <text x={M.left - 8} y={y(v) + 4} fontSize="11.5" fill={INK_MUTED} textAnchor="end">
            {v === 0 ? '0' : formatCurrencyCompact(v)}
          </text>
        </g>
      ))}

      {/* x axis with small tick marks */}
      <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke={INK_MUTED} strokeWidth="1" />
      {xTicks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={H - M.bottom} y2={H - M.bottom + 4} stroke={INK_MUTED} strokeWidth="1" />
          <text x={x(v)} y={H - M.bottom + 18} fontSize="11.5" fill={INK_MUTED} textAnchor="middle">
            {v === 0 ? '0' : formatHoursCompact(v)}
          </text>
        </g>
      ))}
      <text x={(M.left + W - M.right) / 2} y={H - 4} fontSize="11.5" fill={INK_MUTED} textAnchor="middle">
        Operating hours
      </text>
      <text
        transform={`translate(14 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}
        fontSize="11.5" fill={INK_MUTED} textAnchor="middle"
      >
        Cumulative TCO
      </text>

      {/* crossover markers — label anchors inward near the edges so the text
          never clips or collides with the axis labels */}
      {breakevens.map((b, i) => {
        const anchor = b.hours < maxHours * 0.12 ? 'start' : b.hours > maxHours * 0.88 ? 'end' : 'middle';
        const dx = anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0;
        return (
          <g key={`be-${i}`}>
            <line x1={x(b.hours)} x2={x(b.hours)} y1={M.top} y2={H - M.bottom} stroke={markerInk} strokeWidth="2.5" strokeDasharray="6 5" />
            {i === 0 && (
              <text x={x(b.hours) + dx} y={M.top - 8} fontSize="13" fontWeight="700" fill={markerInk} textAnchor={anchor}>
                {b.direction === 'loses'
                  ? `Cheaper until ${formatHoursCompact(b.hours)}`
                  : `Cheaper from ${formatHoursCompact(b.hours)}`}
              </text>
            )}
            <circle cx={x(b.hours)} cy={y(b.yPos)} r="6" fill={markerInk} stroke="#fff" strokeWidth="2" />
          </g>
        );
      })}

      {/* series */}
      {machines.map((m) => (
        <path key={m.machine.uid} d={path(m.series)} fill="none" stroke={printSeriesInk(m.machine)} strokeWidth="3" strokeLinejoin="round" />
      ))}

      {/* end dots + labels */}
      {ends.map((e, i) => (
        <g key={`lbl-${i}`}>
          <circle cx={e.xEnd} cy={e.yEnd} r="4" fill={e.ink} stroke="#fff" strokeWidth="1.5" />
          <text x={e.xEnd + 9} y={e.yPos + 4} fontSize="12" fontWeight="700" fill={e.ink}>
            {e.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
