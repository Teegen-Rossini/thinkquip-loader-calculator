import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import MachineName from './MachineName';
import './LifecycleEventsTable.css';

export default function LifecycleEventsTable({ selection, onViewAssumptions }) {
  const { machines, battery, hoursPerYear, electricSelected } = selection;

  return (
    <div className="lifecycle-table panel-surface">
      <h3 className="section-heading section-heading--flush">Maintenance &amp; lifecycle</h3>
      <div className="lifecycle-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Engine / battery maintenance</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((r) => {
              const m = r.machine;
              if (m.type === 'electric') {
                return (
                  <tr key={m.uid}>
                    <td><MachineName machine={m} /></td>
                    <td className="mono">Battery replacement · {formatCurrency(battery.baseCost)} base</td>
                    <td className="mono">{formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)})</td>
                  </tr>
                );
              }
              return (
                <tr key={m.uid}>
                  <td><MachineName machine={m} /></td>
                  <td className="mono">Routine service · R29/h (continuous)</td>
                  <td className="mono">Ongoing</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="lifecycle-table__note">
        {electricSelected ? (
          <p>
            The diesel machine’s routine service runs continuously; the electric machine carries <strong>no mechanical-maintenance
            line</strong> until its battery reaches replacement at {formatHours(battery.atHours)} — beyond the first owner’s
            lifecycle. That is the point to highlight.
          </p>
        ) : (
          <p>
            The diesel machine’s routine service runs continuously at R29/h. Add the electric SW956E to the comparison to see its
            long-term maintenance advantage.
          </p>
        )}
        <button type="button" className="lifecycle-table__link" onClick={onViewAssumptions}>View assumptions in Spec Sheet &rarr;</button>
      </div>
    </div>
  );
}
