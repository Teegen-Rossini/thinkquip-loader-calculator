import { formatCurrency, formatHours, formatYearsFromHours } from '../lib/format';
import './LifecycleEventsTable.css';

export default function LifecycleEventsTable({ comparison, onViewAssumptions }) {
  const { battery, hoursPerYear } = comparison;

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
            <tr>
              <td>SW956E (Electric)</td>
              <td className="mono">Battery replacement · {formatCurrency(battery.baseCost)} base</td>
              <td className="mono">{formatHours(battery.atHours)} (~{formatYearsFromHours(battery.atHours, hoursPerYear)})</td>
            </tr>
            <tr>
              <td>SYL956H5 (Diesel)</td>
              <td className="mono">Routine service · R29/h (continuous)</td>
              <td className="mono">Ongoing</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="lifecycle-table__note">
        <p>
          The diesel machine’s routine service runs continuously; the electric machine carries <strong>no mechanical-maintenance
          line</strong> until its battery reaches replacement at {formatHours(battery.atHours)} — beyond the first owner’s
          lifecycle. That is the point to highlight.
        </p>
        <button type="button" className="lifecycle-table__link" onClick={onViewAssumptions}>View assumptions in Spec Sheet &rarr;</button>
      </div>
    </div>
  );
}
