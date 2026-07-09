import MachineName from './MachineName';
import './LifecycleEventsTable.css';

export default function LifecycleEventsTable({ selection, onViewAssumptions }) {
  const { machines, electricSelected } = selection;

  return (
    <div className="lifecycle-table panel-surface">
      <h3 className="section-heading section-heading--flush">Maintenance &amp; lifecycle</h3>
      <div className="lifecycle-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Mechanical maintenance</th>
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
                    <td className="mono">No mechanical service line · R0/h</td>
                    <td className="mono">—</td>
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
            line</strong>. That is the point to highlight.
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
