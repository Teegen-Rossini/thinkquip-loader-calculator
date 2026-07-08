import { CALC_DEFAULTS } from '../data/machinesConfig';
import { cumulativeCostAtHours } from '../lib/calculationEngine';
import { formatCurrencyCompact, formatHoursCompact } from '../lib/format';

const W = 740;
const H = 380;
const M = { top: 26, right: 118, bottom: 40, left: 66 };
const INK_MUTED = '#6B6D63';
const GRID = '#DBDCD5';

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
 * identically in the hidden print DOM and in the final PDF. Series identity is
 * carried by the fixed brand line colors plus direct end labels in the darker
 * text-safe brand variants (and by the sampled-points table on the same page).
 */
export default function PrintChart({ comparison }) {
  const { electric, diesel, electricMachine, dieselMachine, breakevenHours } = comparison;
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const maxCost = Math.max(electric.tcoAtMax, diesel.tcoAtMax);
  const yTicks = niceTicks(maxCost);
  const yMax = yTicks[yTicks.length - 1];
  const xTicks = [0, 5000, 10000, 15000, 20000];

  const x = (hours) => M.left + (hours / maxHours) * (W - M.left - M.right);
  const y = (cost) => H - M.bottom - (cost / yMax) * (H - M.top - M.bottom);
  const path = (series) => series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.hours).toFixed(1)},${y(p.cumulativeCost).toFixed(1)}`).join(' ');

  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;
  const breakevenY = hasBreakeven ? cumulativeCostAtHours(electric.series, breakevenHours) : null;

  const endLabel = (series, machine, dy) => {
    const last = series[series.length - 1];
    return (
      <text
        x={x(last.hours) + 8}
        y={y(last.cumulativeCost) + dy}
        fontSize="13"
        fontWeight="700"
        fill={machine.type === 'electric' ? '#3C86AD' : '#B87A17'}
      >
        {machine.name}
      </text>
    );
  };

  // Keep the two end labels from colliding when the lines finish close together.
  const endGap = y(diesel.tcoAtMax) - y(electric.tcoAtMax);
  const elecDy = Math.abs(endGap) < 16 ? (endGap >= 0 ? -6 : 14) : 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cumulative cost over operating hours: ${electricMachine.displayName} vs ${dieselMachine.displayName}`}>
      {/* grid + y axis */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
          <text x={M.left - 8} y={y(v) + 4} fontSize="11.5" fill={INK_MUTED} textAnchor="end">
            {v === 0 ? '0' : formatCurrencyCompact(v)}
          </text>
        </g>
      ))}

      {/* x axis */}
      <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke={INK_MUTED} strokeWidth="1" />
      {xTicks.map((v) => (
        <text key={v} x={x(v)} y={H - M.bottom + 18} fontSize="11.5" fill={INK_MUTED} textAnchor="middle">
          {v === 0 ? '0' : formatHoursCompact(v)}
        </text>
      ))}
      <text x={(M.left + W - M.right) / 2} y={H - 4} fontSize="11.5" fill={INK_MUTED} textAnchor="middle">
        Operating hours
      </text>

      {/* breakeven marker */}
      {hasBreakeven && (
        <g>
          <line x1={x(breakevenHours)} x2={x(breakevenHours)} y1={M.top} y2={H - M.bottom} stroke="#3C86AD" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={x(breakevenHours)} y={M.top - 8} fontSize="12" fontWeight="700" fill="#3C86AD" textAnchor="middle">
            Savings start {formatHoursCompact(breakevenHours)}
          </text>
        </g>
      )}

      {/* series */}
      <path d={path(diesel.series)} fill="none" stroke={dieselMachine.chartColor} strokeWidth="3" strokeLinejoin="round" />
      <path d={path(electric.series)} fill="none" stroke={electricMachine.chartColor} strokeWidth="3" strokeLinejoin="round" />

      {hasBreakeven && breakevenY != null && (
        <circle cx={x(breakevenHours)} cy={y(breakevenY)} r="6" fill="#3C86AD" stroke="#fff" strokeWidth="2" />
      )}

      {endLabel(electric.series, electricMachine, elecDy)}
      {endLabel(diesel.series, dieselMachine, Math.abs(endGap) < 16 ? (endGap >= 0 ? 14 : -6) : 4)}
    </svg>
  );
}
