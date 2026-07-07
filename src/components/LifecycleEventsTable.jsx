import './LifecycleEventsTable.css';

export default function LifecycleEventsTable({ table, onViewAssumptions }) {
  if (!table || table.rows.length === 0) {
    return (
      <div className="lifecycle-table panel-surface">
        <h3 className="section-heading section-heading--flush">Lifecycle events</h3>
        <p className="lifecycle-table__empty">No lifecycle events land within the planning horizon at these inputs.</p>
      </div>
    );
  }

  const { machines, rows } = table;

  return (
    <div className="lifecycle-table panel-surface">
      <h3 className="section-heading section-heading--flush">Lifecycle events ({machines.length} machine{machines.length > 1 ? 's' : ''})</h3>
      <div className="lifecycle-table__scroll">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              {machines.map((m) => (
                <th key={m.id}>{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.label}-${i}`}>
                <td>{row.label}</td>
                {machines.map((m) => (
                  <td key={m.id} className="mono">
                    {row.byMachine[m.id] != null ? `Yr ${row.byMachine[m.id].toFixed(1)}` : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lifecycle-table__note">
        <p>Costs escalate each year based on researched trends, not flat projections.</p>
        <button type="button" className="lifecycle-table__link" onClick={onViewAssumptions}>View assumptions in Spec Sheet &rarr;</button>
      </div>
    </div>
  );
}
