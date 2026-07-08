import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, formatHours, formatHoursCompact, formatYearsFromHours } from '../lib/format';
import { ESCALATION, CALC_DEFAULTS } from '../data/machinesConfig';
import { cumulativeCostAtHours } from '../lib/calculationEngine';
import './CostChart.css';

function buildChartData(electric, diesel) {
  const xs = [...new Set([...electric.series.map((p) => p.hours), ...diesel.series.map((p) => p.hours)])].sort((a, b) => a - b);
  return xs.map((hours) => ({
    hours,
    sw956e: cumulativeCostAtHours(electric.series, hours),
    syl956h5: cumulativeCostAtHours(diesel.series, hours),
  }));
}

function formatRate(rate) {
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function LegendRow({ machines, winnerId }) {
  return (
    <div className="cost-chart__legend">
      {machines.map((m) => (
        <div key={m.id} className={`cost-chart__legend-item${winnerId === m.id ? ' is-winner' : ''}`}>
          <span className="cost-chart__legend-swatch" style={{ background: m.chartColor }} />
          <img src={m.logo} alt="" className="cost-chart__legend-logo" />
          <span className="cost-chart__legend-name">{m.displayName}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, machines, winnerId, hoursPerYear }) {
  if (!active || !payload?.length) return null;
  const hours = Number(label);
  const byId = new Map(machines.map((m) => [m.id, m]));
  const rows = payload.filter((p) => p.value != null).sort((a, b) => a.value - b.value);

  return (
    <div className="cost-chart__tooltip">
      <div className="cost-chart__tooltip-year mono">{formatHours(hours)} · ~{formatYearsFromHours(hours, hoursPerYear)}</div>
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

export default function CostChart({ comparison }) {
  const { electric, diesel, electricMachine, dieselMachine, breakevenHours, battery, hoursPerYear } = comparison;
  const [hoverHours, setHoverHours] = useState(null);
  const maxHours = CALC_DEFAULTS.chartMaxHours;
  const machines = useMemo(() => [electricMachine, dieselMachine], [electricMachine, dieselMachine]);

  const chartData = useMemo(() => buildChartData(electric, diesel), [electric, diesel]);
  const hasBreakeven = breakevenHours != null && breakevenHours <= maxHours;

  const winnerId = useMemo(() => {
    if (hoverHours == null) return null;
    const e = cumulativeCostAtHours(electric.series, hoverHours);
    const d = cumulativeCostAtHours(diesel.series, hoverHours);
    if (e == null || d == null) return null;
    return e <= d ? electricMachine.id : dieselMachine.id;
  }, [hoverHours, electric, diesel, electricMachine, dieselMachine]);

  const winnerCost = winnerId
    ? cumulativeCostAtHours(winnerId === electricMachine.id ? electric.series : diesel.series, hoverHours)
    : null;

  const handleMove = (state) => {
    if (state?.activeLabel != null) setHoverHours(Number(state.activeLabel));
  };
  const handleLeave = () => setHoverHours(null);

  const breakevenY = hasBreakeven ? cumulativeCostAtHours(electric.series, breakevenHours) : null;

  return (
    <div className="cost-chart">
      <div className="cost-chart__toolbar">
        <LegendRow machines={machines} winnerId={winnerId} />
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
          <Tooltip content={<ChartTooltip machines={machines} winnerId={winnerId} hoursPerYear={hoursPerYear} />} />

          {hasBreakeven && (
            <ReferenceLine
              x={breakevenHours}
              stroke={electricMachine.chartColor}
              strokeDasharray="4 4"
              label={(props) => (
                <text x={props.viewBox.x} y={14} textAnchor="middle" fill={electricMachine.chartColor} fontSize={11}>
                  {`Savings start ${formatHoursCompact(breakevenHours)}`}
                </text>
              )}
            />
          )}
          {hasBreakeven && breakevenY != null && (
            <ReferenceDot x={breakevenHours} y={breakevenY} r={5} fill={electricMachine.chartColor} stroke="#fff" />
          )}

          {hoverHours != null && (
            <ReferenceLine x={hoverHours} stroke="var(--text-muted)" strokeDasharray="2 3" />
          )}

          {machines.map((m) => {
            const isWinner = winnerId === m.id;
            const dimmed = winnerId != null && !isWinner;
            return (
              <Line
                key={m.id}
                type="linear"
                dataKey={m.id}
                name={m.displayName}
                stroke={m.chartColor}
                strokeWidth={isWinner ? 4 : 3}
                strokeOpacity={dimmed ? 0.35 : 1}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}

          {winnerId && winnerCost != null && (
            <ReferenceDot
              x={hoverHours}
              y={winnerCost}
              r={7}
              fill={winnerId === electricMachine.id ? electricMachine.chartColor : dieselMachine.chartColor}
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {winnerId && winnerCost != null && (
        <p className="cost-chart__winner">
          Cheaper at {formatHours(hoverHours)}: <strong>{(winnerId === electricMachine.id ? electricMachine : dieselMachine).displayName}</strong> ({formatCurrency(winnerCost)})
        </p>
      )}

      <p className="cost-chart__note">
        Battery replacement lands at {formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)}) — beyond this
        20,000 h chart and the first owner’s lifecycle, so it is not plotted here. Escalated cost when it lands:{' '}
        <strong className="mono">{formatCurrency(battery.escalatedCost)}</strong>.
      </p>

      <p className="cost-chart__footnote">
        Projection applies annual escalation for diesel fuel ({formatRate(ESCALATION.dieselFuel)}), electricity ({formatRate(ESCALATION.electricity)}),
        routine service ({formatRate(ESCALATION.maintenance)}) and battery replacement ({formatRate(ESCALATION.batteryReplacement)}).
        The electric machine carries no mechanical-service line. See the Calculation and Spec Sheet tabs for full workings.
      </p>
    </div>
  );
}
