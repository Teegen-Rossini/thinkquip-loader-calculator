import { CALC_DEFAULTS } from '../data/machinesConfig';
import './FleetSizeToggle.css';

const SIZES = [1, 2, 3, 4];

export default function FleetSizeToggle({ fleetSize, onChange }) {
  return (
    <div className="fleet-toggle no-print">
      <span className="fleet-toggle__label">Fleet size</span>
      <div className="fleet-toggle__group" role="group" aria-label="Number of machines">
        {SIZES.filter((n) => n <= CALC_DEFAULTS.fleetSizeMax).map((n) => (
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
        {fleetSize} machine{fleetSize > 1 ? 's' : ''} · all costs scale ×{fleetSize}
      </span>
    </div>
  );
}
