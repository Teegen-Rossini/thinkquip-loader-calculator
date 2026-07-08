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
    </div>
  );
}

export default function CostChart({ selection }) {
  const { machines: results, hero, comparisons, battery, hasComparison, hoursPerYear } = selection;
  const [hoverHours, setHoverHours] = useState(null);
  const maxHours = CALC_DEFAULTS.chartMaxHours;

  const machines = useMemo(() => results.map((r) => r.machine), [results]);
  const machinesByUid = useMemo(() => new Map(machines.map((m) => [m.uid, m])), [machines]);
  const chartData = useMemo(() => buildChartData(results), [results]);

  // Break-even markers: one per opponent (hero-vs-opponent), within the chart.
  const breakevens = useMemo(() => comparisons
    .filter((c) => c.breakevenHours != null && c.breakevenHours > 0 && c.breakevenHours <= maxHours)
    .map((c) => ({
      uid: c.machine.uid,
      name: c.machine.name,
      hours: c.breakevenHours,
      y: cumulativeCostAtHours(hero.series, c.breakevenHours),
    })), [comparisons, hero, maxHours]);

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
          margin={{ top: 24, right: 24, left: 8, bottom: 8 }}
          onMouseMove={handleMove}
          onClick={handleMove}
          onMouseLeave={handleLeave}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="hours" type="number" domain={[0, maxHours]}
            ticks={[0, 2500, 5000, 7500, 10000, 12500, 15000, 17500, 20000]}
            tickFormatter={formatHoursCompact} stroke="var(--text-muted)"
            label={{ value: 'Operating hours', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)' }} />
          <YAxis tickFormatter={formatCurrencyCompact} stroke="var(--text-muted)" width={70} />
          <Tooltip content={<ChartTooltip machinesByUid={machinesByUid} winnerUid={winnerUid} hoursPerYear={hoursPerYear} />} />

          {breakevens.map((b) => (
            <ReferenceLine
              key={`be-${b.uid}`}
              x={b.hours}
              stroke={hero.machine.chartColor}
              strokeDasharray="4 4"
              label={(props) => (
                <text x={props.viewBox.x} y={14} textAnchor="middle" fill={hero.machine.chartColor} fontSize={11}>
                  {breakevens.length > 1
                    ? `vs ${b.name} ${formatHoursCompact(b.hours)}`
                    : `Savings start ${formatHoursCompact(b.hours)}`}
                </text>
              )}
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

      {battery && (
        <p className="cost-chart__note">
          Battery replacement lands at {formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)}) — beyond this
          20,000 h chart and the first owner’s lifecycle, so it is not plotted here. Escalated cost when it lands:{' '}
          <strong className="mono">{formatCurrency(battery.escalatedCost)}</strong>.
        </p>
      )}

      <p className="cost-chart__footnote">
        Costs include researched annual escalation. See the Calculations and Spec Sheet tabs for full workings.
      </p>
    </div>
  );
}
