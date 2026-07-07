import { chargersNeeded } from '../lib/calculationEngine';
import './FleetSizeToggle.css';

const SIZES = [1, 2, 3, 4];

export default function FleetSizeToggle({ fleetSize, onChange }) {
  const needed = chargersNeeded(fleetSize);

  return (
    <div className="fleet-toggle no-print">
      <span className="fleet-toggle__label">Fleet size</span>
      <div className="fleet-toggle__group" role="group" aria-label="Number of machines">
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            className={n === fleetSize ? 'fleet-toggle__btn is-active' : 'fleet-toggle__btn'}
            onClick={() => onChange(n)}
            aria-pressed={n === fleetSize}
          >
            {n}
          </button>
        ))}
      </div>
      <span className="fleet-toggle__note">
        {fleetSize} machine{fleetSize > 1 ? 's' : ''} · {needed} charger{needed > 1 ? 's' : ''} needed (2 ports/machine, 2 guns/charger)
      </span>
    </div>
  );
}
