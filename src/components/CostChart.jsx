import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, formatHours, formatHoursCompact, formatYearsFromHours } from '../lib/format';
import { CALC_DEFAULTS } from '../data/machinesConfig';
import { cumulativeCostAtHours } from '../lib/calculationEngine';
import './CostChart.css';

/** Model name without the leading brand word — the SANY logo mark shown
 *  beside it already carries the brand, so the word would double up. */
function modelOnly(displayName) {
  return (displayName || '').replace(/^SANY\s+/i, '');
}

function buildChartData(machines) {
  const xs = [...new Set(machines.flatMap((m) => m.series.map((p) => p.hours)))].sort((a, b) => a - b);
  return xs.map((hours) => {
    const row = { hours };
    machines.forEach((m) => { row[m.machine.uid] = cumulativeCostAtHours(m.series, hours); });
    return row;
  });
}

function LegendRow({ machines, winnerUid }) {
  return (
    <div className="cost-chart__legend">
      {machines.map((m) => (
        <div key={m.uid} className={`cost-chart__legend-item${winnerUid === m.uid ? ' is-winner' : ''}`}>
          <span className="cost-chart__legend-swatch" style={{ background: m.chartColor }} />
          <img src={m.logo} alt="SANY" className="cost-chart__legend-logo" />
          <span className="cost-chart__legend-name">{modelOnly(m.displayName)}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, machinesByUid, winnerUid, hoursPerYear }) {
  if (!active || !payload?.length) return null;
  const hours = Number(label);
  const rows = payload.filter((p) => p.value != null).sort((a, b) => a.value - b.value);
  // Price gap at the hovered hour: cheapest machine vs each other machine.
  const cheapest = rows[0];
  const differences = rows.slice(1).map((p) => ({
    machine: machinesByUid.get(p.dataKey),
    gap: p.value - cheapest.value,
  }));

  return (
    <div className="cost-chart__tooltip">
      <div className="cost-chart__tooltip-year mono">{formatHours(hours)} · ~{formatYearsFromHours(hours, hoursPerYear)}</div>
      {rows.map((p) => {
        const machine = machinesByUid.get(p.dataKey);
        if (!machine) return null;
        const isWinner = machine.uid === winnerUid;
        return (
          <div key={p.dataKey} className={`cost-chart__tooltip-row${isWinner ? ' is-winner' : ''}`}>
            <img src={machine.logo} alt="SANY" className="cost-chart__tooltip-logo" />
            <span className="cost-chart__tooltip-name">{modelOnly(machine.displayName)}</span>
            <span className="cost-chart__tooltip-value mono">{formatCurrency(p.value)}</span>
          </div>
        );
      })}
      {differences.map(({ machine, gap }) => machine && (
        <div key={`diff-${machine.uid}`} className="cost-chart__tooltip-row cost-chart__tooltip-row--diff">
          <span className="cost-chart__tooltip-name">
            Difference{differences.length > 1 ? ` vs ${modelOnly(machine.displayName)}` : ''}
          </span>
          <span className="cost-chart__tooltip-value mono">{formatCurrency(gap)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CostChart({ selection }) {
  const { machines: results, hero, comparisons, hasComparison, hoursPerYear } = selection;
  const [hoverHours, setHoverHours] = useState(null);
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  const machines = useMemo(() => results.map((r) => r.machine), [results]);
  const machinesByUid = useMemo(() => new Map(machines.map((m) => [m.uid, m])), [machines]);
  const chartData = useMemo(() => buildChartData(results), [results]);

  // Crossover markers: one per opponent (cheapest-vs-opponent), within the
  // chart. Same crossover hour the Comparison page describes — one event.
  const breakevens = useMemo(() => comparisons
    .filter((c) => c.crossoverHours != null && c.crossoverHours > 0 && c.crossoverHours <= maxHours)
    .map((c) => ({
      uid: c.machine.uid,
      name: c.machine.name,
      hours: c.crossoverHours,
      direction: c.crossoverDirection,
      y: cumulativeCostAtHours(hero.series, c.crossoverHours),
    })), [comparisons, hero, maxHours]);

  // Crossover-label layout: when two markers sit close enough for their text
  // to collide, drop the later label onto a second row; labels near the chart
  // edges anchor inward so they never clip or sit over the axis text.
  const labelMeta = useMemo(() => {
    const sorted = [...breakevens].sort((a, b) => a.hours - b.hours);
    const meta = new Map();
    let prevHours = -Infinity;
    let prevRow = 0;
    for (const b of sorted) {
      const tooClose = b.hours - prevHours < maxHours * 0.18; // ≈ label width in hours
      const row = tooClose && prevRow === 0 ? 1 : 0;
      meta.set(b.uid, {
        row,
        anchor: b.hours < maxHours * 0.09 ? 'start' : b.hours > maxHours * 0.91 ? 'end' : 'middle',
      });
      prevHours = b.hours;
      prevRow = row;
    }
    return meta;
  }, [breakevens, maxHours]);
  const hasSecondLabelRow = breakevens.some((b) => labelMeta.get(b.uid)?.row === 1);

  const winnerUid = useMemo(() => {
    if (!hasComparison || hoverHours == null) return null;
    let best = null;
    let bestCost = Infinity;
    for (const r of results) {
      const c = cumulativeCostAtHours(r.series, hoverHours);
      if (c != null && c < bestCost) { bestCost = c; best = r.machine.uid; }
    }
    return best;
  }, [hasComparison, hoverHours, results]);

  const winnerCost = winnerUid
    ? cumulativeCostAtHours(results.find((r) => r.machine.uid === winnerUid).series, hoverHours)
    : null;
  const winnerMachine = winnerUid ? machinesByUid.get(winnerUid) : null;

  const handleMove = (state) => {
    if (state?.activeLabel != null) setHoverHours(Number(state.activeLabel));
  };
  const handleLeave = () => setHoverHours(null);

  return (
    <div className="cost-chart">
      <div className="cost-chart__toolbar">
        <LegendRow machines={machines} winnerUid={winnerUid} />
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <LineChart
          data={chartData}
          margin={{ top: hasSecondLabelRow ? 40 : 24, right: 24, left: 8, bottom: 8 }}
          onMouseMove={handleMove}
          onClick={handleMove}
          onMouseLeave={handleLeave}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="hours" type="number" domain={[0, maxHours]}
            ticks={[0, 2500, 5000, 7500, 10000, 12500, 15000]}
            tickFormatter={formatHoursCompact} stroke="var(--text-muted)"
            label={{ value: 'Operating hours', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)' }} />
          <YAxis tickFormatter={formatCurrencyCompact} stroke="var(--text-muted)" width={70} />
          <Tooltip content={<ChartTooltip machinesByUid={machinesByUid} winnerUid={winnerUid} hoursPerYear={hoursPerYear} />} />

          {breakevens.map((b) => (
            <ReferenceLine
              key={`be-${b.uid}`}
              x={b.hours}
              stroke={hero.machine.chartColor}
              strokeWidth={2.5}
              strokeDasharray="6 5"
              label={(props) => {
                const { row, anchor } = labelMeta.get(b.uid) ?? { row: 0, anchor: 'middle' };
                const dx = anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0;
                return (
                  <text x={props.viewBox.x + dx} y={14 + row * 16} textAnchor={anchor} fill={hero.machine.chartColor} fontSize={13} fontWeight={700}>
                    {breakevens.length > 1
                      ? `vs ${b.name} ${formatHoursCompact(b.hours)}`
                      : b.direction === 'loses'
                        ? `Cheaper until ${formatHoursCompact(b.hours)}`
                        : `Savings start ${formatHoursCompact(b.hours)}`}
                  </text>
                );
              }}
            />
          ))}
          {breakevens.map((b) => (
            b.y != null && <ReferenceDot key={`bed-${b.uid}`} x={b.hours} y={b.y} r={5} fill={hero.machine.chartColor} stroke="#fff" />
          ))}

          {hoverHours != null && (
            <ReferenceLine x={hoverHours} stroke="var(--text-muted)" strokeDasharray="2 3" />
          )}

          {results.map((r) => {
            const m = r.machine;
            const isWinner = winnerUid === m.uid;
            const dimmed = winnerUid != null && !isWinner;
            return (
              <Line
                key={m.uid}
                type="linear"
                dataKey={m.uid}
                name={m.displayName}
                stroke={m.chartColor}
                strokeWidth={isWinner ? 4 : 3}
                strokeOpacity={dimmed ? 0.35 : 1}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}

          {winnerUid && winnerCost != null && (
            <ReferenceDot x={hoverHours} y={winnerCost} r={7} fill={winnerMachine.chartColor} stroke="#fff" strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>

      {winnerUid && winnerCost != null && (
        <p className="cost-chart__winner">
          Cheaper at {formatHours(hoverHours)}: <strong>{winnerMachine.displayName}</strong> ({formatCurrency(winnerCost)})
        </p>
      )}

      <p className="cost-chart__footnote">
        Costs include researched annual escalation. See the Calculations and Spec Sheet tabs for full workings.
      </p>
    </div>
  );
}
