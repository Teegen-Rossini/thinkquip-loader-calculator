import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact } from '../lib/format';
import { ESCALATION } from '../data/machinesConfig';
import { cumulativeCostAtYear, cheapestAtYear } from '../lib/calculationEngine';
import './CostChart.css';

function buildChartData(allResults) {
  const xs = new Set();
  allResults.forEach((r) => r.series.forEach((p) => xs.add(p.year)));
  const sortedX = [...xs].sort((a, b) => a - b);
  return sortedX.map((year) => {
    const row = { year };
    allResults.forEach((r) => {
      row[r.machine.id] = cumulativeCostAtYear(r.series, year);
    });
    return row;
  });
}

function findNearbyEvent(allResults, year, horizonYears) {
  const eps = Math.max(0.12, horizonYears * 0.012);
  let best = null;
  allResults.forEach((r) => {
    r.events.forEach((e) => {
      const dist = Math.abs(e.year - year);
      if (dist < eps && (!best || dist < best.dist)) {
        best = { dist, machine: r.machine, event: e, eventLabel: r.eventLabel };
      }
    });
  });
  return best;
}

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function LegendRow({ allResults, winnerId }) {
  return (
    <div className="cost-chart__legend">
      {allResults.map((r) => (
        <div key={r.machine.id} className={`cost-chart__legend-item${winnerId === r.machine.id ? ' is-winner' : ''}`}>
          <span
            className="cost-chart__legend-swatch"
            style={{
              background: r.machine.chartDash ? 'transparent' : r.machine.chartColor,
              borderBottom: r.machine.chartDash ? `3px ${r.machine.chartDash === '1 4' ? 'dotted' : 'dashed'} ${r.machine.chartColor}` : 'none',
            }}
          />
          <img src={r.machine.logo} alt="" className="cost-chart__legend-logo" />
          <span className="cost-chart__legend-name">{r.machine.displayName}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, allResults, winnerId, horizonYears }) {
  if (!active || !payload?.length) return null;
  const year = Number(label);

  const nearbyEvent = findNearbyEvent(allResults, year, horizonYears);
  if (nearbyEvent) {
    const { machine, event, eventLabel } = nearbyEvent;
    return (
      <div className="cost-chart__tooltip cost-chart__tooltip--event">
        <div className="cost-chart__tooltip-event-title">{eventLabel.toUpperCase()}</div>
        <div className="cost-chart__tooltip-event-machine">{machine.displayName}</div>
        <div className="cost-chart__tooltip-event-year mono">Year {event.year.toFixed(1)}</div>
        <div className="cost-chart__tooltip-event-row">
          <span>Base cost:</span>
          <span className="mono">{formatCurrency(event.baseCost)}</span>
        </div>
        <div className="cost-chart__tooltip-event-row">
          <span>Escalated cost:</span>
          <span className="mono">{formatCurrency(event.escalatedCost)}</span>
        </div>
        <div className="cost-chart__tooltip-event-trend">({formatRate(event.rate)} annual escalation)</div>
      </div>
    );
  }

  const byId = new Map(allResults.map((r) => [r.machine.id, r.machine]));
  const rows = payload
    .filter((p) => p.value != null)
    .sort((a, b) => a.value - b.value);

  return (
    <div className="cost-chart__tooltip">
      <div className="cost-chart__tooltip-year mono">Year {year.toFixed(1)}</div>
      {rows.map((p) => {
        const machine = byId.get(p.dataKey);
        if (!machine) return null;
        const isWinner = machine.id === winnerId;
        return (
          <div key={p.dataKey} className={`cost-chart__tooltip-row${isWinner ? ' is-winner' : ''}`}>
            <img src={machine.logo} alt="" className="cost-chart__tooltip-logo" />
            <span className="cost-chart__tooltip-name">{machine.displayName}</span>
            <span className="cost-chart__tooltip-value mono">{formatCurrency(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CostChart({ electricResult, electricMachine, comparators, horizonYears, showLifecycleEvents, onToggleLifecycleEvents }) {
  const [hoverYear, setHoverYear] = useState(null);

  const allResults = useMemo(
    () => [{ machine: electricMachine, ...electricResult }, ...comparators],
    [electricMachine, electricResult, comparators]
  );

  const chartData = useMemo(() => buildChartData(allResults), [allResults]);
  const withBreakeven = comparators.filter((c) => c.breakeven != null);
  const withoutBreakeven = comparators.filter((c) => c.breakeven == null);

  const winner = hoverYear != null ? cheapestAtYear(allResults, hoverYear) : null;
  const winnerId = winner?.machine.id ?? null;

  const handleMove = (state) => {
    if (state?.activeLabel != null) setHoverYear(Number(state.activeLabel));
  };
  const handleLeave = () => setHoverYear(null);

  return (
    <div className="cost-chart">
      <div className="cost-chart__toolbar">
        <LegendRow allResults={allResults} winnerId={winnerId} />
        <label className="cost-chart__lifecycle-toggle">
          <span>Show lifecycle events</span>
          <span className={`switch${showLifecycleEvents ? ' is-on' : ''}`} onClick={() => onToggleLifecycleEvents(!showLifecycleEvents)}>
            <span className="switch__knob" />
          </span>
        </label>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <LineChart
          data={chartData}
          margin={{ top: 10 + withBreakeven.length * 15, right: 24, left: 8, bottom: 8 }}
          onMouseMove={handleMove}
          onClick={handleMove}
          onMouseLeave={handleLeave}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="year" type="number" domain={[0, horizonYears]} allowDecimals={false}
            tickFormatter={(y) => `Yr ${y}`} stroke="var(--text-muted)"
            label={{ value: 'Years of operation', position: 'insideBottom', offset: -4, fill: 'var(--text-muted)' }} />
          <YAxis tickFormatter={formatCurrencyCompact} stroke="var(--text-muted)" width={70} />
          <Tooltip content={<ChartTooltip allResults={allResults} winnerId={winnerId} horizonYears={horizonYears} />} />

          {withBreakeven.map((c, i) => (
            <ReferenceLine
              key={`ref-${c.machine.id}`}
              x={c.breakeven}
              stroke={c.machine.chartColor}
              strokeDasharray="4 4"
              label={(props) => (
                <text
                  x={props.viewBox.x}
                  y={12 + i * 15}
                  textAnchor="middle"
                  fill={c.machine.chartColor}
                  fontSize={11}
                >
                  {`Yr ${c.breakeven.toFixed(1)} vs ${c.machine.name}`}
                </text>
              )}
            />
          ))}
          {withBreakeven.map((c) => {
            const y = cumulativeCostAtYear(electricResult.series, c.breakeven);
            if (y == null) return null;
            return (
              <ReferenceDot
                key={`dot-${c.machine.id}`}
                x={c.breakeven}
                y={y}
                r={5}
                fill={c.machine.chartColor}
                stroke="#fff"
              />
            );
          })}

          {showLifecycleEvents && allResults.flatMap((r) =>
            r.events.map((e, idx) => (
              <ReferenceLine
                key={`event-${r.machine.id}-${idx}`}
                x={e.year}
                stroke={r.machine.chartColor}
                strokeOpacity={0.45}
                strokeDasharray="2 3"
              />
            ))
          )}
          {showLifecycleEvents && allResults.flatMap((r) =>
            r.events.map((e, idx) => {
              const y = cumulativeCostAtYear(r.series, e.year);
              if (y == null) return null;
              return (
                <ReferenceDot
                  key={`event-dot-${r.machine.id}-${idx}`}
                  x={e.year}
                  y={y}
                  r={4}
                  fill={r.machine.chartColor}
                  stroke="#fff"
                />
              );
            })
          )}

          {hoverYear != null && (
            <ReferenceLine x={hoverYear} stroke="var(--text-muted)" strokeDasharray="2 3" />
          )}

          {allResults.map((r) => {
            const isWinner = winnerId === r.machine.id;
            const dimmed = winnerId != null && !isWinner;
            return (
              <Line
                key={r.machine.id}
                type="linear"
                dataKey={r.machine.id}
                name={r.machine.displayName}
                stroke={r.machine.chartColor}
                strokeWidth={isWinner ? 4 : (r.machine.id === electricMachine.id ? 3 : 2)}
                strokeOpacity={dimmed ? 0.3 : 1}
                strokeDasharray={r.machine.chartDash}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}

          {winner && (
            <ReferenceDot
              x={hoverYear}
              y={winner.cost}
              r={7}
              fill={winner.machine.chartColor}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {winner && (
        <p className="cost-chart__winner">
          Cheapest at year {hoverYear.toFixed(1)}: <strong>{winner.machine.displayName}</strong> ({formatCurrency(winner.cost)})
        </p>
      )}

      {withoutBreakeven.length > 0 && (
        <p className="cost-chart__note">
          Savings don&rsquo;t start within the {horizonYears}-year horizon shown for:{' '}
          {withoutBreakeven.map((c) => c.machine.name).join(', ')}.
        </p>
      )}

      <p className="cost-chart__footnote">
        Projection includes annual escalation assumptions for diesel ({formatRate(ESCALATION.dieselPrice)}), electricity ({formatRate(ESCALATION.electricityPrice)}),
        maintenance ({formatRate(ESCALATION.maintenance)}), diesel overhaul ({formatRate(ESCALATION.dieselOverhaul)}) and battery replacement ({formatRate(ESCALATION.batteryReplacement)}).
        See the Spec Sheet for full assumptions.
      </p>
    </div>
  );
}
